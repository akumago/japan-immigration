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

// 外国人関与を示すキーワード
const FOREIGN_KEYWORDS = [
  '外国人', '外国籍', '国籍', 'ベトナム', '中国', '韓国', 'ブラジル', 'ペルー',
  'ネパール', 'フィリピン', 'タイ', 'クルド', '不法滞在', '不法残留', '不法入国',
  '技能実習生', 'オーバーステイ', '偽造在留カード', '在留カード', '密入国'
];

// 犯罪・容疑を示すキーワード
const CRIME_KEYWORDS = [
  '逮捕', '容疑', '書類送検', '不法', '強盗', '窃盗', '暴行', '傷害',
  '覚醒剤', '大麻', '密売', '詐欺', '横領', 'わいせつ', '刺殺', '密輸',
  '再逮捕', 'ひき逃げ', '薬物', '風俗'
];

// 除外キーワード
const EXCLUDE_KEYWORDS = [
  '知事会', '基本法', '要請', 'まつり', '花笠', '白バイ', 'ロンドン',
  'アメリカ', '韓国警察', 'イベント', '訓練', 'サーキット', '減給処分', '知事'
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

// タイトルの標準化（全角→半角、カッコ内表記の削除）
function normalizeTitle(title) {
  if (!title) return '';
  return title
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/（.*?）|\(.*?\)|〈.*?〉|<.*?>|【.*?】/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

// 同一事件かどうかの判定（コアとなる名詞・数値の重なり具合を比較）
function isSameEvent(titleA, titleB) {
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);

  if (normA === normB) return true;

  // 15文字以上共通している場合は同一事件とみなす
  if (normA.length > 10 && normB.length > 10) {
    if (normA.includes(normB.substring(0, 12)) || normB.includes(normA.substring(0, 12))) {
      return true;
    }
  }

  // 数字・固有名詞などの主要部分の一致度チェック
  const numbersA = (normA.match(/\d+/g) || []).join(',');
  const numbersB = (normB.match(/\d+/g) || []).join(',');

  if (numbersA && numbersA === numbersB) {
    // 同じ数値（例: 2000万, 3000万, 91歳等）が含まれ、容疑者国籍が合致
    const nationalities = ['ブラジル', 'ベトナム', '中国', '韓国', 'ネパール', 'ペルー', 'タイ', 'フィリピン'];
    for (const nat of nationalities) {
      if (normA.includes(nat) && normB.includes(nat)) {
        return true;
      }
    }
  }

  return false;
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

      rawTitle = rawTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

      let media = '新聞・報道';
      let title = rawTitle;
      const mediaMatch = rawTitle.match(/^(.*)\s*-\s*([^-]+)$/);
      if (mediaMatch) {
        title = mediaMatch[1].trim();
        media = mediaMatch[2].trim();
      }

      const hasForeignKw = FOREIGN_KEYWORDS.some(kw => title.includes(kw));
      const hasCrimeKw = CRIME_KEYWORDS.some(kw => title.includes(kw));
      const hasExcludeKw = EXCLUDE_KEYWORDS.some(kw => title.includes(kw));

      if (!hasForeignKw || !hasCrimeKw || hasExcludeKw) {
        continue;
      }

      let location = '全国';
      for (const pref of PREFECTURES) {
        if (title.includes(pref) || title.includes(pref.replace(/[府県]$/, ''))) {
          location = pref;
          break;
        }
      }

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
        summary: `${location}で発生した外国人関与の事件・容疑に関する報道速報です。`
      });
    }
  }
  return items;
}

async function main() {
  console.log('Fetching daily foreign crime news with advanced deduplication...');
  const searchQueries = [
    encodeURIComponent('外国人 逮捕 when:1d'),
    encodeURIComponent('外国人 容疑 when:1d'),
    encodeURIComponent('外国籍 逮捕 when:1d')
  ];

  let fetchedItems = [];

  for (const query of searchQueries) {
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ja&gl=JP&ceid=JP:ja`;
    try {
      const xml = await fetchRSS(rssUrl);
      const items = extractItemsFromRSS(xml);
      fetchedItems.push(...items);
    } catch (err) {
      console.error('Failed to fetch RSS:', err.message);
    }
  }

  // 取得したニュース内での同一事件重複排除
  const uniqueItems = [];
  for (const item of fetchedItems) {
    const exists = uniqueItems.some(existing => isSameEvent(existing.title, item.title));
    if (!exists) {
      uniqueItems.push(item);
    }
  }

  console.log(`Extracted ${uniqueItems.length} unique crime event items today.`);

  // 既存データベースとのマージ＆重複排除
  let existingData = [];
  if (fs.existsSync(NEWS_DATA_PATH)) {
    try {
      existingData = JSON.parse(fs.readFileSync(NEWS_DATA_PATH, 'utf-8'));
    } catch (e) {
      existingData = [];
    }
  }

  // 全既存データに対しても同様に同義事件のクリーンアップを実施
  const cleanExisting = [];
  for (const item of existingData) {
    const isDup = cleanExisting.some(ex => isSameEvent(ex.title, item.title));
    if (!isDup) {
      cleanExisting.push(item);
    }
  }

  // 新規追加記事の判定
  const trulyNew = uniqueItems.filter(item => !cleanExisting.some(ex => isSameEvent(ex.title, item.title)));

  const finalMerged = [...trulyNew, ...cleanExisting].slice(0, 10000);

  fs.writeFileSync(NEWS_DATA_PATH, JSON.stringify(finalMerged, null, 2), 'utf-8');
  console.log(`Deduplicated & updated newsData.json! Total clean entries: ${finalMerged.length}`);
}

main().catch(err => console.error(err));
