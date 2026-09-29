'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const zlib = require('zlib');
const F = require('./article-fetcher.cjs');
const gate = require('./ai-gate.cjs');
const HEX = JSON.parse(fs.readFileSync(path.join(__dirname, 'article-fetcher.fixtures.json'), 'utf-8'));

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'af-'));
const isNat = (s) => !!gate.ruleSuspect(s, '');
const ARTICLE_HTML = (extra = '') => `<html><head><meta charset="utf-8"></head><body><nav>関連: ベトナム国籍の男を逮捕</nav><article><p>兵庫県警は29日、神戸市のタイヤ店からタイヤとホイール4本を盗んだ疑いで、会社員の男を逮捕したと発表した。</p><p>調べに対し、男は韓国籍の会社員(40)で、容疑を認めている。同署は余罪があるとみて調べている。${extra}</p></article><aside>おすすめ: 中国籍の男を逮捕</aside></body></html>`;
const NO_NAT_HTML = '<html><head><meta charset="utf-8"></head><body><article><p>兵庫県警は29日、神戸市のタイヤ店からタイヤとホイール4本を盗んだ疑いで、会社員の男(40)を逮捕したと発表した。逮捕容疑は、27日未明に店の駐車場に停めてあった車から盗んだ疑い。</p><p>調べに対し、男は容疑を認めている。同署は余罪があるとみて詳しく調べている。現場周辺では同様の被害が相次いでおり、防犯カメラの映像を解析している。</p></article></body></html>';

// ── Google News のURL解決 ──
const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
test('古い形式のIDは通信なしで元URLに解ける（短いURLと、長さが127を超えるURL）', () => {
  for (const url of ['https://example.com/a/1', 'https://example.com/' + 'x'.repeat(150)]) {
    const u = Buffer.from(url, 'utf8');
    const lenBytes = u.length >= 0x80 ? Buffer.from([(u.length & 0x7f) | 0x80, u.length >> 7]) : Buffer.from([u.length]);
    const id = b64url(Buffer.concat([Buffer.from([0x08, 0x13, 0x22]), lenBytes, u, Buffer.from([0xd2, 0x01, 0x00])]));
    assert.equal(F.decodeLegacyId(id), url);
  }
  assert.equal(F.decodeLegacyId('AU_yqLPMOUlvOCg3MI_5VLVNWvJS'), null); // 現行の不透明なID
});
test('batchexecute の応答を解析する（長さ行あり・なし）', () => {
  const inner = JSON.stringify(['garturlres', 'https://example.com/news/1', 1]);
  const row = JSON.stringify([['wrb.fr', 'Fbv4je', inner, null, null, null, 'generic'], ['di', 12]]);
  assert.equal(F.parseBatchResponse(`)]}'\n\n${row}\n`), 'https://example.com/news/1');
  assert.equal(F.parseBatchResponse(`)]}'\n\n${row.length}\n${row}\n25\n[["e",4,null,null,133]]`), 'https://example.com/news/1');
  assert.equal(F.parseBatchResponse('garbage'), null);
});
const GN = 'https://news.google.com/rss/articles/CBMiAU_yqLtest?oc=5';
const gnPage = '<c-wiz><div data-n-a-sg="SIG123" data-n-a-ts="1790000000"></div></c-wiz>';
const batchOk = (url) => `)]}'\n\n${JSON.stringify([['wrb.fr', 'Fbv4je', JSON.stringify(['garturlres', url, 1]), null]])}\n`;
test('resolveGoogleNewsUrl: 署名を取り、batchexecute で元URLを得る', async () => {
  const calls = [];
  const io = { get: async (u) => { calls.push(['GET', u]); return { status: 200, headers: {}, body: Buffer.from(gnPage) }; }, post: async (u, b) => { calls.push(['POST', u, b]); return { status: 200, headers: {}, body: Buffer.from(batchOk('https://pub.example/a1')) }; } };
  const r = await F.resolveGoogleNewsUrl(GN, io);
  assert.deepEqual(r, { ok: true, url: 'https://pub.example/a1' });
  assert.match(decodeURIComponent(calls[1][2]), /garturlreq.*CBMiAU_yqLtest.*SIG123/s);
});
test('resolveGoogleNewsUrl: 署名が取れなければ別URLも試し、それでも駄目なら google_no_params（失敗として返す）', async () => {
  let gets = 0;
  const io = { get: async () => { gets++; return { status: 200, headers: {}, body: Buffer.from('<html>shell</html>') }; }, post: async () => { throw new Error('呼ばれない'); } };
  const r = await F.resolveGoogleNewsUrl(GN, io);
  assert.equal(r.ok, false); assert.equal(r.reason, 'google_no_params'); assert.equal(r.google, true); assert.equal(gets, 2);
});
test('resolveGoogleNewsUrl: Googleが429なら google_http_429、Google以外のURLはそのまま返す', async () => {
  const io = { get: async () => ({ status: 429, headers: {}, body: Buffer.alloc(0) }), post: async () => null };
  assert.equal((await F.resolveGoogleNewsUrl(GN, io)).reason, 'google_http_429');
  assert.deepEqual(await F.resolveGoogleNewsUrl('https://pub.example/x', io), { ok: true, url: 'https://pub.example/x' });
});

