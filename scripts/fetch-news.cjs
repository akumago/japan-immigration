const fs = require('fs');
const path = require('path');
const https = require('https');

const NEWS_DATA_PATH = path.join(__dirname, '../data/newsData.json');

// 都道府県リスト
const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

// 主要市町村名・地域名・警察署名・主要施設から都道府県への高精度マッピング辞書
const MUNICIPALITY_MAP = {
  // 北海道・東北
  '札幌': '北海道', '函館': '北海道', '旭川': '北海道', '釧路': '北海道', '帯広': '北海道', '苫小牧': '北海道', '小樽': '北海道', '北見': '北海道',
  '青森': '青森県', '八戸': '青森県', '弘前': '青森県',
  '盛岡': '岩手県', '奥州': '岩手県', '一関': '岩手県',
  '仙台': '宮城県', '石巻': '宮城県', '気仙沼': '宮城県', '名取': '宮城県', '大崎': '宮城県',
  '秋田': '秋田県', '横手': '秋田県',
  '山形': '山形県', '鶴岡': '山形県', '酒田': '山形県', '天童': '山形県',
  '福島': '福島県', '郡山': '福島県', 'いわき': '福島県', '会津若松': '福島県',

  // 関東
  '水戸': '茨城県', 'つくば': '茨城県', '日立': '茨城県', '土浦': '茨城県', '神栖': '茨城県', '足利': '栃木県', '宇都宮': '栃木県', '小山': '栃木県',
  '前橋': '群馬県', '高崎': '群馬県', '太田': '群馬県', '伊勢崎': '群馬県',
  'さいたま': '埼玉県', '川口': '埼玉県', '川越': '埼玉県', '越谷': '埼玉県', '所沢': '埼玉県', '熊谷': '埼玉県', '飯能': '埼玉県',
  '千葉': '千葉県', '船橋': '千葉県', '松戸': '千葉県', '柏': '千葉県', '市川': '千葉県', '木更津': '千葉県', '成田': '千葉県', '流山': '千葉県',
  '浅草橋': '東京都', '羽田': '東京都', '大田区': '東京都', '新宿': '東京都', '渋谷': '東京都', '池袋': '東京都', '足立': '東京都', '江戸川': '東京都', '八王子': '東京都', '町田': '東京都',
  '横浜': '神奈川県', '川崎': '神奈川県', '相模原': '神奈川県', '横須賀': '神奈川県', '藤沢': '神奈川県', '平塚': '神奈川県',

  // 中部・北陸
  '新潟': '新潟県', '長岡': '新潟県', '上越': '新潟県',
  '富山': '富山県', '高岡': '富山県', '氷見': '富山県', '魚津': '富山県',
  '金沢': '石川県', '小松': '石川県',
  '福井': '福井県', '敦賀': '福井県',
  '甲府': '山梨県', '笛吹': '山梨県',
  '長野': '長野県', '松本': '長野県', '上田': '長野県',
  '岐阜': '岐阜県', '大垣': '岐阜県', '各務原': '岐阜県',
  '静岡': '静岡県', '浜松': '静岡県', '沼津': '静岡県', '富士': '静岡県', '天竜': '静岡県',
  '名古屋': '愛知県', '豊橋': '愛知県', '岡崎': '愛知県', '一宮': '愛知県', '豊田': '愛知県', '豊川': '愛知県',
  '津': '三重県', '四日市': '三重県', '伊勢': '三重県', '名張': '三重県', '鈴鹿': '三重県', '亀山': '三重県',

  // 近畿
  '大津': '滋賀県', '草津': '滋賀県',
  '京都': '京都府', '宇治': '京都府', '舞鶴': '京都府',
  '大阪': '大阪府', '堺': '大阪府', '東大阪': '大阪府', '枚方': '大阪府', '豊中': '大阪府', 'ミナミ': '大阪府', '難波': '大阪府', '天王寺': '大阪府', 'あべちか': '大阪府', '鶴見': '大阪府',
  '神戸': '兵庫県', '姫路': '兵庫県', '尼崎': '兵庫県', '西宮': '兵庫県', '明石': '兵庫県', '加古川': '兵庫県', '洲本': '兵庫県',
  '奈良': '奈良県', '橿原': '奈良県',
  '和歌山': '和歌山県', '田辺': '和歌山県',

  // 中国・四国
  '鳥取': '鳥取県', '米子': '鳥取県',
  '松江': '島根県', '出雲': '島根県',
  '岡山': '岡山県', '倉敷': '岡山県',
  '広島': '広島県', '福山': '広島県', '呉': '広島県',
  '山口': '山口県', '下関': '山口県', '宇部': '山口県',
  '徳島': '徳島県', '鳴門': '徳島県',
  '高松': '香川県', '丸亀': '香川県', '観音寺': '香川県',
  '松山': '愛媛県', '今治': '愛媛県', '新居浜': '愛媛県',
  '高知': '高知県', '南国': '高知県',

  // 九州・沖縄
  '福岡': '福岡県', '北九州': '福岡県', '久留米': '福岡県', '飯塚': '福岡県',
  '佐賀': '佐賀県', '唐津': '佐賀県', '鳥栖': '佐賀県',
  '長崎': '長崎県', '佐世保': '長崎県',
  '熊本': '熊本県', '八代': '熊本県',
  '大分': '大分県', '別府': '大分県',
  '宮崎': '宮崎県', '都城': '宮崎県',
  '鹿児島': '鹿児島県', '霧島': '鹿児島県', '鹿屋': '鹿児島県',
  '那覇': '沖縄県', '沖縄': '沖縄県', 'うるま': '沖縄県', '宮古島': '沖縄県', '石垣': '沖縄県'
};

