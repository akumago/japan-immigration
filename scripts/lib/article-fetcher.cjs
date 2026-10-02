'use strict';
/**
 * 本文スキャン: 見出しに国籍語が無い記事について、元記事の本文から「国籍語を含む文（と前後）」を取り出す。
 * Gemini API は使わない。Google News の記事URL解決（非公式の batchexecute）と、元記事の取得だけを行う。
 *
 * 設計上の要点
 *  - 1URL 1回: 結果は永続キャッシュ（成功・「国籍語なし」・404 は確定。失敗は pending として再試行の間隔を空ける）
 *  - 失敗は「国籍なし」ではない: pending（保留）。回数上限までは間隔を空けて再試行し、上限後は gave_up として数える
 *  - Google への過負荷を避ける: 並列3・Google宛は1秒間隔・1回の実行の上限・連続失敗で打ち切り（サーキットブレーカー）
 *  - 文字化けしない: Buffer で受信してから文字コード（UTF-8 / Shift_JIS / EUC-JP）を判定してデコード
 *  - サイドバー・関連記事の国籍語を拾わない: 本文（JSON-LD articleBody / meta description / <article> の <p>）だけを見る
 *
 * 注意: Google News の記事URL解決は非公式で、Google が仕様を変えると動かなくなる。動かなくなっても、失敗は pending になるだけで、
 *       サイトは壊れない（本文が取れない記事は、従来どおり見出しだけで判定される）。BODY_SCAN=0 で無効化できる。
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const zlib = require('zlib');

const CACHE_DEFAULT = path.join(__dirname, '../../data/articleCache.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// ───────────────────────── HTTP（Buffer で受信・サイズ上限・全体タイムアウト） ─────────────────────────
function rawRequest(url, { method = 'GET', headers = {}, body = null, timeoutMs = 10000, maxBytes = 1500000, maxRedirects = 5 } = {}) {
  return new Promise((resolve, reject) => {
    let hops = 0;
    const go = (u) => {
      let parsed;
      try { parsed = new URL(u); } catch (_) { return reject(new Error('bad url')); }
      const lib = parsed.protocol === 'http:' ? http : https;
      let done = false;
      let deadline = null;
      const finish = (fn, v) => { if (done) return; done = true; clearTimeout(deadline); fn(v); };
      const req = lib.request(parsed, { method, headers: { 'User-Agent': UA, 'Accept-Encoding': 'identity', ...headers } }, (res) => {
        if (method === 'GET' && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          if (++hops > maxRedirects) return finish(reject, new Error('too many redirects'));
          done = true; clearTimeout(deadline);
          return go(new URL(res.headers.location, u).href);
        }
        const chunks = [];
        let size = 0;
        let truncated = false;
        const end = () => finish(resolve, { status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks), truncated });
        res.on('data', (c) => {
          size += c.length;
          if (size > maxBytes) { truncated = true; chunks.push(c.subarray(0, Math.max(0, c.length - (size - maxBytes)))); res.destroy(); return; }
          chunks.push(c);
        });
        res.on('end', end);
        res.on('close', end);
        res.on('error', (e) => (truncated ? end() : finish(reject, e)));
      });
      deadline = setTimeout(() => req.destroy(new Error('timeout')), timeoutMs);
      req.on('error', (e) => finish(reject, e));
      if (body) req.write(body);
      req.end();
    };
    go(url);
  });
}

function inflate(buf, enc) {
  const e = String(enc || '').toLowerCase();
  if (!e || e === 'identity') return buf;
  if (e.includes('gzip')) return zlib.gunzipSync(buf);
  if (e.includes('br')) return zlib.brotliDecompressSync(buf);
  if (e.includes('deflate')) return zlib.inflateSync(buf);
  return buf;
}

async function httpRequest(url, opts) {
  const r = await rawRequest(url, opts);
  try { r.body = inflate(r.body, r.headers['content-encoding']); } catch (_) { throw new Error('bad content-encoding'); }
  return r;
}

const defaultIo = {
  get: (url, o = {}) => httpRequest(url, o),
  post: (url, body, o = {}) => httpRequest(url, { ...o, method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'Content-Length': Buffer.byteLength(body), ...(o.headers || {}) } }),
};

// ───────────────────────── 文字コード ─────────────────────────
const CHARSET_ALIASES = { 'shift-jis': 'shift_jis', 'x-sjis': 'shift_jis', sjis: 'shift_jis', ms932: 'shift_jis', 'windows-31j': 'shift_jis', cp932: 'shift_jis', 'x-euc-jp': 'euc-jp', eucjp: 'euc-jp', utf8: 'utf-8' };
function decodeHtml(buf, contentType = '') {
  let cs = (String(contentType).match(/charset=["']?([\w-]+)/i) || [])[1];
  if (!cs) cs = (buf.subarray(0, 4096).toString('latin1').match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1];
  cs = String(cs || 'utf-8').toLowerCase();
  cs = CHARSET_ALIASES[cs] || cs;
  try { return new TextDecoder(cs).decode(buf); } catch (_) { return new TextDecoder('utf-8').decode(buf); }
}

// ───────────────────────── Google News の記事URLの解決 ─────────────────────────
// 以下の定数は Google が変更しうる。変わって失敗しても pending になるだけ。
const GN_ID_RE = /\/articles\/([A-Za-z0-9_-]+)/;
const GARTURLREQ_CTX = [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0];

/** 古い形式のID（base64 の protobuf に宛先URLが入っている）は、通信なしで解ける */
function decodeLegacyId(id) {
  try {
    let b = Buffer.from(id.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (b.length > 3 && b[0] === 0x08 && b[1] === 0x13 && b[2] === 0x22) b = b.subarray(3);
    if (b.length >= 3 && b[b.length - 3] === 0xd2 && b[b.length - 2] === 0x01 && b[b.length - 1] === 0x00) b = b.subarray(0, b.length - 3);
    if (!b.length) return null;
    let len = b[0];
    let start = 1;
    if (len >= 0x80) { len = (b[0] & 0x7f) | (b[1] << 7); start = 2; }
    const s = b.subarray(start, start + len).toString('utf8');
    return /^https?:\/\//.test(s) ? s : null;
  } catch (_) { return null; }
}

/** batchexecute の応答（")]}'" 付き・長さ行あり/なしの両方）から宛先URLを取り出す */
function parseBatchResponse(text) {
  const t = String(text).replace(/^\)\]\}'\s*/, '');
  for (const raw of t.split('\n')) {
    const line = raw.trim();
    if (line[0] !== '[') continue;
    let rows;
    try { rows = JSON.parse(line); } catch (_) { continue; }
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!Array.isArray(row) || row[1] !== 'Fbv4je' || typeof row[2] !== 'string') continue;
      try {
        const p = JSON.parse(row[2]);
        if (Array.isArray(p) && p[0] === 'garturlres' && typeof p[1] === 'string') return p[1];
      } catch (_) { /* 次の行へ */ }
    }
  }
  return null;
}

