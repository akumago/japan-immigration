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

// 外国人関与を示すキーワード（「タイ」は単体だと「タイトル」「タイム」に誤マッチするため具体化）
const FOREIGN_KEYWORDS = [
  '外国人', '外国籍', '国籍', 'ベトナム', '中国', '韓国', 'ブラジル', 'ペルー',
  'ネパール', 'フィリピン', 'タイ人', 'タイ国籍', 'タイ籍', 'クルド', '不法滞在', '不法残留', '不法入国',
  '技能実習生', 'オーバーステイ', '偽造在留カード', '在留カード', '密入国',
  'インドネシア', 'カンボジア', 'スリランカ', 'パキスタン', 'バングラデシュ', 'モンゴル', 'ナイジェリア', 'ガーナ'
];

// 犯罪・容疑を示すキーワード
const CRIME_KEYWORDS = [
  '逮捕', '容疑', '書類送検', '不法', '強盗', '窃盗', '暴行', '傷害',
  '覚醒剤', '大麻', '密売', '詐欺', '横領', 'わいせつ', '刺殺', '密輸',
  '再逮捕', 'ひき逃げ', '薬物', '風俗', '摘発', '検挙', '起訴', '送検', '指名手配', '殺人'
];

// 海外現地・国外ニュースを除外するための単語
const OVERSEAS_LOCATIONS = [
  'タイニン', 'タイの', 'タイで', 'タイ首都', '首都近郊', '韓国の', '韓国で', 'ベトナムで', 'ベトナムの',
  'アメリカの', 'アメリカで', '中国の', '中国で', '台湾の', '台湾で',
  'フィリピンの', 'フィリピンで', 'ブラジルの', 'ブラジルで', 'ソウル', 'バンコク',
  'ワシントン', '北京', 'ロンドン', 'パリ', '現地', '国外', '米軍基地', '米海兵隊',
  'インドの', 'インドで', 'ミャンマーの', 'ミャンマーで', 'カンボジアの', 'カンボジアで',
  'モロッコ', 'イランの', 'イランで', 'シリアの', 'シリアで', 'メキシコの', 'メキシコで'
];

// 国内発生を確定するキーワード（「警察」は海外の〇〇警察にもマッチするため除去し日本固有表記を追加）
const DOMESTIC_INDICATORS = [
  '日本で', '日本国内', '県警', '警視庁', '府警', '道警', '署員', '在日', '来日', '訪日', '不法就労', '不法滞在', '入管', '検察', '地方裁判所', '地裁'
];

// その他一般的な除外キーワード
const EXCLUDE_KEYWORDS = [
  '知事会', '基本法', '要請', 'まつり', '花笠', '白バイ', 'ロンドン',
  'アメリカ', '韓国警察', 'イベント', '訓練', 'サーキット', '減給処分', '知事', 'サッカー', '代表監督'
];

function fetchRSS(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchRSS(res.headers.location, redirectCount + 1));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
  });
}