// 外国人関与を示すキーワード
const FOREIGN_KEYWORDS = [
  '外国人', '外国籍', '国籍',
  'ベトナム', '中国', '韓国', 'ブラジル', 'ペルー',
  'ネパール', 'フィリピン', 'タイ人', 'タイ国籍', 'タイ籍', 'クルド',
  'インドネシア', 'カンボジア', 'スリランカ', 'パキスタン', 'バングラデシュ', 'モンゴル', 'ナイジェリア', 'ガーナ',
  'トルコ', 'ミャンマー', 'イラン', 'アルゼンチン', 'コロンビア', 'フランス', 'メキシコ', 'エジプト',
  '不法滞在', '不法残留', '不法入国', '密入国', 'オーバーステイ',
  '技能実習生', '元技能実習生', '特定技能', '留学生', '元留学生', '仮放免',
  '偽造在留カード', '在留カード', '不法就労助長'
];

// 代表的国籍リスト
const NATIONALITIES = [
  'ベトナム', '中国', '韓国', 'ブラジル', 'ペルー', 'ネパール', 'フィリピン', 'タイ',
  'インドネシア', 'カンボジア', 'スリランカ', 'パキスタン', 'バングラデシュ', 'モンゴル',
  'ナイジェリア', 'ガーナ', 'トルコ', 'ミャンマー', 'イラン', 'クルド',
  'アルゼンチン', 'コロンビア', 'フランス', 'メキシコ', 'エジプト'
];

// 犯罪・容疑を示すキーワード
const CRIME_KEYWORDS = [
  '逮捕', '容疑', '書類送検', '不法', '強盗', '窃盗', '暴行', '傷害',
  '覚醒剤', '大麻', 'コカイン', '麻薬', '密売', '詐欺', '横領', 'わいせつ', '刺殺', '密輸',
  '再逮捕', 'ひき逃げ', '危険運転', '薬物', '風俗', '摘発', '検挙', '起訴', '送検',
  '指名手配', '殺人', '追送検', '逮捕状', '退去強制', '強制送還', '不法就労助長',
  '資格外活動', '偽装滞在'
];

