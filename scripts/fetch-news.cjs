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

// 外国人関与を示すキーワード（単体の「タイ」は誤判定防止のため「タイ人」「タイ国籍」等に限定）
const FOREIGN_KEYWORDS = [
  '外国人', '外国籍', '国籍',
  'ベトナム', '中国', '韓国', 'ブラジル', 'ペルー',
  'ネパール', 'フィリピン', 'タイ人', 'タイ国籍', 'タイ籍', 'クルド',
  'インドネシア', 'カンボジア', 'スリランカ', 'パキスタン', 'バングラデシュ', 'モンゴル', 'ナイジェリア', 'ガーナ',
  'トルコ', 'ミャンマー', 'イラン',
  '不法滞在', '不法残留', '不法入国', '密入国', 'オーバーステイ',
  '技能実習生', '元技能実習生', '特定技能', '留学生', '元留学生', '仮放免',
  '偽造在留カード', '在留カード', '不法就労助長'
];

// 代表的国籍リスト（エンティティ重複チェック用）
const NATIONALITIES = [
  'ベトナム', '中国', '韓国', 'ブラジル', 'ペルー', 'ネパール', 'フィリピン', 'タイ',
  'インドネシア', 'カンボジア', 'スリランカ', 'パキスタン', 'バングラデシュ', 'モンゴル',
  'ナイジェリア', 'ガーナ', 'トルコ', 'ミャンマー', 'イラン', 'クルド'
];

// 犯罪・容疑を示すキーワード
const CRIME_KEYWORDS = [
  '逮捕', '容疑', '書類送検', '不法', '強盗', '窃盗', '暴行', '傷害',
  '覚醒剤', '大麻', '密売', '詐欺', '横領', 'わいせつ', '刺殺', '密輸',
  '再逮捕', 'ひき逃げ', '薬物', '風俗', '摘発', '検挙', '起訴', '送検',
  '指名手配', '殺人', '追送検', '逮捕状', '退去強制', '強制送還', '不法就労助長',
  '資格外活動', '偽装滞在'
];

// 代表的犯罪種別（エンティティ重複チェック用）
const CRIME_TYPES = [
  '窃盗', '強盗', '詐欺', '覚醒剤', '大麻', '薬物', '不法滞在', '不法残留', '不法就労',
  '傷害', '暴行', '殺人', 'わいせつ', '密輸', '風俗', '万引き', '横領', '事故'
];

// 海外現地・国外ニュースを除外するための単語
const OVERSEAS_LOCATIONS = [
  'タイニン', 'タイの', 'タイで', 'タイ首都', '首都近郊', '韓国の', '韓国で', 'ベトナムで', 'ベトナムの',
  'アメリカの', 'アメリカで', '中国の', '中国で', '台湾の', '台湾で',
  'フィリピンの', 'フィリピンで', 'ブラジルの', 'ブラジルで', 'ソウル', 'バンコク',
  'ワシントン', '北京', 'ロンドン', 'パリ', '現地', '国外', '米軍基地', '米海兵隊',
  'インドの', 'インドで', 'ミャンマーの', 'ミャンマーで', 'カンボジアの', 'カンボジアで',
  'モロッコ', 'イランの', 'イランで', 'シリアの', 'シリアで', 'メキシコの', 'メキシコで',
  'トルコの', 'トルコで', 'イスラエルの', 'イスラエルで', 'ドイツの', 'ドイツで',
  'マレーシアの', 'マレーシアで', 'オーストラリアの', 'オーストラリアで',
  '海外', '渡航先'
];

// 国内発生を確定するキーワード
const DOMESTIC_INDICATORS = [
  '日本で', '日本国内', '県警', '警視庁', '府警', '道警', '署員', '在日', '来日', '訪日', '不法就労', '不法滞在', '入管', '検察', '地方裁判所', '地裁'
];

// その他一般的な除外キーワード
const EXCLUDE_KEYWORDS = [
  '知事会', '基本法', '要請', 'まつり', '花笠', '白バイ', 'ロンドン',
  'アメリカ', '韓国警察', '現地警察', '現地当局', 'FBI', '国際指名手配',
  'イベント', '訓練', 'サーキット', '減給処分', '知事', 'サッカー', '代表監督'
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
  const isOverseasMentioned = OVERSEAS_LOCATIONS.some(loc => title.includes(loc));

  if (isOverseasMentioned) {
    const hasPrefecture = PREFECTURES.some(pref => title.includes(pref) || title.includes(pref.replace(/[府県]$/, '')));
    const hasDomesticIndicator = DOMESTIC_INDICATORS.some(ind => title.includes(ind));

    if (!hasPrefecture && !hasDomesticIndicator) {
      return false;
    }
  }

  return true;
}

