const fs = require('fs');
const path = require('path');
const https = require('https');

const NEWS_DATA_PATH = path.join(__dirname, '../data/newsData.json');

// 都道府県リスト（地域特定用）
const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
  });
}

function extractItemsFromRSS(xml) {
  const items = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    if (titleMatch && linkMatch) {
      let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
      let link = linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
      let pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toUTCString();

      // HTMLエンティティデコード
      rawTitle = rawTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

      // メディア名の抽出（例: "タイトル - 埼玉新聞"）
      let media = '新聞・報道';
      let title = rawTitle;
      const mediaMatch = rawTitle.match(/^(.*)\s*-\s*([^-]+)$/);
      if (mediaMatch) {
        title = mediaMatch[1].trim();
        media = mediaMatch[2].trim();
      }

      // 都道府県の判定
      let location = '全国';
      for (const pref of PREFECTURES) {
        if (title.includes(pref) || title.includes(pref.replace(/[府県]$/, ''))) {
          location = pref;
          break;
        }
      }

      // 日付のフォーマット (YYYY-MM-DD)
      const parsedDate = new Date(pubDate);
      const dateStr = !isNaN(parsedDate.getTime()) 
        ? parsedDate.toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0];

      items.push({
        id: Buffer.from(title).toString('base64').substring(0, 16),
        title: title,
        date: dateStr,
        location: location,
        media: media,
        url: link,
        summary: `${media}等で報道された外国人容疑者の事件・逮捕に関する速報データ。`
      });
    }
  }
  return items;
}

async function main() {
  console.log('Fetching daily foreign crime news...');
  const searchQueries = [
    encodeURIComponent('外国人 逮捕 when:1d'),
    encodeURIComponent('外国人 容疑 when:1d')
  ];

  let newEntries = [];

  for (const query of searchQueries) {
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ja&gl=JP&ceid=JP:ja`;
    try {
      const xml = await fetchRSS(rssUrl);
      const items = extractItemsFromRSS(xml);
      newEntries.push(...items);
    } catch (err) {
      console.error('Failed to fetch RSS:', err.message);
    }
  }

  // 重複排除 (ID または タイトル)
  const uniqueMap = new Map();
  newEntries.forEach(item => uniqueMap.set(item.title, item));
  const uniqueItems = Array.from(uniqueMap.values());

  if (uniqueItems.length === 0) {
    console.log('No new items found today.');
    return;
  }

  // 既存データとマージ
  let existingData = [];
  if (fs.existsSync(NEWS_DATA_PATH)) {
    try {
      existingData = JSON.parse(fs.readFileSync(NEWS_DATA_PATH, 'utf-8'));
    } catch (e) {
      existingData = [];
    }
  }

  const existingTitles = new Set(existingData.map(d => d.title));
  const trulyNewItems = uniqueItems.filter(item => !existingTitles.has(item.title));

  console.log(`Found ${trulyNewItems.length} newly reported items.`);

  const mergedData = [...trulyNewItems, ...existingData].slice(0, 30); // 直近30件を保持

  fs.writeFileSync(NEWS_DATA_PATH, JSON.stringify(mergedData, null, 2), 'utf-8');
  console.log('Successfully updated newsData.json!');
}

main().catch(err => console.error(err));