// 代表的特筆事象（同一事件のキーワードクロス判定用）
const EVENT_FEATURE_KEYWORDS = [
  ['豊川', '豊川市民病院', '市民病院', 'イラン人遺棄', '遺体を遺棄', '死体遺棄'],
  ['あべちか', '天王寺', '地下街'],
  ['コカイン', '麻薬', '101個', '飲み込', '体内に隠', 'アルゼンチン'],
  ['トカゲ', 'アオキノボリアリゲータートカゲ', '靴下', '200匹', 'メキシコ'],
  ['強盗殺人未遂', '強殺未遂', '強盗殺人', '強殺', 'バッグ奪', 'カバン奪', '強盗', '410万円'],
  ['刺傷', '刺され', '刺し', '刺殺', '切りつけ', '刃物', 'ナイフ'],
  ['死体遺棄', '遺体遺棄', '山林遺棄', '高齢女性遺体', '女性遺体', '遺体'],
  ['空き家', '邸宅侵入', '空き巣', '指輪', '450件'],
  ['営利略取', '押し込', '車に押し込', '監禁', '連れ去り'],
  ['偽物', '偽ブランド', 'ルイ・ヴィトン', '商標法'],
  ['不法就労', '不法在留', '在留資格超え', '週28時間', '虚偽申告', '労働時間', '解体工事'],
  ['銅線', 'ケーブル', '太陽光', '金属', '金属盗'],
  ['風俗', 'メンズエステ', '性風俗', '禁止区域'],
  ['大麻', '覚醒剤', 'ケタミン', '薬物'],
  ['SUV', '高級車', 'レクサス', '自動車盗'],
  ['自転車', '酒酔い', '蛇行'],
  ['ニセ警察官', '受け子', '特殊詐欺', '出し子', '回収役', '50万円', '570万円', '1051万円', '3600万円', 'かけ子', 'カンボジアに派遣'],
  ['わいせつ', '胸', '性犯罪'],
  ['不法滞在', 'オーバーステイ', '不法残留'],
  ['万引き', 'スニーカー', '窃盗'],
  ['ひき逃げ', '危険運転', '多重事故', '過失運転', '人身事故']
];

// 海外現地・国外ニュースを除外するための単語
const OVERSEAS_LOCATIONS = [
  'タイニン', 'タイの', 'タイで', 'タイ首都', '首都近郊', '韓国の', '韓国で', 'ベトナムで', 'ベトナムの',
  'アメリカの', 'アメリカで', '中国の', '中国で', '台湾の', '台湾で',
  'フィリピンの', 'フィリピンで', 'ブラジルの', 'ブラジルで', 'ソウル', 'バンコク',
  'ワシントン', '北京', 'ロンドン', 'パリ', '現地', '国外', '米軍基地', '米海兵隊',
  'インドの', 'インドで', 'ミャンマーの', 'ミャンマーで', 'カンボジアの', 'カンボジアで', 'インドネシアの', 'インドネシアで',
  'モロッコ', 'イランの', 'イランで', 'シリアの', 'シリアで', 'メキシコの', 'メキシコで',
  'トルコの', 'トルコで', 'イスラエルの', 'イスラエルで', 'ドイツの', 'ドイツで',
  'マレーシアの', 'マレーシアで', 'オーストラリアの', 'オーストラリアで',
  '海外', '渡航先',
  'ホアヒン', 'パタヤ', 'チェンマイ', 'プーケット', 'ラヨーン', 'セブ', 'バリ', 'グアム', 'ハワイ',
  'カリフォルニア', 'テキサス', 'フロリダ', 'ロサンゼルス', 'シカゴ',
  'マカオ', 'ラオス', '英国', '米国', 'ドンムアン', 'ホーチミン', 'ハノイ',
  'プノンペン', 'ジャカルタ', 'マニラ', 'クアラルンプール', 'ニューヨーク',
  'シンガポール', '上海', '香港', '台北', '深圳', 'ムンバイ',
  'ヤンゴン', 'ダッカ', 'カラチ', 'リヤド', 'ドバイ', 'テルアビブ',
  'モスクワ', 'キーウ', 'ベルリン', 'ローマ', 'マドリード', 'シドニー',
  'スワンナプーム', '仁川', '桃園', 'ヒースロー', 'JFK',
  'Reform UK', '超法規的', 'インドへ出国'
];

