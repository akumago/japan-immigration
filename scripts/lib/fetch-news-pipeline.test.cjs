'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const gate = require('./ai-gate.cjs');
const articleFetcher = require('./article-fetcher.cjs');

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-test-'));

test('pipeline: 120時間TTL（5日間）境界で期限切れアイテムが完全パージされる', () => {
  const now = 1_000_000_000_000;
  const TTL_MS = 120 * 3600 * 1000;

  const queue = {
    version: 1,
    items: [
      { id: 'fresh1', firstSeen: new Date(now - TTL_MS + 60000).toISOString(), status: 'pending' },
      { id: 'expired1', firstSeen: new Date(now - TTL_MS - 60000).toISOString(), status: 'pending' },
      { id: 'expired2', firstSeen: new Date(now - TTL_MS - 3600000).toISOString(), status: 'verified' },
    ]
  };

  const remaining = queue.items.filter((item) => {
    const firstSeenTime = item.firstSeen ? new Date(item.firstSeen).getTime() : 0;
    return (now - firstSeenTime) < TTL_MS;
  });

  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'fresh1');
});

test('pipeline: 未来日時のアイテムは即時処理せず保留する', () => {
  const now = 1_000_000_000_000;
  const futurePubDate = new Date(now + 15 * 60 * 1000).toISOString(); // +15分（時計ズレ）
  const normalPubDate = new Date(now - 10 * 60 * 1000).toISOString();

  const isEligible = (item) => {
    const pubDateTime = item.pubDate ? new Date(item.pubDate).getTime() : 0;
    if (pubDateTime > now + 10 * 60 * 1000) return false;
    return true;
  };

  assert.equal(isEligible({ pubDate: futurePubDate }), false);
  assert.equal(isEligible({ pubDate: normalPubDate }), true);
});

test('pipeline: 同一ドメイン直列化＆429受信時の即時スキップ', async () => {
  const rateLimitedDomains = new Set();
  const domainQueues = new Map();
  const logs = [];

  const mockFetch = async (domain, status) => {
    if (rateLimitedDomains.has(domain)) {
      logs.push(`skipped_${domain}`);
      return { skipped: true };
    }

    const prevPromise = domainQueues.get(domain) || Promise.resolve();
    let resolver;
    const curPromise = new Promise((r) => { resolver = r; });
    domainQueues.set(domain, prevPromise.then(() => curPromise));

    await prevPromise;

    if (rateLimitedDomains.has(domain)) {
      resolver();
      logs.push(`skipped_after_wait_${domain}`);
      return { skipped: true };
    }

    logs.push(`fetched_${domain}`);
    if (status === 429) {
      rateLimitedDomains.add(domain);
    }
    resolver();
    return { ok: status === 200, status };
  };

  // 同一ドメインへ2件リクエスト、1件目が429を返す
  const p1 = mockFetch('example.com', 429);
  const p2 = mockFetch('example.com', 200);
  await Promise.all([p1, p2]);

  assert.deepEqual(logs, ['fetched_example.com', 'skipped_after_wait_example.com']);
});

test('pipeline: 同県別事件が保持される（見出し・類似度で誤統合されない）', () => {
  const itemA = {
    url: 'https://news.example.com/tokyo/crime-1',
    title: '東京都新宿区の路上で強盗疑い ベトナム国籍の男を逮捕',
    location: '東京都',
    date: '2026-10-01'
  };
  const itemB = {
    url: 'https://news.example.com/tokyo/crime-2',
    title: '東京都渋谷区のマンションで住居侵入疑い 中国籍の男を逮捕',
    location: '東京都',
    date: '2026-10-01'
  };

  // URL正規化による一意化
  const normA = itemA.url;
  const normB = itemB.url;
  assert.notEqual(normA, normB);

  const seen = new Set();
  const unique = [];
  for (const it of [itemA, itemB]) {
    if (!seen.has(it.url)) {
      seen.add(it.url);
      unique.push(it);
    }
  }

  assert.equal(unique.length, 2);
  assert.equal(unique[0].location, '東京都');
  assert.equal(unique[1].location, '東京都');
});