// ── 文字コード・本文抽出 ──
test('Shift_JIS / EUC-JP / UTF-8(meta) のページを文字化けさせずに読む', () => {
  for (const [k, ct] of [['sj', 'text/html'], ['eu', 'text/html; charset=EUC-JP']]) {
    const txt = F.extractArticleText(F.decodeHtml(Buffer.from(HEX[k], 'hex'), ct));
    assert.match(txt, /韓国籍の会社員/, k);
  }
  assert.match(F.decodeHtml(Buffer.from('<meta charset="utf-8">韓国籍', 'utf8')), /韓国籍/);
});
test('本文だけを見る: ナビ・サイドバー・関連記事の国籍語は拾わない', () => {
  const t = F.extractArticleText(ARTICLE_HTML());
  assert.match(t, /韓国籍/);
  assert.doesNotMatch(t, /ベトナム国籍/);
  assert.doesNotMatch(t, /中国籍/);
});
test('JSON-LD の articleBody と og:description を使う', () => {
  const body = '兵庫県警は29日、窃盗の疑いで男を逮捕した。調べに対し、男は韓国籍の会社員で、容疑を認めている。同署は余罪があるとみている。';
  const h1 = `<html><head><script type="application/ld+json">${JSON.stringify({ '@graph': [{ '@type': 'NewsArticle', articleBody: body }] })}</script></head><body><div>JSで描画</div></body></html>`;
  assert.match(F.extractArticleText(h1), /韓国籍の会社員/);
  const h2 = '<html><head><meta property="og:description" content="兵庫県警は窃盗の疑いで韓国籍の会社員の男を逮捕した。詳しい経緯を調べている。"></head><body></body></html>';
  assert.match(F.extractArticleText(h2), /韓国籍/);
});
test('pickNationalityContext: 被疑者側の国籍語を含む最初の文と前後だけを返す。被害者の国籍の文は飛ばす', () => {
  const t = '兵庫県警は逮捕した。被害に遭ったのはベトナム国籍の女性で、けがはない。調べに対し、男は韓国籍で、容疑を認めている。同署は調べている。';
  const s = F.pickNationalityContext(t, isNat);
  assert.match(s, /男は韓国籍/);
  assert.ok(s.length <= 300);
  assert.equal(F.pickNationalityContext('兵庫県警は逮捕した。男は容疑を認めている。', isNat), null);
});

// ── 実際のHTTP処理（手元のサーバーで検証） ──
function serve(handler) {
  return new Promise((resolve) => { const srv = http.createServer(handler); srv.listen(0, '127.0.0.1', () => resolve({ srv, base: `http://127.0.0.1:${srv.address().port}` })); });
}
test('httpRequest: 複数バイト文字がチャンクの途中で切れても文字化けしない（Buffer で受信してからデコード）', async () => {
  const bytes = Buffer.from('<meta charset="utf-8">男は韓国籍の会社員で、容疑を認めている。', 'utf8');
  const { srv, base } = await serve((req, res) => { res.setHeader('Content-Type', 'text/html'); res.write(bytes.subarray(0, 27)); setTimeout(() => { res.write(bytes.subarray(27, 29)); setTimeout(() => res.end(bytes.subarray(29)), 10); }, 10); });
  try { const r = await F.httpRequest(base + '/'); assert.equal(F.decodeHtml(r.body, r.headers['content-type']).includes('男は韓国籍の会社員で、容疑を認めている。'), true); assert.equal(r.body.toString('utf8').includes('\ufffd'), false); } finally { srv.close(); }
});
test('httpRequest: サイズ上限で打ち切る／相対リダイレクトを辿る／404は例外にせず返す／gzipを展開する', async () => {
  const { srv, base } = await serve((req, res) => {
    if (req.url === '/big') return res.end('a'.repeat(50000));
    if (req.url === '/r') { res.statusCode = 302; res.setHeader('Location', '/final'); return res.end(); }
    if (req.url === '/final') return res.end('done');
    if (req.url === '/gz') { res.setHeader('Content-Encoding', 'gzip'); return res.end(zlib.gzipSync(Buffer.from('圧縮された本文'))); }
    res.statusCode = 404; res.end('no');
  });
  try {
    const big = await F.httpRequest(base + '/big', { maxBytes: 1000 }); assert.equal(big.truncated, true); assert.equal(big.body.length, 1000);
    assert.equal((await F.httpRequest(base + '/r')).body.toString(), 'done');
    assert.equal((await F.httpRequest(base + '/none')).status, 404);
    assert.equal((await F.httpRequest(base + '/gz')).body.toString('utf8'), '圧縮された本文');
  } finally { srv.close(); }
});
test('httpRequest: 応答が来ないサーバーはタイムアウトで打ち切る', async () => {
  const { srv, base } = await serve(() => { /* 何も返さない */ });
  try { await assert.rejects(F.httpRequest(base + '/', { timeoutMs: 150 }), /timeout/); } finally { srv.close(); srv.closeAllConnections && srv.closeAllConnections(); }
});