// 国内発生を確定するキーワード（日本の警察組織・裁判所・行政・法令・制度・報道用語）
const DOMESTIC_INDICATORS = [
  '日本で', '日本国内', '県警', '警視庁', '府警', '道警', '署員', '警察署',
  '在日', '来日', '訪日', '不法就労', '不法残留', '検察',
  '地方裁判所', '地裁', '署が', '署に', '署は',
  '地検', '簡裁', '高裁', '逮捕した', '逮捕され', '容疑で逮捕',
  '現行犯逮捕', '緊急逮捕', '送検した', '書類送検', '追送検',
  '東京税関', '税関', '麻薬取締部', 'マトリ', '海上保安部', '海保',
  '風営法', '出入国管理', '入管難民法', '入管法', '金属盗対策法', '暴処法', '麻薬及び向精神薬取締法',
  '技能実習', '特定技能', '仮放免', 'オーバーステイ', '偽造在留カード', '在留カード',
  '不法就労助長', '資格外活動'
];

// 除外キーワード
const EXCLUDE_KEYWORDS = [
  '知事会', '基本法', '要請', 'まつり', '花笠', '白バイ', 'ロンドン',
  'アメリカ', '韓国警察', '現地警察', '現地当局', 'FBI', '国際指名手配',
  'イベント', '訓練', 'サーキット', '減給処分', '知事', 'サッカー', '代表監督',
  '中国ネット', '強制送還され'
];

// 海外メディア名リスト
const OVERSEAS_MEDIA = [
  'Vietnam.vn', 'Laodong.vn', 'ENTREVUE.FR', 'arabnews', 'Reuters',
  'AP通信', 'AFP', 'タイランドハイパーリンクス', 'タイニュース', 'クロスボンバー', 'bomberth',
  'VnExpress', 'Tuoi Tre', 'The Guardian', 'BBC', 'CNN', 'New York Times',
  'Washington Post', 'South China Morning Post', 'Yonhap', 'Channel News Asia'
];

// 国名リスト
const COUNTRY_NAMES = [
  'パキスタン', 'インド', 'ミャンマー', 'カンボジア', 'モロッコ',
  'イラン', 'シリア', 'メキシコ', 'トルコ', 'イスラエル',
  'ドイツ', 'マレーシア', 'オーストラリア', 'ロシア', 'ウクライナ',
  'タイ', 'フィリピン', 'ベトナム', '中国', '韓国', 'ブラジル',
  'ペルー', 'ネパール', 'スリランカ', 'バングラデシュ',
  'インドネシア', 'ナイジェリア', 'ガーナ', 'アフガニスタン',
  '北朝鮮', 'エジプト', 'サウジアラビア', 'イラク', 'コロンビア',
  'ラオス', 'マカオ', '英国', '米国', 'アルゼンチン', 'フランス'
];

// 文末の海外国名略称および通信社海外発信パターンの正規表現
const OVERSEAS_TAIL_REGEX = /(?:[\s　](?:米|英|仏|独|伊|露|豪|中|韓|タイ|比|越|印|伯|加|欧州|EU)|【(?:韓国|中国|米国|アメリカ|タイ|ベトナム|フランス|英国|ドイツ|ロシア)】|[、,]\s*(?:韓国|中国|タイ|ベトナム|アメリカ).*)$/;
const OVERSEAS_PREFIX_REGEX = /【(ワシントン|ニューヨーク|ロンドン|パリ|北京|ソウル|バンコク|ハノイ|マニラ|シドニー|モスクワ|ベルリン|プーケット).*?】/;

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