function createSpacer(ms, sleep = (t) => new Promise((r) => setTimeout(r, t))) {
  let next = 0;
  return async () => {
    const t = Date.now();
    const wait = Math.max(0, next - t);
    next = Math.max(t, next) + ms;
    if (wait > 0) await sleep(wait);
  };
}

/** 戻り値: { ok:true, url } | { ok:false, reason, google:true|false }。google:true は Google 側の失敗（ブレーカーの対象） */
async function resolveGoogleNewsUrl(gnUrl, io, spacer = async () => {}) {
  if (!/news\.google\.com/.test(gnUrl)) return { ok: true, url: gnUrl }; // すでに元記事のURL
  const m = GN_ID_RE.exec(gnUrl);
  if (!m) return { ok: false, reason: 'bad_url', google: false };
  const id = m[1];
  const legacy = decodeLegacyId(id);
  if (legacy) return { ok: true, url: legacy };

  let sg = null;
  let ts = null;
  const candidates = [gnUrl, `https://news.google.com/articles/${id}?hl=ja&gl=JP&ceid=JP:ja`];
  for (const u of candidates) {
    await spacer();
    let page;
    try { page = await io.get(u, { timeoutMs: 10000, maxBytes: 2000000 }); } catch (_) { return { ok: false, reason: 'google_network', google: true }; }
    if (page.status !== 200) return { ok: false, reason: `google_http_${page.status}`, google: true };
    const html = page.body.toString('utf8');
    sg = (html.match(/data-n-a-sg=["']([^"']+)["']/) || [])[1];
    ts = (html.match(/data-n-a-ts=["']([^"']+)["']/) || [])[1];
    if (sg && ts) break;
  }
  if (!sg || !ts) return { ok: false, reason: 'google_no_params', google: true };

  const inner = ['garturlreq', GARTURLREQ_CTX, id, Number(ts) || ts, sg];
  const freq = JSON.stringify([[['Fbv4je', JSON.stringify(inner), null, 'generic']]]);
  await spacer();
  let res;
  try { res = await io.post('https://news.google.com/_/DotsSplashUi/data/batchexecute', 'f.req=' + encodeURIComponent(freq), { timeoutMs: 10000 }); } catch (_) { return { ok: false, reason: 'google_network', google: true }; }
  if (res.status !== 200) return { ok: false, reason: `google_http_${res.status}`, google: true };
  const bodyText = res.body.toString('utf8');
  const url = parseBatchResponse(bodyText);
  if (url) return { ok: true, url };
  if (bodyText.includes('"Fbv4je",null') || bodyText.includes('"Fbv4je", null')) {
    return { ok: false, reason: 'google_not_found', google: false };
  }
  return { ok: false, reason: 'google_parse', google: true };
}