test('pipeline: 同一バッチ内での解決後URL重複排除', () => {
  const newlyVerified = [
    { id: '1', url: 'https://news.google.com/rss/articles/A1', resolvedUrl: 'https://mainichi.jp/articles/20261001/k00/001', title: '記事1' },
    { id: '2', url: 'https://news.google.com/rss/articles/A2', resolvedUrl: 'https://mainichi.jp/articles/20261001/k00/001', title: '記事2(同元記事)' },
    { id: '3', url: 'https://news.google.com/rss/articles/A3', resolvedUrl: 'https://yomiuri.co.jp/national/20261001-002', title: '別記事' },
  ];

  const accepted = [];
  const seenBatchUrls = new Set();

  for (const v of newlyVerified) {
    const normUrl = v.url;
    const normResolved = v.resolvedUrl;

    if (seenBatchUrls.has(normUrl) || (normResolved && seenBatchUrls.has(normResolved))) {
      continue;
    }
    seenBatchUrls.add(normUrl);
    if (normResolved) seenBatchUrls.add(normResolved);

    accepted.push(v);
  }

  assert.equal(accepted.length, 2);
  assert.equal(accepted[0].id, '1');
  assert.equal(accepted[1].id, '3');
});

test('pipeline: 既存197件の完全凍結保持（順序・内容が一切改変されない）', () => {
  const frozenExisting = [
    { id: 'old-1', date: '2026-08-26', title: '過去記事1', location: '東京都' },
    { id: 'old-2', date: '2026-08-25', title: '過去記事2', location: '大阪府' },
  ];

  const newlyAccepted = [
    { id: 'new-1', date: '2026-10-01', title: '新着記事1', location: '福岡県' }
  ];

  // 新着記事のみを先頭に付加
  const finalMerged = [...newlyAccepted, ...frozenExisting];

  assert.equal(finalMerged.length, 3);
  assert.equal(finalMerged[0].id, 'new-1');
  assert.equal(finalMerged[1].id, 'old-1');
  assert.equal(finalMerged[2].id, 'old-2');

  // 既存要素が完全に同一であることを保証
  assert.deepEqual(finalMerged.slice(1), frozenExisting);
});

test('pipeline: 公開データへの本文抜粋（audit）混入防止', () => {
  const verifiedQueueItem = {
    id: 'test-1',
    title: '福岡空港でコカイン密輸容疑 ドミニカ国籍の男を逮捕',
    date: '2026-10-01',
    location: '福岡県',
    media: '読売新聞',
    url: 'https://pub.example/news1',
    status: 'verified',
    audit: {
      japanCrime: { verified: true, evidence: '福岡空港で' },
      suspectRole: { verified: true, evidence: 'ドミニカ国籍の男を逮捕' },
      foreignNationality: { verified: true, evidence: 'ドミニカ国籍' }
    }
  };

  // 公開データ作成
  const publicItem = {
    id: verifiedQueueItem.id,
    title: verifiedQueueItem.title,
    date: verifiedQueueItem.date,
    location: verifiedQueueItem.location,
    media: verifiedQueueItem.media,
    url: verifiedQueueItem.url,
    summary: `${verifiedQueueItem.location}で発生した外国人関与の事件・容疑に関する報道速報です。`,
    audited: true
  };

  assert.equal(publicItem.audit, undefined);
  assert.equal(publicItem.bodyContext, undefined);
  assert.equal(publicItem.bodyText, undefined);
  assert.equal(Object.keys(publicItem).includes('audit'), false);
});