// 高精度地域判定関数（市町村名・警察署名・都道府県名を全面解析）
function detectLocation(title) {
  // 1. まず直接の「〇〇県」「〇〇府」「東京都」「北海道」を検索
  for (const pref of PREFECTURES) {
    if (title.includes(pref)) {
      return pref;
    }
  }

  // 2. 市町村名・主要警察署名辞書から逆引き
  for (const [muni, pref] of Object.entries(MUNICIPALITY_MAP)) {
    if (title.includes(muni)) {
      return pref;
    }
  }

  // 3. 都道府県名の末尾省略パターン（「宮城」「愛媛」「福岡」「富山」など）
  for (const pref of PREFECTURES) {
    const shortName = pref.replace(/[府県]$/, '');
    if (title.includes(shortName)) {
      return pref;
    }
  }

  return '全国';
}

// 国名で始まる海外ニュースの判定（「ベトナム人」「中国籍」「ベトナム料理」等は除外）
function isTitleStartingWithOverseasCountry(title) {
  for (const country of COUNTRY_NAMES) {
    if (title.startsWith(country) || title.startsWith('【' + country)) {
      const remainder = title.startsWith('【' + country)
        ? title.substring(('【' + country).length)
        : title.substring(country.length);
      if (/^(人|国籍|籍|出身|料理|パブ|バー|サロン|留学生|実習生)/.test(remainder)) {
        continue;
      }
      return true;
    }
  }
  return false;
}

// 日本国内の警察・公的機関・法執行が明記されているか判定
function hasJapaneseEnforcement(title) {
  const JP_ENFORCEMENT = [
    '県警', '警視庁', '府警', '道警', '警察署', '署が', '署に', '署は', '署員',
    '地検', '地裁', '簡裁', '高裁', '検察', '入管', '出入国在留管理',
    '東京税関', '税関', '麻薬取締部', 'マトリ', '海上保安部', '海保'
  ];
  return JP_ENFORCEMENT.some(kw => title.includes(kw));
}

// 国内での事案かどうか判定（ポジティブ国内確証ホワイトリスト方式）
function isDomesticCrime(title, media) {
  // 1. 海外メディアまたは文末国名略称（例: 「...逮捕 米」）や通信社海外発信は即除外
  if (media && OVERSEAS_MEDIA.some(m => media.includes(m))) {
    return false;
  }
  if (OVERSEAS_TAIL_REGEX.test(title) || OVERSEAS_PREFIX_REGEX.test(title)) {
    return false;
  }

  // 2. 海外地名・国名が含まれているか判定
  const isOverseasMentioned = OVERSEAS_LOCATIONS.some(loc => title.includes(loc)) ||
                              isTitleStartingWithOverseasCountry(title);

  // 海外地名がある場合、日本の警察・税関・裁判所等の直接の法執行（例: 愛知県警が逮捕へ、羽田空港税関等）が明記されていない限り100%除外
  if (isOverseasMentioned && !hasJapaneseEnforcement(title)) {
    return false;
  }

  // 3. 日本国内である明確な証拠（都道府県・市町村名、日本の警察・捜査機関、日本固有の法令）
  const detectedLoc = detectLocation(title);
  const hasPrefecture = detectedLoc !== '全国';
  const hasEnforcement = hasJapaneseEnforcement(title);
  const hasDomesticIndicator = DOMESTIC_INDICATORS.some(ind => title.includes(ind));

  // 国内証拠（地名、警察機関、国内指示ワード）のいずれかが必須
  if (!hasPrefecture && !hasEnforcement && !hasDomesticIndicator) {
    return false;
  }

  return true;
}

// 通信社・転載メディア優先判定（一次報道・地方紙を優先保持）
function getMediaPriority(media) {
  if (!media) return 1;
  if (media.includes('Yahoo') || media.includes('goo') || media.includes('dメニュー') || media.includes('au')) {
    return 1;
  }
  return 2;
}

