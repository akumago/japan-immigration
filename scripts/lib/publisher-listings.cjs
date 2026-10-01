'use strict';

const crypto = require('crypto');

// Google Newsを通さず、RSSを見つけられなかった地域局記事一覧を直接見る補完ソース。
// 表示ページの構造変更はソース単位の失敗として記録し、他の収集元は継続する。
const SOURCES = [
  { id: 'tbs-domestic', name: 'TBS NEWS DIG（JNN地域局）', url: 'https://newsdig.tbs.co.jp/list/genre/%E5%9B%BD%E5%86%85', host: 'newsdig.tbs.co.jp', path: /\/articles\/-\//, pages: 3 },
  { id: 'tv-asahi-society', name: 'テレ朝NEWS（事件・社会）', url: 'https://news.tv-asahi.co.jp/news_society/', host: 'news.tv-asahi.co.jp', path: /\/news_society\/articles\// },
  { id: 'jiji-society', name: '時事通信（社会）', url: 'https://www.jiji.com/jc/c?g=soc', host: 'www.jiji.com', path: /\/jc\/article/, preserveQuery: true },
  { id: 'fnn-shizuoka', name: 'FNNプライムオンライン（テレビ静岡）', url: 'https://www.fnn.jp/category/news-sut', host: 'www.fnn.jp', path: /\/articles\/-\// },
];

const CRIME_RE = /逮捕|再逮捕|起訴|書類送検|送検|送致|摘発|検挙|容疑|疑い|事件|窃盗|強盗|詐欺|暴行|傷害|殺人|覚醒剤|麻薬|密輸|不法残留|不法就労|盗撮|わいせつ|飲酒運転|ひき逃げ|横領|放火|侵入|賭博|売春|風営法|入管法/;
const FOREIGN_RE = /外国人|外国籍|国籍|中国籍|韓国籍|ベトナム籍|フィリピン籍|タイ籍|ブラジル籍|ネパール籍|イラン籍|パキスタン籍|ミャンマー籍|台湾籍|ドミニカ|中国人|韓国人|ベトナム人|フィリピン人|タイ人|ブラジル人|ネパール人/;

function decodeEntities(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function textOf(html) {
  return decodeEntities(String(html || '').replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}

function parseListing(html, source, { now = Date.now() } = {}) {
  const output = [];
  const seen = new Set();
  const re = /<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const rawUrl = decodeEntities(m[2]);
    let url;
    try { url = new URL(rawUrl, source.url); } catch (_) { continue; }
    if (url.hostname !== source.host || !source.path.test(url.pathname)) continue;
    const title = textOf(m[4]);
    if (title.length < 12 || !CRIME_RE.test(title)) continue;
    const normalized = source.preserveQuery && url.search ? `${url.origin}${url.pathname}${url.search}` : `${url.origin}${url.pathname}`;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    const id = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
    // Listings often expose a relative age beside each link. Use it when present;
    // otherwise use crawl time as first-seen time, in JST (the UI's reporting zone).
    const remainder = String(html).slice(re.lastIndex);
    const nextAnchor = remainder.search(/<a\b/i);
    const nearby = remainder.slice(0, nextAnchor < 0 ? 240 : Math.min(nextAnchor, 240));
    const age = nearby.match(/(?:<time\b[^>]*datetime=["']([^"']+)["'][^>]*>)|(?:([0-9]+)\s*(分|時間|日)前)/i);
    let publishedAt = now;
    if (age?.[1]) {
      const parsed = Date.parse(age[1]);
      if (Number.isFinite(parsed) && parsed <= now + 10 * 60 * 1000) publishedAt = parsed;
    } else if (age?.[2]) {
      const unitMs = age[3] === '分' ? 60_000 : age[3] === '時間' ? 3_600_000 : 86_400_000;
      publishedAt = now - Number(age[2]) * unitMs;
    }
    const jst = new Date(publishedAt + 9 * 60 * 60 * 1000);
    const date = `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
    const d = new Date(publishedAt);
    output.push({ id, url: normalized, title, media: source.name, pubDate: d.toISOString(), date, sourceType: 'publisher_listing', sourceId: source.id });
  }
  return output;
}

async function collectPublisherCandidates(httpRequest, { sources = SOURCES, now = Date.now(), logger = console } = {}) {
  const all = [];
  const status = [];
  for (const source of sources) {
    let failures = 0;
    let sourceCount = 0;
    for (let page = 1; page <= (source.pages || 1); page++) {
      const pageUrl = new URL(source.url);
      if (page > 1) pageUrl.searchParams.set('page', String(page));
      if (page > 1) await new Promise((resolve) => setTimeout(resolve, 2500));
      try {
        const response = await httpRequest(pageUrl.href, { timeoutMs: 12000, maxBytes: 1500000 });
        if (response.status === 429 || response.status === 403) throw new Error(`http_${response.status}`);
        if (response.status < 200 || response.status >= 300) throw new Error(`http_${response.status}`);
        const found = parseListing(response.body.toString('utf8'), source, { now });
        sourceCount += found.length;
        all.push(...found);
      } catch (err) {
        failures++;
        logger.error?.(`ソース取得失敗 ${source.id} page=${page}: ${err.message}`);
        if (/http_(?:403|429)/.test(err.message)) break;
      }
    }
    status.push({ id: source.id, ok: failures === 0, pagesFailed: failures, candidates: sourceCount });
    logger.log?.(`🗞️ ${source.name}: crime候補 ${sourceCount} 件、失敗ページ ${failures} 件`);
  }
  return { items: all, status };
}

module.exports = { SOURCES, parseListing, collectPublisherCandidates, CRIME_RE, FOREIGN_RE };