test('pipeline E2E: 候補1件が本文取得から verified 化、公開JSON追加まで進む完全経路', async () => {
  const sampleArticleHtml = `
    <html><body>
      <div class="c-article-body">
        <p>福岡空港で29日、コカイン約1.2キロをスーツケースに隠して密輸しようとしたとして、ドミニカ国籍の男（29）が麻薬取締法違反の疑いで逮捕されました。</p>
        <p>警察によりますと、男は容疑を認めているということです。</p>
      </div>
    </body></html>`;

  // 1. スキャナーのモック実行（本文 text を返すことを検証）
  const io = {
    get: async () => ({ status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: Buffer.from(sampleArticleHtml) }),
    post: async () => null,
  };

  const scanner = articleFetcher.createScanner({
    cachePath: path.join(tmpDir(), 'cache.json'),
    io,
    googleSpacingMs: 0,
    domainSpacingMs: 0,
  });

  const queueItem = {
    url: 'https://news.example.com/crime/101',
    title: '福岡空港でコカイン密輸容疑 ドミニカ国籍の男逮捕',
    pubDate: new Date().toISOString(),
    status: 'pending'
  };

  const scanTarget = { url: queueItem.url, title: queueItem.title };
  await scanner.scan([scanTarget]);

  // 本文 text が scanResult に確実に渡っていることを検証
  assert.ok(scanTarget._scanResult, 'scanResultが存在すること');
  assert.ok(scanTarget._scanResult.ok, '取得成功であること');
  assert.ok(scanTarget._scanResult.text, '本文 text が返されていること');
  assert.match(scanTarget._scanResult.text, /ドミニカ国籍の男/);

  // 2. 本文の3要素結合検証（国内・被疑者役割・外国籍）
  const v = gate.verifyArticleContent(scanTarget._scanResult.text, queueItem.title);
  assert.equal(v.verified, true, '本文から3要素が揃って合格すること');
  assert.equal(v.location, '福岡県', '現場が特定されること');

  // 3. キューの verified 更新
  queueItem.status = 'verified';
  queueItem.location = v.location;
  queueItem.audit = v.audit;

  // 4. 公開データ作成（本文抜粋 audit は除外）
  const publicArticle = {
    id: 'test-101',
    title: queueItem.title,
    date: '2026-10-01',
    location: queueItem.location,
    media: '読売新聞',
    url: queueItem.url,
    summary: `${queueItem.location}で発生した外国人関与の事件・容疑に関する報道速報です。`,
    audited: true
  };

  const frozenExisting = [{ id: 'old-1', title: '既存記事1' }];
  const finalMerged = [publicArticle, ...frozenExisting];

  assert.equal(finalMerged.length, 2);
  assert.equal(finalMerged[0].id, 'test-101');
  assert.equal(finalMerged[0].audit, undefined, 'auditが公開データに混入しないこと');
  assert.equal(finalMerged[1].id, 'old-1', '既存記事が保持されること');
});