// 特徴キーワードグループの判定
function getEventFeatureGroup(title) {
  for (let i = 0; i < EVENT_FEATURE_KEYWORDS.length; i++) {
    const group = EVENT_FEATURE_KEYWORDS[i];
    if (group.some(kw => title.includes(kw))) {
      return i;
    }
  }
  return -1;
}

// 高度な同一事件判定（エンティティ合成 + キーワードクロス判定 + 類似度）
function isSameEvent(itemA, itemB) {
  const titleA = typeof itemA === 'string' ? itemA : itemA.title;
  const titleB = typeof itemB === 'string' ? itemB : itemB.title;

  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);

  if (normA === normB) return true;

  // 1. 固有施設名・現場名・特徴的ランドマークの一致
  const LANDMARKS = [
    'あべちか', '天王寺', '飯能', '加古川', '亀山', '天童', '流山', '神栖',
    '浅草橋', '名張', '松戸', '釧路', '氷見', 'ミナミ', '歌舞伎町', '六本木', '大久保',
    '豊川', '豊川市民病院', '羽田', '羽田空港', '大垣', '鶴見', '洲本'
  ];
  for (const lm of LANDMARKS) {
    if (titleA.includes(lm) && titleB.includes(lm)) {
      const natA = NATIONALITIES.find(n => titleA.includes(n));
      const natB = NATIONALITIES.find(n => titleB.includes(n));
      // 国籍が一致、またはどちらかが「外国籍」等の総称表記なら即同一事件
      if (!natA || !natB || natA === natB || titleA.includes('外国籍') || titleB.includes('外国籍') || titleA.includes('外国人') || titleB.includes('外国人')) {
        return true;
      }
    }
  }

  // 2. 地域・国籍・事象グループのクロス判定
  const locA = detectLocation(titleA);
  const locB = detectLocation(titleB);
  
  const natA = NATIONALITIES.find(n => titleA.includes(n));
  const natB = NATIONALITIES.find(n => titleB.includes(n));

  const featsA = [];
  const featsB = [];
  for (let i = 0; i < EVENT_FEATURE_KEYWORDS.length; i++) {
    if (EVENT_FEATURE_KEYWORDS[i].some(kw => titleA.includes(kw))) featsA.push(i);
    if (EVENT_FEATURE_KEYWORDS[i].some(kw => titleB.includes(kw))) featsB.push(i);
  }

  const commonFeats = featsA.filter(f => featsB.includes(f));

  // 特例：愛知県での死体遺棄（イラン/ブラジル/外国籍/3人等の表記ゆれ統合）
  if ((locA === '愛知県' || titleA.includes('愛知') || titleA.includes('豊川')) &&
      (locB === '愛知県' || titleB.includes('愛知') || titleB.includes('豊川')) &&
      (titleA.includes('死体遺棄') || titleA.includes('遺棄') || titleA.includes('遺体')) &&
      (titleB.includes('死体遺棄') || titleB.includes('遺棄') || titleB.includes('遺体'))) {
    return true;
  }

  // 特例：コカイン101個密輸事件（アルゼンチン国籍の女）
  if ((titleA.includes('コカイン') || titleA.includes('101個')) &&
      (titleB.includes('コカイン') || titleB.includes('101個')) &&
      (titleA.includes('アルゼンチン') || titleB.includes('アルゼンチン') || titleA.includes('密輸') || titleB.includes('密輸'))) {
    return true;
  }

  // 特例：トカゲ密輸事件（メキシコ国籍の男・羽田税関）
  if ((titleA.includes('トカゲ') || titleA.includes('200匹')) &&
      (titleB.includes('トカゲ') || titleB.includes('200匹'))) {
    return true;
  }

  if (commonFeats.length > 0) {
    const isNatMatch = natA && natB && natA === natB;
    const isGenericMatch = titleA.includes('外国籍') || titleB.includes('外国籍') || titleA.includes('外国人') || titleB.includes('外国人');

    if ((isNatMatch || isGenericMatch) && locA === locB && locA !== '全国') {
      return true;
    }

    if (locA === '全国' || locB === '全国' || locA === locB) {
      if (commonFeats.length >= 2) {
        return true;
      }
      const numA = (normA.match(/(\d+)人/) || [])[1];
      const numB = (normB.match(/(\d+)人/) || [])[1];
      if (numA && numB && numA === numB && (isNatMatch || isGenericMatch)) {
        return true;
      }
      if (normA.includes(normB.substring(0, 8)) || normB.includes(normA.substring(0, 8))) {
        return true;
      }
    }
  }

  // 3. 先頭10文字の一致判定
  if (normA.length >= 10 && normB.length >= 10) {
    if (normA.includes(normB.substring(0, 10)) || normB.includes(normA.substring(0, 10))) {
      return true;
    }
  }

  // 4. 数字トークン＋国籍の一致判定
  const numbersA = (normA.match(/\d+/g) || []).join(',');
  const numbersB = (normB.match(/\d+/g) || []).join(',');

  if (numbersA && numbersA === numbersB && numbersA.length >= 2) {
    for (const nat of NATIONALITIES) {
      if (normA.includes(nat) && normB.includes(nat)) {
        return true;
      }
    }
  }

  // 5. Jaccard単語類似度
  const wordsA = new Set(normA.match(/[\u3040-\u9faf]{2,}/g) || []);
  const wordsB = new Set(normB.match(/[\u3040-\u9faf]{2,}/g) || []);

  if (wordsA.size > 0 && wordsB.size > 0) {
    const intersection = [...wordsA].filter(w => wordsB.has(w));
    const union = new Set([...wordsA, ...wordsB]);
    const similarity = intersection.length / union.size;
    if (similarity >= 0.30) {
      return true;
    }
  }

  return false;
}

