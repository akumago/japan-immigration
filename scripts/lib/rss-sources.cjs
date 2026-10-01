'use strict';

// Independently maintained, publisher-provided RSS feeds. Google News remains
// one discovery source; these feeds are fetched directly and health-checked.
// Yahoo's official help describes topical/category RSS; NNN explicitly publishes
// its RSS URL; NHK and FNN feed URLs are publisher feed endpoints.
const RSS_SOURCES = [
  { id: 'yahoo-domestic', name: 'Yahoo!ニュース 国内', url: 'https://news.yahoo.co.jp/rss/topics/domestic.xml', media: 'Yahoo!ニュース' },
  { id: 'yahoo-local', name: 'Yahoo!ニュース 地域', url: 'https://news.yahoo.co.jp/rss/topics/local.xml', media: 'Yahoo!ニュース' },
  { id: 'nhk-social', name: 'NHK 社会', url: 'https://www.nhk.or.jp/rss/news/cat1.xml', media: 'NHKニュース' },
  { id: 'nhk-top', name: 'NHK 主要', url: 'https://www.nhk.or.jp/rss/news/cat0.xml', media: 'NHKニュース' },
  { id: 'nnn-latest', name: '日テレNEWS NNN', url: 'https://news.ntv.co.jp/rss/index.rdf', media: '日テレNEWS NNN' },
  { id: 'fnn-latest', name: 'FNNプライムオンライン', url: 'https://www.fnn.jp/list/feed/rss', media: 'FNNプライムオンライン' },
];

const YAHOO_RSS_CATALOG = 'https://news.yahoo.co.jp/rss/';
const LOCAL_MEDIA_NAME_RE = /新聞|放送|テレビ|ＴＶ|TV|通信社|通信|民報|民友|日報|新報|地方|地域|県紙|道新|みんなの経済新聞/i;
const NON_NEWS_TV_RE = /ALBA TV|TV LIFE|TVガイド|ザテレビジョン|韓国TVドラマ/i;

function decodeHtml(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function parseYahooMediaCatalog(html) {
  const feeds = [];
  const seen = new Set();
  const re = /<a\b[^>]*href=["']([^"']*\/rss\/media\/([a-z0-9_-]+)\/all\.xml)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const id = match[2].toLowerCase();
    const name = decodeHtml(match[3].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!name || seen.has(id) || NON_NEWS_TV_RE.test(name) || !LOCAL_MEDIA_NAME_RE.test(name)) continue;
    seen.add(id);
    feeds.push({
      id: `yahoo-media-${id}`,
      name,
      media: name,
      url: `https://news.yahoo.co.jp/rss/media/${id}/all.xml`,
    });
  }
  return feeds.sort((a, b) => a.id.localeCompare(b.id));
}

function selectYahooMediaShard(sources, { now = Date.now(), shardCount = 2 } = {}) {
  const hour = Math.floor(now / 3_600_000);
  const shard = ((hour % shardCount) + shardCount) % shardCount;
  return sources.filter((_, index) => index % shardCount === shard);
}

async function collectOfficialRss(fetchFeed, parseFeed, { sources = RSS_SOURCES, pause = async () => {}, logger = console, stopOnRateLimit = false } = {}) {
  const items = [];
  const status = [];
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    try {
      const xml = await fetchFeed(source.url);
      if (!/<(?:rss|rdf:RDF)\b/i.test(String(xml))) throw new Error('invalid_rss_document');
      const parsed = parseFeed(xml);
      const sourceItems = parsed.map((item) => ({
        ...item,
        media: item.media === '新聞・報道' ? source.media : item.media,
        sourceId: source.id,
        sourceType: 'publisher_rss',
      }));
      items.push(...sourceItems);
      status.push({ id: source.id, ok: true, candidates: sourceItems.length });
      logger.log?.(`📡 ${source.name} RSS: ${sourceItems.length} 件の候補`);
    } catch (err) {
      status.push({ id: source.id, ok: false, error: err.message });
      logger.error?.(`公式RSS取得失敗 ${source.id}: ${err.message}`);
      if (stopOnRateLimit && /HTTP (?:403|429)/i.test(err.message)) {
        for (const skipped of sources.slice(i + 1)) status.push({ id: skipped.id, ok: false, error: 'circuit_breaker_skipped' });
        break;
      }
    }
    await pause();
  }
  return { items, status };
}

module.exports = { RSS_SOURCES, YAHOO_RSS_CATALOG, LOCAL_MEDIA_NAME_RE, NON_NEWS_TV_RE, parseYahooMediaCatalog, selectYahooMediaShard, collectOfficialRss };