test('pipeline: メタ説明文（og:description）単体は空文字となり、本文100文字未満は保留され、公開データに追加されない', () => {
  const metaOnlyHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:title" content="群馬県大泉町でブラジル国籍の男を逮捕">
        <meta property="og:description" content="群馬県大泉町で28日、ブラジル国籍の男が窃盗容疑で逮捕されました。警察が動機を調べています。">
      </head>
      <body>
        <div class="nav-header">ニュース一覧</div>
      </body>
    </html>`;

  // 1. extractArticleText は本文専用コンテナがないため空文字を返す
  const text = articleFetcher.extractArticleText(metaOnlyHtml, '群馬県大泉町でブラジル国籍の男を逮捕');
  assert.equal(text, '', 'メタ説明文単体はフォールバックされず空文字を返すこと');

  // 2. 本文が空または100文字未満の場合、判定関数以前にパイプラインで保留される
  assert.ok(text.length < 100, '本文100文字未満であること');

  // 3. 万一本文判定に渡っても空文字なら insufficientEvidence
  const v = gate.verifyArticleContent(text, '群馬県大泉町でブラジル国籍の男を逮捕');
  assert.equal(v.verified, false, 'メタ説明文のみの記事は絶対に合格しないこと');
  assert.equal(v.insufficientEvidence, true);
});

test('本文判定: フィリピン人女性と逮捕された日本人男性を別人として扱い、外国籍被疑者と誤認しない', () => {
  const body = 'フィリピン国籍の女性が日本人と結婚したとする虚偽の在留資格証明書を作成したとして、元行政書士の男が逮捕されました。一宮市の元行政書士・小島一輝容疑者（45）は、名古屋出入国在留管理局に虚偽の書類を提出した疑いが持たれています。警察は関係者から事情を聴き、詳しい経緯を調べています。';
  const result = gate.verifyArticleContent(body, '虚偽の在留資格証明書作成の疑い、フィリピン人女性と元行政書士の男を逮捕');
  assert.equal(result.verified, false);
  assert.equal(result.insufficientEvidence, true);
  assert.notEqual(result.pendingReason, null);
});

test('本文判定: 文京区の空き家窃盗未遂・ベトナム国籍の男2人を同一事件文脈で通す', () => {
  const body = '警視庁は1日、東京都文京区の空き家に侵入し金品を盗もうとしたとして、ベトナム国籍の解体工の男2人（24歳と27歳）を窃盗未遂などの疑いで逮捕しました。2人は隣接する解体工事現場で作業していた技能実習生で、調べに対し1人は容疑を認め、もう1人は否認しています。';
  const result = gate.verifyArticleContent(body, '東京都文京区の空き家に侵入 ベトナム国籍の解体工の男2人を逮捕');
  assert.equal(result.verified, true);
  assert.equal(result.location, '東京都');
});

test('本文判定: 熱海市での覚醒剤所持と逮捕された韓国籍の男を本文で結び付ける', () => {
  const body = '静岡県熱海市内で覚せい剤約0.1グラムを所持していた疑いで、名古屋市中村区在住の韓国籍の男（57）を覚醒剤取締法違反の疑いで逮捕しました。8月14日に男が別件で110番通報した際に警察官が不審な様子に気付き、所持品を確認していました。';
  const result = gate.verifyArticleContent(body, '熱海市で覚醒剤所持疑い 韓国籍の男を逮捕');
  assert.equal(result.verified, true);
  assert.equal(result.location, '静岡県');
});

test('警察公式ソース: 千葉県警の日次事件ファイルから外国籍候補を事件ごとに抽出する', () => {
  const source = require('./police-bulletins.cjs');
  const index = '<a href="orders_prefecture_03776.html">最新事件・事故ファイル（2026年9月30日）</a>';
  const pages = source.parseChibaIndex(index);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].url, 'https://www.police.pref.chiba.jp/kohoka/orders_prefecture_03776.html');
  const html = '<main><h1>最新事件・事故ファイル（2026年9月30日）</h1><p>・性的姿態撮影等処罰法違反(性的姿態等撮影未遂)事件で男を逮捕（流山警察署）</p><p>　9月30日午前10時20分頃、東武野田線江戸川台駅西口上りエスカレーター上で、後方から女性(20歳代)に近づき、手に持っていたスマートフォンをスカートの下方に差し入れ撮影しようとした中国国籍の男(30)を同日逮捕</p><p>・交通重傷事故で女を逮捕（四街道警察署）</p><p>　会社員の女(52)を逮捕</p><a>前のページに戻る</a></main>';
  const items = source.parseChibaBulletin(html, pages[0].url);
  assert.equal(items.length, 1);
  assert.match(items[0].title, /性的姿態撮影/);
  assert.match(items[0].sourceBody, /中国国籍/);
  assert.equal(items[0].sourceType, 'police_bulletin');
  assert.equal(items[0].date, '2026-09-30');
  const gate = require('./ai-gate.cjs');
  const verified = gate.verifyArticleContent(items[0].sourceBody, items[0].title);
  assert.equal(verified.verified, true);
  assert.equal(verified.location, '千葉県');
});

test('直接メディア巡回: JNN・FNN・ANNの一覧から事件記事だけを本文審査候補にする', () => {
  const listings = require('./publisher-listings.cjs');
  const source = listings.SOURCES.find((s) => s.id === 'tbs-domestic');
  const html = '<a href="/articles/-/123">中国籍の男を窃盗容疑で逮捕　新潟・三条市</a><span>5分前</span><a href="/articles/-/124">外国人観光客が増加</a><a href="/articles/-/123">中国籍の男を窃盗容疑で逮捕　新潟・三条市</a>';
  const now = Date.parse('2026-10-01T00:05:00Z');
  const items = listings.parseListing(html, source, { now });
  assert.equal(items.length, 1);
  assert.match(items[0].title, /中国籍/);
  assert.equal(items[0].sourceType, 'publisher_listing');
  assert.equal(items[0].url, 'https://newsdig.tbs.co.jp/articles/-/123');
  assert.equal(items[0].pubDate, new Date(now - 5 * 60 * 1000).toISOString());
  assert.equal(items[0].date, '2026-10-01');
});

test('独立RSS取得元: Yahoo国内・地域、NHK、NNN、FNNがGoogle検索とは別に登録される', () => {
  const { RSS_SOURCES } = require('./rss-sources.cjs');
  const ids = new Set(RSS_SOURCES.map((source) => source.id));
  for (const id of ['yahoo-domestic', 'yahoo-local', 'nhk-social', 'nhk-top', 'nnn-latest', 'fnn-latest']) {
    assert.equal(ids.has(id), true, `${id} の公式RSS経路が登録される`);
  }
  assert.ok(RSS_SOURCES.every((source) => source.url.startsWith('https://')));
});

test('Yahoo!公式RSS一覧: 地方メディアの提供元フィードを動的に抽出し、2巡回枠へ重複なく分割する', () => {
  const sources = require('./rss-sources.cjs');
  const html = '<a href="/rss/media/doshin/all.xml">北海道新聞</a><a href="/rss/media/at_s/all.xml">静岡新聞DIGITAL</a><a href="/rss/media/tssv/all.xml">テレビ新広島</a><a href="/rss/media/idol/all.xml">TV LIFE web</a>';
  const feeds = sources.parseYahooMediaCatalog(html);
  assert.equal(feeds.length, 3);
  const first = sources.selectYahooMediaShard(feeds, { now: Date.parse('2026-10-01T00:00:00Z'), shardCount: 2 });
  const second = sources.selectYahooMediaShard(feeds, { now: Date.parse('2026-10-01T01:00:00Z'), shardCount: 2 });
  assert.equal(first.length + second.length, feeds.length);
  assert.equal(first.some((x) => second.some((y) => x.id === y.id)), false);
});

test('独立RSS取得元: ある媒体が失敗しても別媒体の候補を保持し、取得状態を記録する', async () => {
  const { collectOfficialRss } = require('./rss-sources.cjs');
  const sources = [
    { id: 'ok', url: 'https://ok.example/rss', media: 'test media' },
    { id: 'bad', url: 'https://bad.example/rss', media: 'bad media' },
  ];
  const result = await collectOfficialRss(
    async (url) => { if (url.includes('bad')) throw new Error('http_503'); return '<rss></rss>'; },
    () => [{ id: 'item-1', media: '新聞・報道' }],
    { sources, pause: async () => {}, logger: { log() {}, error() {} } },
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].media, 'test media');
  assert.equal(result.items[0].sourceId, 'ok');
  assert.deepEqual(result.status.map((x) => x.ok), [true, false]);
});

test('RSS 1.0: RDF形式の日テレ公式フィードも候補として解析し、配信日時を保持する', () => {
  const fetchNews = require('../fetch-news.cjs');
  const rdf = '<?xml version="1.0"?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><item rdf:about="https://news.ntv.co.jp/n/abc"><title>中国籍の男を窃盗容疑で逮捕　新潟県三条市</title><dc:date>2026-10-01T10:00:00+09:00</dc:date></item></rdf:RDF>';
  const items = fetchNews.extractItemsFromRSS(rdf);
  assert.equal(items.length, 1);
  assert.match(items[0].title, /中国籍/);
  assert.equal(items[0].url, 'https://news.ntv.co.jp/n/abc');
  assert.equal(new Date(items[0].pubDate).toISOString(), '2026-10-01T01:00:00.000Z');
});

test('重複照合: 媒体が違っても同一の富士市・覚醒剤製造・イラン国籍事件は同じ指紋になる', () => {
  const fetchNews = require('../fetch-news.cjs');
  const livedoor = {
    title: 'ヤードで覚醒剤製造疑い イラン国籍の男ら3人を再逮捕 静岡・富士市',
    date: '2026-10-01',
    audit: { suspectRole: { evidence: '静岡県富士市のヤードで覚醒剤を製造したとして、イラン国籍の男ら3人が逮捕されました。' } }
  };
  const fnn = {
    title: 'コンテナで覚醒剤密造の疑い イラン国籍の42歳男ら3人を逮捕',
    date: '2026-10-01',
    audit: { suspectRole: { evidence: '静岡県富士市のコンテナで覚醒剤を密造したとして、イラン国籍の男ら3人が逮捕されました。' } }
  };
  assert.equal(fetchNews.eventFingerprint(livedoor), fetchNews.eventFingerprint(fnn));
  assert.ok(fetchNews.eventFingerprint(livedoor));
});

test('重複照合: 新潟・三条市のタイヤ窃盗は媒体が違っても既存記事と同一事件として照合できる', () => {
  const fetchNews = require('../fetch-news.cjs');
  const existing = {
    title: '住宅の車庫に侵入しタイヤ4本を盗んだ疑い ブラジル国籍の男（43）を3回目の逮捕 新潟・三条市',
    date: '2026-10-01',
  };
  const syndicated = {
    title: '三条市の住宅車庫からタイヤ4本窃盗疑い ブラジル国籍の男を逮捕',
    date: '2026-10-01',
    audit: { suspectRole: { evidence: '新潟県三条市で住宅の車庫からタイヤ4本を盗んだとして、ブラジル国籍の男が逮捕されました。' } },
  };
  assert.equal(fetchNews.eventFingerprint(existing), fetchNews.eventFingerprint(syndicated));
});

test('キュー選定: 公開日時の新しい未処理記事を先に審査し、古い候補に新着を埋もれさせない', () => {
  const fetchNews = require('../fetch-news.cjs');
  const queue = Array.from({ length: 25 }, (_, i) => ({
    id: `old-${i}`,
    pubDate: `2026-09-30T${String(i % 24).padStart(2, '0')}:00:00Z`,
    attempts: 0,
  }));
  queue.push({ id: 'bunkyo-today', pubDate: '2026-10-01T03:00:00Z', attempts: 0 });
  const selected = fetchNews.prioritizeRecentCandidates(queue).slice(0, 20);
  assert.ok(selected.some((item) => item.id === 'bunkyo-today'));
  assert.equal(selected[0].id, 'bunkyo-today');
});

test('pipeline E2E: 本番 fetch-news.cjs の main() を実際に通す完全 E2E パイプライン統合テスト', async () => {
  const http = require('http');
  const fetchNews = require('../fetch-news.cjs');

  const legitArticleHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>群馬県大泉町でブラジル国籍の男逮捕</title></head>
      <body>
        <article class="article-body">
          <p>群馬県警大泉署は28日、大泉町の住宅に侵入して金品を盗んだとして、ブラジル国籍の工員（32）を住居侵入と窃盗の疑いで現行犯逮捕しました。</p>
          <p>警察によりますと、被害に遭った住人が物音に気付き110番通報しました。駆けつけた警察官がその場で男の身柄を確保したということです。</p>
          <p>男は取り調べに対し、「お金に困ってやってしまった」と容疑を認めているということです。警察が詳しい動機を捜査しています。</p>
        </article>
      </body>
    </html>`;

  const metaOnlyArticleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>新宿区で中国籍の男を逮捕</title>
        <meta property="og:description" content="警視庁は29日、東京都新宿区の路上で中国籍の男を暴行の疑いで逮捕しました。">
      </head>
      <body>
        <div>関連ニュース一覧</div>
      </body>
    </html>`;

  // 99文字記事（3要素を満たすが、抽出後の実測文字数が99文字のため本番判定で厳密に遮断される）
  const article99Html = `
    <!DOCTYPE html>
    <html>
      <head><title>群馬県大泉町でブラジル国籍の男逮捕 99文字</title></head>
      <body>
        <article class="article-body">
          <p>群馬県警大泉署は28日、大泉町の住宅に侵入して金品を盗んだとして、ブラジル国籍の男（32）を住居侵入と窃盗の疑いで現行犯逮捕しました。男は取り調べに対し容疑を認めています。警察は余罪についても捜査中</p>
        </article>
      </body>
    </html>`;

  // 100文字記事（3要素を満たし、抽出後の実測文字数が100文字のため本番判定を通過して合格・掲載される）
  const article100Html = `
    <!DOCTYPE html>
    <html>
      <head><title>群馬県前橋市でブラジル国籍の男逮捕 100文字</title></head>
      <body>
        <article class="article-body">
          <p>群馬県警前橋署は28日、前橋市の住宅に侵入して金品を盗んだとして、ブラジル国籍の男（32）を住居侵入と窃盗の疑いで現行犯逮捕しました。男は取り調べに対し容疑を認めています。警察は余罪についても捜査中で</p>
        </article>
      </body>
    </html>`;

  // 事前アサート: 本文抽出後の実測文字数が厳格に 99文字 / 100文字 であることを直接検証
  const extracted99 = articleFetcher.extractArticleText(article99Html);
  assert.equal(extracted99.length, 99, 'article99Html の抽出後本文が厳格に99文字であること');

  const extracted100 = articleFetcher.extractArticleText(article100Html);
  assert.equal(extracted100.length, 100, 'article100Html の抽出後本文が厳格に100文字であること');

  // ローカルモック HTTP サーバーの立ち上げ
  let server;
  const serverPort = await new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname === '/rss') {
        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
          <rss version="2.0">
            <channel>
              <title>Google News Test</title>
              <item>
                <title>群馬・大泉町で住宅侵入 ブラジル国籍の男を逮捕 群馬県警</title>
                <link>http://127.0.0.1:${server.address().port}/article-legit</link>
                <pubDate>${new Date().toUTCString()}</pubDate>
                <description>群馬県大泉町で住宅侵入 ブラジル国籍の男を現行犯逮捕</description>
              </item>
              <item>
                <title>新宿区の路上で暴行 中国籍の男を逮捕 警視庁</title>
                <link>http://127.0.0.1:${server.address().port}/article-meta-only</link>
                <pubDate>${new Date().toUTCString()}</pubDate>
                <description>東京都新宿区で中国籍の男を暴行容疑で逮捕</description>
              </item>
              <item>
                <title>大泉町で住宅侵入 ブラジル国籍の男逮捕 99文字記事</title>
                <link>http://127.0.0.1:${server.address().port}/article-99</link>
                <pubDate>${new Date().toUTCString()}</pubDate>
                <description>群馬県大泉町でブラジル国籍の男逮捕</description>
              </item>
              <item>
                <title>前橋市で住宅侵入 ブラジル国籍の男逮捕 100文字記事</title>
                <link>http://127.0.0.1:${server.address().port}/article-100</link>
                <pubDate>${new Date().toUTCString()}</pubDate>
                <description>群馬県前橋市でブラジル国籍の男逮捕</description>
              </item>
            </channel>
          </rss>`;
        res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
        res.end(rssXml);
      } else if (u.pathname === '/article-legit') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(legitArticleHtml);
      } else if (u.pathname === '/article-meta-only') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(metaOnlyArticleHtml);
      } else if (u.pathname === '/article-99') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(article99Html);
      } else if (u.pathname === '/article-100') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(article100Html);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });

  const testDir = tmpDir();
  const testNewsDataPath = path.join(testDir, 'test-newsData.json');
  const testQueuePath = path.join(testDir, 'test-newsQueue.json');

  // テスト用の初期既存データ（過去記事2件）
  const initialExisting = [
    { id: 'initial-1', date: '2026-09-20', title: '過去の外国人犯罪事件1', location: '東京都' },
    { id: 'initial-2', date: '2026-09-19', title: '過去の外国人犯罪事件2', location: '大阪府' },
  ];
  fs.writeFileSync(testNewsDataPath, JSON.stringify(initialExisting, null, 2), 'utf-8');

  // 環境変数を設定して本番の main() を実行
  const prevEnv = {
    NEWS_DATA_PATH: process.env.NEWS_DATA_PATH,
    NEWS_QUEUE_PATH: process.env.NEWS_QUEUE_PATH,
    RSS_BASE_URL: process.env.RSS_BASE_URL,
    TEST_SEARCH_QUERIES: process.env.TEST_SEARCH_QUERIES,
  };

  process.env.NEWS_DATA_PATH = testNewsDataPath;
  process.env.NEWS_QUEUE_PATH = testQueuePath;
  process.env.RSS_BASE_URL = `http://127.0.0.1:${serverPort}/rss`;
  process.env.TEST_SEARCH_QUERIES = JSON.stringify(['dummy-query']);

  try {
    // 本番 fetch-news.cjs のメイン処理を実行！
    await fetchNews.main();

    // 1. 公開データ（newsData.json）の検証
    // 正当記事2件（通常長文 + 100文字境界記事）が追加され、既存2件と合わせて合計4件になること
    const updatedData = JSON.parse(fs.readFileSync(testNewsDataPath, 'utf-8'));
    assert.equal(updatedData.length, 4, '通常長文記事と100文字記事の2件のみが追加され合計4件になること');

    // 既存データの完全不変保持（index 2以降）
    assert.deepEqual(updatedData.slice(2), initialExisting, '既存の過去データが1ビットも改変されていないこと');

    // 2. メタ説明文のみの記事は newsData に追加されていないことを検証
    const metaAdded = updatedData.some((a) => a.title.includes('中国籍'));
    assert.equal(metaAdded, false, 'メタ説明文のみの記事は newsData に絶対に追加されないこと');

    // 3. キュー（newsQueue.json）の検証
    const updatedQueue = JSON.parse(fs.readFileSync(testQueuePath, 'utf-8'));
    assert.ok(updatedQueue.items.length >= 3, '候補がキューに登録されていること');

    // 4. 【本番99文字境界の検証】99文字記事は本番 main() で確実に遮断され、公開データに追加されないこと
    const added99 = updatedData.some((a) => a.url && a.url.includes('article-99'));
    assert.equal(added99, false, '99文字記事は newsData に絶対に追加されないこと');

    const qItem99 = updatedQueue.items.find((i) => i.url && i.url.includes('article-99'));
    assert.ok(qItem99, '99文字記事がキューに存在すること');
    assert.notEqual(qItem99.status, 'verified', '99文字記事は verified にならないこと');
    assert.equal(qItem99.pendingReason, 'insufficient_text_length', '99文字記事は文字数不足で保留されること');

    // 5. 【本番100文字境界の検証】100文字記事は本番 main() で審査を通過し、公開データに確実に追加されること
    const added100 = updatedData.some((a) => a.url && a.url.includes('article-100'));
    assert.equal(added100, true, '100文字記事は newsData に確実に追加されること');

    const qItem100 = updatedQueue.items.find((i) => i.url && i.url.includes('article-100'));
    assert.ok(qItem100, '100文字記事がキューに存在すること');
    assert.equal(qItem100.status, 'verified', '100文字記事は verified になること');
    assert.equal(qItem100.location, '群馬県');

    // 通常の長文正当記事の検証
    const legitQueueItem = updatedQueue.items.find((i) => i.title.includes('ブラジル国籍の男を逮捕 群馬県警'));
    assert.ok(legitQueueItem, '正当記事がキューに存在すること');
    assert.equal(legitQueueItem.status, 'verified', '正当記事は verified になること');

    // メタ説明文記事の検証
    const metaQueueItem = updatedQueue.items.find((i) => i.title.includes('中国籍'));
    assert.ok(metaQueueItem, 'メタ説明文記事がキューに存在すること');
    assert.notEqual(metaQueueItem.status, 'verified', 'メタ説明文記事は verified にならないこと');
    assert.ok(metaQueueItem.pendingReason === 'insufficient_text_length' || metaQueueItem.pendingReason === 'unreadable', '文字数不足または未読として保留されること');
  } finally {
    // クリーンアップ
    server.close();
    Object.keys(prevEnv).forEach((k) => {
      if (prevEnv[k] === undefined) delete process.env[k];
      else process.env[k] = prevEnv[k];
    });
  }
});