function cleanTitleText(t) {
  if (!t) return '';
  let cleaned = t
    .replace(/\s*\|.*$/, '') // パイプ以降のメディア名・副題を除去
    .replace(/\s*〈[^〉]+〉$/, '') // 末尾の〈地域名〉を除去
    .replace(/\s*（[^）]+(?:新聞|テレビ|DIG|NEWS|編集部|NNN|FNN)）$/, '') // 末尾のメディア表記を除去
    .replace(/^(?:【[^】]+】|\([^\)]+\))\s*/, '') // 先頭の【写真】や【速報】等の装飾をスッキリ整理
    .replace(/…\s*私たちが.*$/, '')
    .trim();

  // 65文字を超える長文見出しの場合、主要な逮捕・容疑文に要約短縮
  if (cleaned.length > 65) {
    const parts = cleaned.split(/[　\s…]+/);
    if (parts.length > 1) {
      let shortTitle = '';
      for (const part of parts) {
        if ((shortTitle + ' ' + part).trim().length <= 60) {
          shortTitle = (shortTitle + ' ' + part).trim();
        } else {
          break;
        }
      }
      if (shortTitle.length >= 20) {
        cleaned = shortTitle;
      }
    }
  }

  return cleaned;
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

      // 見出しのノイズ除去と要約・簡潔化
      title = cleanTitleText(title);

      const hasForeignKw = FOREIGN_KEYWORDS.some(kw => title.includes(kw));
      const hasCrimeKw = CRIME_KEYWORDS.some(kw => title.includes(kw));
      const hasExcludeKw = EXCLUDE_KEYWORDS.some(kw => title.includes(kw));
      const isDomestic = isDomesticCrime(title, media);

      if (!hasForeignKw || !hasCrimeKw || hasExcludeKw || !isDomestic) {
        continue;
      }

      const location = detectLocation(title);

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
  console.log('Fetching daily foreign crime news with Expanded 23-queries, high-precision location mapping & entity deduplication...');

  const searchQueries = [
    encodeURIComponent('外国人 逮捕 when:2d'),
    encodeURIComponent('外国人 容疑 when:2d'),
    encodeURIComponent('外国籍 逮捕 when:2d'),
    encodeURIComponent('国籍 逮捕 when:2d'),
    encodeURIComponent('外国人 書類送検 OR 追送検 when:2d'),
    encodeURIComponent('外国人 摘発 OR 指名手配 when:2d'),
    encodeURIComponent('ベトナム 逮捕 OR 摘発 when:2d'),
    encodeURIComponent('中国籍 OR 中国人 逮捕 when:2d'),
    encodeURIComponent('ブラジル 逮捕 OR 摘発 when:2d'),
    encodeURIComponent('タイ人 OR タイ国籍 逮捕 when:2d'),
    encodeURIComponent('フィリピン人 逮捕 OR 摘発 when:2d'),
    encodeURIComponent('インドネシア 逮捕 OR 摘発 when:2d'),
    encodeURIComponent('スリランカ OR カンボジア OR ネパール 逮捕 when:2d'),
    encodeURIComponent('韓国人 OR 韓国籍 逮捕 when:2d'),
    encodeURIComponent('技能実習生 OR 元技能実習生 OR 特定技能 逮捕 when:2d'),
    encodeURIComponent('仮放免 逮捕 OR 容疑 when:2d'),
    encodeURIComponent('不法滞在 OR 不法残留 OR オーバーステイ 逮捕 OR 摘発 when:2d'),
    encodeURIComponent('不法就労助長 逮捕 OR 容疑 when:2d'),
    encodeURIComponent('退去強制 OR 強制送還 when:2d'),
    encodeURIComponent('不法就労 逮捕 OR 摘発 when:2d'),
    encodeURIComponent('密輸 逮捕 when:2d'),
    encodeURIComponent('コカイン OR 覚醒剤 密輸 when:2d'),
    encodeURIComponent('危険運転 逮捕 when:2d')
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

  // --- 重複排除（一次報道メディア優先保持） ---
  const uniqueItems = [];
  for (const item of fetchedItems) {
    const idx = uniqueItems.findIndex(existing => isSameEvent(existing, item));
    if (idx === -1) {
      uniqueItems.push(item);
    } else {
      if (getMediaPriority(item.media) > getMediaPriority(uniqueItems[idx].media)) {
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

  // --- 既存データクリーンアップ（市町村名からの地域再マッピング含む） ---
  const cleanExisting = [];
  for (const item of existingData) {
    if (!isDomesticCrime(item.title, item.media)) {
      console.log(`Removed overseas item: ${item.title}`);
      continue;
    }
    const hasExcludeKw = EXCLUDE_KEYWORDS.some(kw => item.title.includes(kw));
    if (hasExcludeKw) {
      console.log(`Removed excluded item: ${item.title}`);
      continue;
    }

    // 見出しのノイズ除去と要約・簡潔化
    item.title = cleanTitleText(item.title);

    // 地域分類の最新化
    item.location = detectLocation(item.title);
    item.summary = `${item.location}で発生した外国人関与の事件・容疑に関する報道速報です。`

    const isDup = cleanExisting.some(ex => isSameEvent(ex, item));
    if (!isDup) {
      cleanExisting.push(item);
    }
  }

  const trulyNew = uniqueItems.filter(item => !cleanExisting.some(ex => isSameEvent(ex, item)));

  const finalMerged = [...trulyNew, ...cleanExisting].slice(0, 10000);

  fs.writeFileSync(NEWS_DATA_PATH, JSON.stringify(finalMerged, null, 2), 'utf-8');
  console.log(`Ultimate Filtering & Mapping Complete! newsData.json updated. Total entries: ${finalMerged.length}`);
}

main().catch(err => {
  console.error('Fatal error during news update:', err);
  process.exit(1);
});