// ── スキャナ ──
const mkItem = (n, over = {}) => ({ title: `タイヤ盗の疑い 男を逮捕 ${n}`, url: `https://news.google.com/rss/articles/CBMi${n}?oc=5`, ...over });
/** pages: { [記事番号]: { status, html } } を返す偽のio。Google側は常に成功し、記事番号に対応する元URLを返す */
function fakeIo(pages, opt = {}) {
  const log = { get: [], post: 0, inflight: 0, maxInflight: 0 };
  return {
    log,
    io: {
      get: async (u) => {
        log.get.push(u);
        if (u.startsWith('https://news.google.com/')) { if (opt.googleFail) return { status: 429, headers: {}, body: Buffer.alloc(0) }; return { status: 200, headers: {}, body: Buffer.from(gnPage) }; }
        log.inflight++; log.maxInflight = Math.max(log.maxInflight, log.inflight);
        await new Promise((r) => setTimeout(r, 15)); log.inflight--;
        const p = pages[u.split('/').pop()] || { status: 404 };
        if (p.throw) throw new Error(p.throw);
        return { status: p.status, headers: { 'content-type': 'text/html; charset=utf-8' }, body: Buffer.from(p.html || '') };
      },
      post: async (u, body) => { log.post++; const id = decodeURIComponent(body).match(/CBMi(\w+)/)[1]; return { status: 200, headers: {}, body: Buffer.from(batchOk(`https://pub.example/${id}`)) }; },
    },
  };
}
const scanner = (io, over = {}) => F.createScanner({ cachePath: path.join(tmpDir(), 'c.json'), io, findNationality: isNat, googleSpacingMs: 0, log: { warn() {}, log() {} }, ...over });