// エンティティ抽出キー（日付_国籍_犯罪種別）
function getEntityKey(item) {
  const norm = normalizeTitle(item.title);
  const nat = NATIONALITIES.find(n => norm.includes(n.toLowerCase())) || 'その他';
  const crime = CRIME_TYPES.find(c => norm.includes(c.toLowerCase())) || '事件';
  return `${item.date}_${nat}_${crime}`;
}

// 通信社・転載メディア優先判定（一次報道・地方紙を優先）
function getMediaPriority(media) {
  if (!media) return 1;
  if (media.includes('Yahoo') || media.includes('goo') || media.includes('dメニュー') || media.includes('au')) {
    return 1; // 転載ポータル
  }
  return 2; // 一次報道・地方紙・新聞
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

  // 数字トークンの一致判定
  const numbersA = (normA.match(/\d+/g) || []).join(',');
  const numbersB = (normB.match(/\d+/g) || []).join(',');

  if (numbersA && numbersA === numbersB && numbersA.length >= 2) {
    for (const nat of NATIONALITIES) {
      if (normA.includes(nat) && normB.includes(nat)) {
        return true;
      }
    }
  }

  // 漢字・ひらがな・カタカナの2文字以上の単語トークン比較（Jaccard係数）
  const wordsA = new Set(normA.match(/[\u3040-\u9faf]{2,}/g) || []);
  const wordsB = new Set(normB.match(/[\u3040-\u9faf]{2,}/g) || []);

  if (wordsA.size > 0 && wordsB.size > 0) {
    const intersection = [...wordsA].filter(w => wordsB.has(w));
    const union = new Set([...wordsA, ...wordsB]);
    const similarity = intersection.length / union.size;
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
  console.log('Fetching daily foreign crime news with 19 optimized queries & 3-layer deduplication...');

  // 19本の完全網羅化検索クエリ
  const searchQueries = [
    encodeURIComponent('外国人 逮捕 when:1d'),
    encodeURIComponent('外国人 容疑 when:1d'),
    encodeURIComponent('外国籍 逮捕 when:1d'),
    encodeURIComponent('外国人 書類送検 OR 追送検 when:1d'),
    encodeURIComponent('外国人 摘発 OR 指名手配 when:1d'),
    encodeURIComponent('ベトナム 逮捕 OR 摘発 when:1d'),
    encodeURIComponent('中国籍 OR 中国人 逮捕 when:1d'),
    encodeURIComponent('ブラジル 逮捕 OR 摘発 when:1d'),
    encodeURIComponent('タイ人 OR タイ国籍 逮捕 when:1d'),
    encodeURIComponent('フィリピン人 逮捕 OR 摘発 when:1d'),
    encodeURIComponent('インドネシア 逮捕 OR 摘発 when:1d'),
    encodeURIComponent('スリランカ OR カンボジア OR ネパール 逮捕 when:1d'),
    encodeURIComponent('韓国人 OR 韓国籍 逮捕 when:1d'),
    encodeURIComponent('技能実習生 OR 元技能実習生 OR 特定技能 逮捕 when:1d'),
    encodeURIComponent('仮放免 逮捕 OR 容疑 when:1d'),
    encodeURIComponent('不法滞在 OR 不法残留 OR オーバーステイ 逮捕 OR 摘発 when:1d'),
    encodeURIComponent('不法就労助長 逮捕 OR 容疑 when:1d'),
    encodeURIComponent('退去強制 OR 強制送還 when:1d'),
    encodeURIComponent('不法就労 逮捕 OR 摘発 when:1d')
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

  // --- 重複排除層1 & 2: 今回取得アイテムの統合 ---
  const uniqueItems = [];
  for (const item of fetchedItems) {
    const isDup = uniqueItems.some(existing => isSameEvent(existing.title, item.title));
    if (!isDup) {
      uniqueItems.push(item);
    } else {
      // メディア優先度が高い方を保持
      const idx = uniqueItems.findIndex(existing => isSameEvent(existing.title, item.title));
      if (idx !== -1 && getMediaPriority(item.media) > getMediaPriority(uniqueItems[idx].media)) {
        uniqueItems[idx] = item;
      }
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

  // --- 重複排除層3: 既存データのクリーンアップ ---
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