function normalizeTitle(title) {
  if (!title) return '';
  return title
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/（.*?）|\(.*?\)|〈.*?〉|<.*?>|【.*?】/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

// 国内での事案かどうか判定（海外現地事案の除外）
function isDomesticCrime(title) {
  // 海外現地キーワードが含まれるか
  const isOverseasMentioned = OVERSEAS_LOCATIONS.some(loc => title.includes(loc));

  if (isOverseasMentioned) {
    // 明確に「日本で」「〇〇県警」「警視庁」「都道府県名」が含まれているか
    const hasPrefecture = PREFECTURES.some(pref => title.includes(pref) || title.includes(pref.replace(/[府県]$/, '')));
    const hasDomesticIndicator = DOMESTIC_INDICATORS.some(ind => title.includes(ind));

    // 国内を示すキーワードや都道府県が含まれていなければ国外ニュースとみなして除外
    if (!hasPrefecture && !hasDomesticIndicator) {
      return false;
    }
  }

  return true;
}

function isSameEvent(titleA, titleB) {
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);

  if (normA === normB) return true;

  // 先頭12文字の一致判定
  if (normA.length > 10 && normB.length > 10) {
    if (normA.includes(normB.substring(0, 12)) || normB.includes(normA.substring(0, 12))) {
      return true;
    }
  }

  // 数字トークンの一致判定（例: 2000万円, 26歳 などの数値特徴）
  const numbersA = (normA.match(/\d+/g) || []).join(',');
  const numbersB = (normB.match(/\d+/g) || []).join(',');

  if (numbersA && numbersA === numbersB && numbersA.length >= 2) {
    const nationalities = ['ブラジル', 'ベトナム', '中国', '韓国', 'ネパール', 'ペルー', 'タイ', 'フィリピン', 'カンボジア', 'インドネシア'];
    for (const nat of nationalities) {
      if (normA.includes(nat) && normB.includes(nat)) {
        return true;
      }
    }
  }

  // 漢字・ひらがな・カタカナの2文字以上の単語トークン比較（Jaccard係数による類似度判定）
  const wordsA = new Set(normA.match(/[\u3040-\u9faf]{2,}/g) || []);
  const wordsB = new Set(normB.match(/[\u3040-\u9faf]{2,}/g) || []);
  
  if (wordsA.size > 0 && wordsB.size > 0) {
    const intersection = [...wordsA].filter(w => wordsB.has(w));
    const union = new Set([...wordsA, ...wordsB]);
    const similarity = intersection.length / union.size;
    // 類似度が35%以上なら同一事件とみなす
    if (similarity >= 0.35) {
      return true;
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
      const isDomestic = isDomesticCrime(title);

      if (!hasForeignKw || !hasCrimeKw || hasExcludeKw || !isDomestic) {
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
  console.log('Fetching daily foreign crime news with strict domestic filtering & high coverage...');
  
  // 網羅性を高めるための11個の主要クエリ
  const searchQueries = [
    encodeURIComponent('外国人 逮捕 when:1d'),
    encodeURIComponent('外国人 容疑 when:1d'),
    encodeURIComponent('外国籍 逮捕 when:1d'),
    encodeURIComponent('ベトナム人 逮捕 when:1d'),
    encodeURIComponent('中国籍 逮捕 when:1d'),
    encodeURIComponent('ブラジル人 逮捕 when:1d'),
    encodeURIComponent('技能実習生 逮捕 when:1d'),
    encodeURIComponent('不法滞在 摘発 when:1d'),
    encodeURIComponent('不法就労 逮捕 when:1d'),
    encodeURIComponent('外国人 摘発 when:1d'),
    encodeURIComponent('外国人 書類送検 when:1d')
  ];

  let fetchedItems = [];
  let successCount = 0;

  for (const query of searchQueries) {
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ja&gl=JP&ceid=JP:ja`;
    try {
      const xml = await fetchRSS(rssUrl);
      const items = extractItemsFromRSS(xml);
      fetchedItems.push(...items);
      successCount++;
    } catch (err) {
      console.error('Failed to fetch RSS:', err.message);
    }
  }

  if (successCount === 0) {
    throw new Error('All RSS fetch attempts failed.');
  }

  // 今回取得したアイテムの重複排除
  const uniqueItems = [];
  for (const item of fetchedItems) {
    const exists = uniqueItems.some(existing => isSameEvent(existing.title, item.title));
    if (!exists) {
      uniqueItems.push(item);
    }
  }

  let existingData = [];
  if (fs.existsSync(NEWS_DATA_PATH)) {
    try {
      existingData = JSON.parse(fs.readFileSync(NEWS_DATA_PATH, 'utf-8'));
    } catch (e) {
      existingData = [];
    }
  }

  // 既存データからも海外現地ニュース・誤検出・既存重複を除去
  const cleanExisting = [];
  for (const item of existingData) {
    if (!isDomesticCrime(item.title)) {
      console.log(`Removed overseas item: ${item.title}`);
      continue;
    }
    const hasExcludeKw = EXCLUDE_KEYWORDS.some(kw => item.title.includes(kw));
    if (hasExcludeKw) {
      console.log(`Removed excluded item: ${item.title}`);
      continue;
    }
    const isDup = cleanExisting.some(ex => isSameEvent(ex.title, item.title));
    if (!isDup) {
      cleanExisting.push(item);
    }
  }

  const trulyNew = uniqueItems.filter(item => !cleanExisting.some(ex => isSameEvent(ex.title, item.title)));

  const finalMerged = [...trulyNew, ...cleanExisting].slice(0, 10000);

  fs.writeFileSync(NEWS_DATA_PATH, JSON.stringify(finalMerged, null, 2), 'utf-8');
  console.log(`Strictly filtered & updated newsData.json! Total clean domestic entries: ${finalMerged.length}`);
}

main().catch(err => {
  console.error('Fatal error during news update:', err);
  process.exit(1);
});