test('本文に国籍語があれば bodyContext に国籍語を含む文を入れ、結果を永続化して、次回は通信しない', async () => {
  const { io, log } = fakeIo({ a1: { status: 200, html: ARTICLE_HTML() } });
  const cachePath = path.join(tmpDir(), 'c.json');
  const it = mkItem('a1');
  const s1 = F.createScanner({ cachePath, io, findNationality: isNat, googleSpacingMs: 0, log: { warn() {} } });
  const r = await s1.scan([it]);
  assert.equal(r.nat, 1); assert.match(it.bodyContext, /男は韓国籍の会社員/); assert.equal(s1.flush(), true);
  const before = log.get.length;
  const it2 = mkItem('a1'); const s2 = F.createScanner({ cachePath, io, findNationality: isNat, googleSpacingMs: 0, log: { warn() {} } });
  const r2 = await s2.scan([it2]);
  assert.equal(r2.cached, 1); assert.match(it2.bodyContext, /韓国籍/); assert.equal(log.get.length, before);
});
test('本文が読めて国籍語が無い → no_nat（確定・再取得しない）。bodyContext は付かない', async () => {
  const { io, log } = fakeIo({ a2: { status: 200, html: NO_NAT_HTML } });
  const sc = scanner(io); const it = mkItem('a2');
  const r = await sc.scan([it]); assert.equal(r.noNat, 1); assert.equal(it.bodyContext, undefined);
  const before = log.get.length; await sc.scan([mkItem('a2')]); assert.equal(log.get.length, before);
});
test('取得失敗は「国籍なし」にしない: pending（保留）。間隔を空けて再試行し、上限で gave_up', async () => {
  let now = 1_000_000_000_000;
  const { io, log } = fakeIo({ a3: { status: 503 } });
  const sc = scanner(io, { now: () => now, maxAttempts: 3, backoffMinutes: [60, 180] });
  const it = mkItem('a3');
  let r = await sc.scan([it]); assert.equal(r.pending, 1); assert.equal(it.bodyContext, undefined); assert.equal(r.noNat, 0);
  const n1 = log.get.length; r = await sc.scan([mkItem('a3')]); assert.equal(r.skippedBackoff, 1); assert.equal(log.get.length, n1); // 直後は再試行しない
  now += 61 * 60000; r = await sc.scan([mkItem('a3')]); assert.equal(r.pending, 1);
  now += 181 * 60000; r = await sc.scan([mkItem('a3')]); assert.equal(r.gaveUp, 1); // 3回失敗 → 打ち切り
  const n2 = log.get.length; await sc.scan([mkItem('a3')]); assert.equal(log.get.length, n2);
});
test('404/410 は確定（gone）。読めないページ（JS描画・ペイウォール）は pending で、no_nat にしない', async () => {
  const { io } = fakeIo({ a4: { status: 404 }, a5: { status: 200, html: '<html><body><div id="app"></div></body></html>' } });
  const sc = scanner(io);
  const r = await sc.scan([mkItem('a4'), mkItem('a5')]);
  assert.equal(r.gone, 1); assert.equal(r.pending, 1); assert.equal(r.noNat, 0);
});
test('Google側の解決に失敗した記事も pending（国籍なしとして捨てない）', async () => {
  const { io } = fakeIo({}, { googleFail: true });
  const it = mkItem('a6'); const sc = scanner(io);
  const r = await sc.scan([it]); assert.equal(r.pending, 1); assert.equal(r.noNat, 0);
  assert.equal(sc._cache.get(it.url).st, 'pending');
});
test('サーキットブレーカー: Googleが連続で失敗したら打ち切り、試していない記事は失敗として数えない', async () => {
  const { io, log } = fakeIo({}, { googleFail: true });
  const items = Array.from({ length: 10 }, (_, i) => mkItem('b' + i));
  const sc = scanner(io, { concurrency: 1, breakerThreshold: 3 });
  const r = await sc.scan(items);
  assert.equal(r.breaker, true); assert.equal(r.fetched, 3); assert.equal(r.notAttempted, 7);
  assert.equal(sc._cache.size, 3);
});
test('1回の上限と優先度: 上限を超えた分は次回に回し、優先度の高い記事から取る', async () => {
  const pages = {}; for (let i = 0; i < 6; i++) pages['c' + i] = { status: 200, html: NO_NAT_HTML };
  const { io, log } = fakeIo(pages);
  const items = Array.from({ length: 6 }, (_, i) => mkItem('c' + i, { _bodyPriority: i === 5 ? 1 : 0 }));
  const sc = scanner(io, { maxPerRun: 2, concurrency: 1 });
  const r = await sc.scan(items);
  assert.equal(r.fetched, 2); assert.equal(r.skippedCap, 4);
  assert.ok(log.get.some((u) => u.endsWith('/c5')));
});
test('並列数は3まで／同じURLは1回だけ取得する', async () => {
  const pages = {}; for (let i = 0; i < 9; i++) pages['d' + i] = { status: 200, html: NO_NAT_HTML };
  const { io, log } = fakeIo(pages);
  const items = Array.from({ length: 9 }, (_, i) => mkItem('d' + i)); items.push(mkItem('d0'));
  const sc = scanner(io, { concurrency: 3 });
  const r = await sc.scan(items);
  assert.ok(log.maxInflight <= 3 && log.maxInflight >= 2, `最大同時 ${log.maxInflight}`);
  assert.equal(log.get.filter((u) => u.endsWith('/d0')).length, 1);
  assert.equal(r.fetched, 9);
});
test('キャッシュの保存はアトミック（tmp→rename）で、期限切れは読み込み時に捨てる', async () => {
  const cachePath = path.join(tmpDir(), 'c.json');
  const day = 86400000; const t0 = 1_000_000_000_000;
  fs.writeFileSync(cachePath, JSON.stringify({ v: 1, entries: { old: { st: 'no_nat', ts: t0 - 8 * day }, fresh: { st: 'no_nat', ts: t0 - 1 * day } } }));
  const sc = F.createScanner({ cachePath, io: fakeIo({}).io, findNationality: isNat, now: () => t0, log: { warn() {} } });
  assert.deepEqual([...sc._cache.keys()], ['fresh']);
  sc._cache.set('x', { st: 'no_nat', ts: t0 }); // 変更が無ければ書かない
  assert.equal(sc.flush(), false);
  assert.equal(fs.existsSync(cachePath + '.tmp'), false);
});
test('壊れたキャッシュファイルでも落ちずに空から始める', () => {
  const cachePath = path.join(tmpDir(), 'c.json'); fs.writeFileSync(cachePath, '{broken');
  const sc = F.createScanner({ cachePath, io: fakeIo({}).io, findNationality: isNat, log: { warn() {} } });
  assert.equal(sc._cache.size, 0);
});