// ───────────────────────── 本文の抽出 ─────────────────────────
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };
function clean(s) {
  return String(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => ENTITIES[m])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(+n, 0x10ffff)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(/\s+/g, ' ')
    .trim();
}

function findArticleBody(node, depth = 0) {
  if (!node || depth > 6) return null;
  if (typeof node === 'object' && typeof node.articleBody === 'string' && node.articleBody.length >= 50) return node.articleBody;
  if (Array.isArray(node)) { for (const n of node) { const r = findArticleBody(n, depth + 1); if (r) return r; } return null; }
  if (typeof node === 'object') { for (const k of Object.keys(node)) { const r = findArticleBody(node[k], depth + 1); if (r) return r; } }
  return null;
}

const AUDIT_CACHE_FILE_VERSION = 2; // ファイル形式バージョン
const AUDIT_RULE_VERSION = 'v2.2-strict'; // 判定ルール・抽出器バージョン

/** 
 * 本文だけを取り出す。
 * 引数の完全互換性:
 *   - extractArticleText(html, 8000) -> 既存呼び出し（数値指定）
 *   - extractArticleText(html, title, 8000) -> 新呼び出し（タイトル指定）
 *   - extractArticleText(html, { title, maxChars }) -> オブジェクト指定
 */
function extractArticleText(html, optsOrMaxChars = 8000, legacyMaxChars = 8000) {
  let title = '';
  let maxChars = 8000;

  if (typeof optsOrMaxChars === 'number') {
    maxChars = optsOrMaxChars;
  } else if (typeof optsOrMaxChars === 'string') {
    title = optsOrMaxChars;
    maxChars = typeof legacyMaxChars === 'number' ? legacyMaxChars : 8000;
  } else if (typeof optsOrMaxChars === 'object' && optsOrMaxChars !== null) {
    title = optsOrMaxChars.title || '';
    maxChars = optsOrMaxChars.maxChars || 8000;
  }

  // 1. JSON-LD の検査（headline または見出し主要単語との整合性を厳格照合）
  for (const m of html.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1]);
      const b = findArticleBody(parsed);
      if (b && typeof b === 'string') {
        const cleaned = clean(b);
        if (cleaned.length >= 50) {
          const headline = typeof parsed.headline === 'string' ? clean(parsed.headline) : '';
          let isHeadlineMatch = false;
          if (headline && title) {
            const normHead = headline.replace(/\s+/g, '');
            const normTitle = title.replace(/\s+/g, '');
            if (normHead.includes(normTitle.slice(0, 15)) || normTitle.includes(normHead.slice(0, 15))) {
              isHeadlineMatch = true;
            }
          }
          if (!isHeadlineMatch && title) {
            const titleWords = title.match(/[\u3040-\u9fafA-Za-z]{3,}/g) || [];
            const matchCount = titleWords.filter((w) => cleaned.includes(w)).length;
            if (matchCount >= 2 || (titleWords.length === 1 && matchCount === 1)) {
              isHeadlineMatch = true;
            }
          }
          if (isHeadlineMatch || !title) {
            return cleaned.slice(0, maxChars);
          }
        }
      }
    } catch (_) {}
  }

  // 2. HTML構造からノイズタグおよび関連記事・ランキングコンテナを事前除去
  let h = html
    .replace(/<(script|style|noscript|nav|header|footer|aside|form|iframe|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(?:div|section|ul|ol)\b[^>]*class=["'][^"']*(?:ranking|related|recommend|choices|sidebar|banner|footer|latest|pickup|other[-_]news|series|topics|list[-_]news)[^"']*["'][\s\S]*?<\/(?:div|section|ul|ol)>/gi, ' ')
    .replace(/<(?:div|section)\b[^>]*class=["'][^"']*(?:other[-_]news[-_]list|series[-_]box|latest[-_]news[-_]wrap|c-ranking)[^"']*["'][\s\S]*?<\/(?:div|section)>/gi, ' ');

  // 本文専用コンテナの特定（存在しない場合は回遊汚染防止のため不採用）
  let containerHtml = '';
  const bodyContainer = h.match(/<(?:div|article|section)\b[^>]*class=["'][^"']*(?:ckeditor|article[-_]body|entry[-_]content|news[-_]detail|c-article|content[-_]main|post[-_]content|main[-_]content)[^"']*["'][\s\S]*?<\/(?:div|article|section)>/i);
  if (bodyContainer) {
    containerHtml = bodyContainer[0];
  } else {
    const art = h.match(/<article\b[\s\S]*?<\/article>/i);
    if (art && art[0].length < 15000) {
      containerHtml = art[0];
    }
  }

  if (!containerHtml) {
    return ''; // 本文専用コンテナが特定できないHTMLは即座に保留（メタ説明文フォールバックは完全廃止）
  }

  // コンテナ内からさらに回遊・関連記事・最新一覧コンテナを除去
  containerHtml = containerHtml
    .replace(/<(?:div|section|ul|ol)\b[^>]*class=["'][^"']*(?:ranking|related|recommend|choices|sidebar|banner|footer|latest|pickup|other[-_]news|series|topics|list[-_]news)[^"']*["'][\s\S]*?<\/(?:div|section|ul|ol)>/gi, ' ')
    .replace(/<(?:div|section)\b[^>]*class=["'][^"']*(?:other[-_]news[-_]list|series[-_]box|latest[-_]news[-_]wrap|c-ranking)[^"']*["'][\s\S]*?<\/(?:div|section)>/gi, ' ');

  containerHtml = containerHtml.replace(/<br\s*[\/]?>/gi, '\n');

  // 本文段落（<p>）の抽出
  const ps = [...containerHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => clean(m[1])).filter((t) => t.length >= 10);
  const cleanPs = [];
  for (const p of ps) {
    if (/^\s*(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}月\d{1,2}日)/.test(p)) break;
    if (/(?:もっとよむ|Pick\s*Up|関連記事|あわせて読みたい|注目記事|アクセスランキング|人気記事|最新ニュース|おすすめ記事)/i.test(p)) break;
    cleanPs.push(p);
  }

  let bodyText = '';
  if (cleanPs.length > 0) {
    bodyText = cleanPs.join('\n');
  } else {
    bodyText = clean(containerHtml);
  }

  bodyText = bodyText.split(/(?:もっとよむ|Pick\s*Up|関連記事|あわせて読みたい|注目記事|アクセスランキング|人気記事|最新ニュース|おすすめ記事)/i)[0];

  const lines = bodyText.split('\n');
  const validLines = [];
  for (const l of lines) {
    const trimmed = l.trim();
    if (/^\s*(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}月\d{1,2}日\s*[\d:]*)/.test(trimmed) && trimmed.length >= 15) break;
    validLines.push(l);
  }
  bodyText = validLines.join('\n').trim();

  // 本文領域から十分な長さ（35文字以上）が取れた場合のみ採用（meta description フォールバックは完全廃止）
  if (bodyText.length >= 35) return bodyText.slice(0, maxChars);

  return '';
}

/** 国籍語（被疑者側になり得るもの）を含む最初の文と、その前後の文を返す。isNat: (文) => boolean */
function pickNationalityContext(text, isNat, maxLen = 300) {
  const sents = String(text).split(/(?<=[。！？])/).map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < sents.length; i++) {
    if (!isNat(sents[i])) continue;
    const cur = sents[i];
    const joined = `${sents[i - 1] || ''}${cur}${sents[i + 1] || ''}`;
    return (joined.length <= maxLen ? joined : cur).slice(0, maxLen);
  }
  return null;
}

// ───────────────────────── スキャナ（キャッシュ・並列・ブレーカー） ─────────────────────────
function createScanner(opts = {}) {
  const cfg = {
    cachePath: CACHE_DEFAULT, io: defaultIo, findNationality: () => false, now: () => Date.now(), log: console,
    concurrency: 3, maxPerRun: 60, googleSpacingMs: 1000, domainSpacingMs: 1500, breakerThreshold: 5, ttlDays: 5, maxAttempts: 6,
    backoffMinutes: [60, 180, 360, 720, 1440], sleep: undefined, verifyArticle: null, ...opts,
  };
  const spacer = createSpacer(cfg.googleSpacingMs, cfg.sleep);
  const cache = new Map();
  let dirty = false;

  const domainLastAccess = new Map();
  const domainQueues = new Map();
  const rateLimitedDomains = new Set();

  try {
    if (fs.existsSync(cfg.cachePath)) {
      const j = JSON.parse(fs.readFileSync(cfg.cachePath, 'utf-8'));
      const limit = cfg.now() - cfg.ttlDays * 86400000;
      if (j && j.entries) {
        for (const [k, v] of Object.entries(j.entries)) {
          const isFresh = v && v.ts >= limit;
          const isRuleMatch = !v.ruleVersion || v.ruleVersion === AUDIT_RULE_VERSION;
          if (isFresh && isRuleMatch) {
            cache.set(k, v);
          }
        }
      }
    }
  } catch (e) { cfg.log.warn(`[本文スキャン] キャッシュを読めないため空で開始: ${e.message}`); }

  function flush() {
    if (!dirty) return false;
    fs.mkdirSync(path.dirname(cfg.cachePath), { recursive: true });
    const tmp = `${cfg.cachePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ v: AUDIT_CACHE_FILE_VERSION, entries: Object.fromEntries(cache) }), 'utf-8');
    fs.renameSync(tmp, cfg.cachePath);
    dirty = false;
    return true;
  }

  async function fetchWithDomainSpacing(targetUrl, timeoutMs = 10000) {
    let domain = '';
    try { domain = new URL(targetUrl).hostname; } catch (_) {}

    const minSpacing = cfg.domainSpacingMs !== undefined ? cfg.domainSpacingMs : 1500;

    let currentResolver = () => {};
    if (domain && minSpacing > 0) {
      if (rateLimitedDomains.has(domain)) {
        return { skipped: true, reason: 'domain_rate_limited' };
      }

      // ドメイン別ミューテックス（直列化キュー）
      const prevPromise = domainQueues.get(domain) || Promise.resolve();
      const currentPromise = new Promise((resolve) => { currentResolver = resolve; });
      domainQueues.set(domain, prevPromise.then(() => currentPromise));

      await prevPromise;

      // 待機後再チェック: 先行リクエストが429を受信していた場合は直ちに通信を停止
      if (rateLimitedDomains.has(domain)) {
        currentResolver();
        return { skipped: true, reason: 'domain_rate_limited' };
      }
    }

    try {
      if (domain && minSpacing > 0) {
        const lastAccess = domainLastAccess.get(domain) || 0;
        const elapsed = cfg.now() - lastAccess;
        if (elapsed < minSpacing) {
          await new Promise((r) => setTimeout(r, minSpacing - elapsed));
        }
        domainLastAccess.set(domain, cfg.now());
      }

      const page = await cfg.io.get(targetUrl, {
        timeoutMs,
        maxBytes: 1500000,
        headers: { 'Accept-Language': 'ja,en;q=0.8', Accept: 'text/html,application/xhtml+xml' },
      });

      if (page.status === 429) {
        if (domain) rateLimitedDomains.add(domain);
        return { fail: 'http_429' };
      }
      return { ok: true, page };
    } catch (e) {
      return { fail: `fetch_${e.message || 'error'}` };
    } finally {
      currentResolver();
    }
  }

  async function scanOne(url, title = '') {
    const dec = await resolveGoogleNewsUrl(url, cfg.io, spacer);
    if (!dec.ok) return { fail: dec.reason, googleFail: dec.google };

    if (/\/(?:images|photo|photos)\//i.test(dec.url)) {
      return { unavailable: true, reason: 'image_page', decodeOk: true, decodedUrl: dec.url };
    }

    const fetched = await fetchWithDomainSpacing(dec.url, 10000);
    if (fetched.skipped) {
      return { skipped: true, reason: fetched.reason, decodeOk: true, decodedUrl: dec.url };
    }
    if (fetched.fail) {
      return { fail: fetched.fail, decodeOk: true, decodedUrl: dec.url };
    }

    const page = fetched.page;
    if (page.status === 404 || page.status === 410) return { gone: true, decodeOk: true, decodedUrl: dec.url };
    if (page.status !== 200) return { fail: `http_${page.status}`, decodeOk: true, decodedUrl: dec.url };

    const text = extractArticleText(decodeHtml(page.body, page.headers && page.headers['content-type']), title);
    // テキストが空（抽出完全失敗）の場合のみ unreadable。本文が存在する場合は fetch-news.cjs の短文判定に委ねる
    if (text.length === 0) return { fail: 'unreadable', decodeOk: true, decodedUrl: dec.url };

    if (typeof cfg.verifyArticle === 'function') {
      const v = cfg.verifyArticle(text, title);
      return {
        ok: true,
        decodeOk: true,
        decodedUrl: dec.url,
        audit: v,
        status: v.verified ? 'verified' : (v.rejected ? 'rejected' : 'insufficient_evidence'),
        reason: v.rejectReason || v.pendingReason || null,
        text, // 本文テキストを必ず返却
      };
    }

    return { ok: true, decodeOk: true, decodedUrl: dec.url, snippet: pickNationalityContext(text, cfg.findNationality) || '', text };
  }

  async function scan(items) {
    const s = { total: items.length, fetched: 0, cached: 0, nat: 0, noNat: 0, gone: 0, unavailable: 0, pending: 0, gaveUp: 0, skippedBackoff: 0, skippedCap: 0, notAttempted: 0, breaker: false, reasons: {} };
    const byUrl = new Map();
    for (const it of items) { if (!byUrl.has(it.url)) byUrl.set(it.url, []); byUrl.get(it.url).push(it); }
    const apply = (its, snippet, scanResult, decodedUrl) => {
      for (const it of its) {
        if (snippet) it.bodyContext = snippet;
        if (scanResult) it._scanResult = scanResult;
        if (decodedUrl) it.resolvedUrl = decodedUrl;
      }
    };

    const queue = [];
    for (const [url, its] of byUrl) {
      const forceRefresh = its.some((i) => i.forceRefresh);
      const e = forceRefresh ? null : cache.get(url);
      if (e && (e.st === 'nat' || e.st === 'verified')) { apply(its, e.snippet, e.scanResult, e.url); s.cached++; s.nat++; continue; }
      if (e && (e.st === 'no_nat' || e.st === 'rejected' || e.st === 'insufficient_evidence')) { apply(its, null, e.scanResult, e.url); s.cached++; s.noNat++; continue; }
      if (e && e.st === 'gone') { s.cached++; s.gone++; continue; }
      if (e && e.st === 'unavailable') { s.cached++; s.unavailable++; continue; }
      if (e && e.st === 'gave_up') { s.cached++; s.gaveUp++; continue; }
      if (e && e.st === 'pending' && e.next > cfg.now()) { s.skippedBackoff++; continue; }
      queue.push({ url, its, prio: Math.max(...its.map((i) => i._bodyPriority || 0)) });
    }
    queue.sort((a, b) => b.prio - a.prio);
    const work = queue.slice(0, cfg.maxPerRun);
    s.skippedCap = queue.length - work.length;

    let idx = 0;
    let googleFails = 0;
    const worker = async () => {
      for (;;) {
        if (s.breaker) return;
        const i = idx++;
        if (i >= work.length) return;
        const w = work[i];
        let r;
        try { r = await scanOne(w.url, w.its[0] && w.its[0].title); } catch (e) { r = { fail: `error_${e.message}` }; }
        s.fetched++;
        const prev = cache.get(w.url) || {};
        const ts = cfg.now();
        if (r.decodeOk) googleFails = 0;
        if (r.googleFail && ++googleFails >= cfg.breakerThreshold) s.breaker = true;

        if (r.skipped) {
          apply(w.its, null, { status: 'pending', reason: r.reason, skipped: true }, r.decodedUrl);
        } else if (r.ok) {
          const st = r.status || (r.snippet ? 'nat' : 'no_nat');
          cache.set(w.url, { st, ruleVersion: AUDIT_RULE_VERSION, snippet: r.snippet, scanResult: r, url: r.decodedUrl, ts });
          if (r.status === 'verified' || r.snippet) { apply(w.its, r.snippet, r, r.decodedUrl); s.nat++; }
          else { apply(w.its, null, r, r.decodedUrl); s.noNat++; }
        } else if (r.gone) {
          cache.set(w.url, { st: 'gone', ruleVersion: AUDIT_RULE_VERSION, ts }); s.gone++;
          apply(w.its, null, { status: 'unavailable', reason: 'http_404' }, r.decodedUrl);
        } else if (r.unavailable) {
          cache.set(w.url, { st: 'unavailable', ruleVersion: AUDIT_RULE_VERSION, reason: r.reason, ts }); s.unavailable++;
          apply(w.its, null, { status: 'unavailable', reason: r.reason }, r.decodedUrl);
        } else {
          const attempts = (prev.attempts || 0) + 1;
          s.reasons[r.fail] = (s.reasons[r.fail] || 0) + 1;
          if (attempts >= cfg.maxAttempts) {
            cache.set(w.url, { st: 'gave_up', ruleVersion: AUDIT_RULE_VERSION, attempts, reason: r.fail, ts }); s.gaveUp++;
            apply(w.its, null, { status: 'gave_up', reason: r.fail, attempts }, r.decodedUrl);
          } else {
            const wait = cfg.backoffMinutes[Math.min(attempts - 1, cfg.backoffMinutes.length - 1)];
            cache.set(w.url, { st: 'pending', ruleVersion: AUDIT_RULE_VERSION, attempts, reason: r.fail, next: ts + wait * 60000, ts }); s.pending++;
            apply(w.its, null, { status: 'pending', reason: r.fail, attempts, nextAttemptAt: new Date(ts + wait * 60000).toISOString() }, r.decodedUrl);
          }
        }
        dirty = true;
      }
    };
    await Promise.all(Array.from({ length: Math.min(cfg.concurrency, work.length) }, worker));
    s.notAttempted = work.length - s.fetched;
    return s;
  }

  return { scan, flush, _cache: cache };
}

module.exports = { createScanner, resolveGoogleNewsUrl, decodeLegacyId, parseBatchResponse, decodeHtml, extractArticleText, pickNationalityContext, httpRequest, createSpacer };
