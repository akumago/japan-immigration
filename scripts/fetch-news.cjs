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
  '札幌': '北海道', '函館': '北海道', '旭川': '北海道', '釧路': '北海道', '帯広': '北海道', '苫小牧': '北海道', '小樽': '北海道', '北見': '北海道', '千歳': '北海道', '八雲': '北海道', '京極': '北海道',
  '青森': '青森県', '八戸': '青森県', '弘前': '青森県',
  '盛岡': '岩手県', '奥州': '岩手県', '一関': '岩手県',
  '仙台': '宮城県', '石巻': '宮城県', '気仙沼': '宮城県', '名取': '宮城県', '大崎': '宮城県',
  '秋田': '秋田県', '横手': '秋田県',
  '山形': '山形県', '鶴岡': '山形県', '酒田': '山形県', '天童': '山形県',
  '福島': '福島県', '郡山': '福島県', 'いわき': '福島県', '会津若松': '福島県',

  // 関東
  '水戸': '茨城県', 'つくば': '茨城県', '日立': '茨城県', '土浦': '茨城県', '神栖': '茨城県', '足利': '栃木県', '宇都宮': '栃木県', '小山': '栃木県',
  '前橋': '群馬県', '高崎': '群馬県', '太田': '群馬県', '伊勢崎': '群馬県', '大泉': '群馬県', '館林': '群馬県',
  'さいたま': '埼玉県', '川口': '埼玉県', '川越': '埼玉県', '越谷': '埼玉県', '所沢': '埼玉県', '熊谷': '埼玉県', '飯能': '埼玉県', '東松山': '埼玉県', '上尾': '埼玉県', '草加': '埼玉県', '春日部': '埼玉県',
  '千葉': '千葉県', '船橋': '千葉県', '松戸': '千葉県', '柏': '千葉県', '市川': '千葉県', '木更津': '千葉県', '成田': '千葉県', '流山': '千葉県', '匝瑳': '千葉県',
  '浅草橋': '東京都', '羽田': '東京都', '大田区': '東京都', '新宿': '東京都', '渋谷': '東京都', '池袋': '東京都', '足立': '東京都', '江戸川': '東京都', '八王子': '東京都', '町田': '東京都', '世田谷': '東京都', '歌舞伎町': '東京都', '六本木': '東京都', '大久保': '東京都', '牛込': '東京都', '中野': '東京都', '警視庁': '東京都',
  '横浜': '神奈川県', '川崎': '神奈川県', '相模原': '神奈川県', '横須賀': '神奈川県', '藤沢': '神奈川県', '平塚': '神奈川県',

  // 中部・北陸
  '新潟': '新潟県', '長岡': '新潟県', '上越': '新潟県',
  '富山': '富山県', '高岡': '富山県', '氷見': '富山県', '魚津': '富山県',
  '金沢': '石川県', '小松': '石川県', '津幡': '石川県',
  '福井': '福井県', '敦賀': '福井県',
  '甲府': '山梨県', '笛吹': '山梨県', '富士吉田': '山梨県', '富士河口湖': '山梨県',
  '長野': '長野県', '松本': '長野県', '上田': '長野県',
  '岐阜': '岐阜県', '大垣': '岐阜県', '各務原': '岐阜県',
  '静岡': '静岡県', '浜松': '静岡県', '沼津': '静岡県', '富士': '静岡県', '天竜': '静岡県', '伊豆の国': '静岡県', '熱海': '静岡県', '御殿場': '静岡県',
  '名古屋': '愛知県', '中村区': '愛知県', '中区': '愛知県', '豊橋': '愛知県', '岡崎': '愛知県', '一宮': '愛知県', '豊田': '愛知県', '豊川': '愛知県',
  '津市': '三重県', '四日市': '三重県', '伊勢': '三重県', '名張': '三重県', '鈴鹿': '三重県', '亀山': '三重県',

  // 近畿
  '大津': '滋賀県', '草津': '滋賀県', '東近江': '滋賀県', '甲賀': '滋賀県', '彦根': '滋賀県',
  '京都': '京都府', '宇治': '京都府', '舞鶴': '京都府',
  '大阪': '大阪府', '堺': '大阪府', '東大阪': '大阪府', '枚方': '大阪府', '豊中': '大阪府', 'ミナミ': '大阪府', '難波': '大阪府', '天王寺': '大阪府', 'あべちか': '大阪府', '鶴見': '大阪府',
  '神戸': '兵庫県', '姫路': '兵庫県', '尼崎': '兵庫県', '西宮': '兵庫県', '明石': '兵庫県', '加古川': '兵庫県', '洲本': '兵庫県',
  '奈良': '奈良県', '橿原': '奈良県',
  '和歌山': '和歌山県', '田辺': '和歌山県',

  // 中国・四国
  '鳥取': '鳥取県', '米子': '鳥取県',
  '松江': '島根県', '出雲': '島根県',
  '岡山': '岡山県', '倉敷': '岡山県',
  '広島': '広島県', '福山': '広島県', '呉': '広島県', '尾道': '広島県',
  '山口': '山口県', '下関': '山口県', '宇部': '山口県',
  '徳島': '徳島県', '鳴門': '徳島県',
  '高松': '香川県', '丸亀': '香川県', '観音寺': '香川県',
  '松山': '愛媛県', '今治': '愛媛県', '新居浜': '愛媛県', '宇和島': '愛媛県',
  '高知': '高知県', '南国': '高知県',

  // 九州・沖縄
  '福岡': '福岡県', '北九州': '福岡県', '久留米': '福岡県', '飯塚': '福岡県', '天神': '福岡県',
  '佐賀': '佐賀県', '唐津': '佐賀県', '鳥栖': '佐賀県',
  '長崎': '長崎県', '佐世保': '長崎県',
  '熊本': '熊本県', '八代': '熊本県',
  '大分': '大分県', '別府': '大分県',
  '宮崎': '宮崎県', '都城': '宮崎県',
  '鹿児島': '鹿児島県', '霧島': '鹿児島県', '鹿屋': '鹿児島県',
  '那覇': '沖縄県', '沖縄': '沖縄県', 'うるま': '沖縄県', '宮古島': '沖縄県', '石垣': '沖縄県', '西原': '沖縄県', '北谷': '沖縄県', '嘉手納': '沖縄県', '金武': '沖縄県'
};

// 外国人関与を示すキーワード
const FOREIGN_KEYWORDS = [
  '外国人', '外国籍', '国籍', '外国人観光客', '訪日客', 'インバウンド',
  '米軍', '米兵', '米軍属', '米海兵隊員', '米海兵隊', '米海軍', '米空軍', '米陸軍', '米国人', 'アメリカ人', 'アメリカ国籍',
  'ベトナム', '中国', '韓国', '台湾', '台湾籍', '台湾国籍', 'ブラジル', 'ペルー',
  'ネパール', 'フィリピン', 'タイ人', 'タイ国籍', 'タイ籍', 'クルド',
  'インドネシア', 'カンボジア', 'スリランカ', 'パキスタン', 'バングラデシュ', 'モンゴル', 'ナイジェリア', 'ガーナ',
  'トルコ', 'ミャンマー', 'イラン', 'アルゼンチン', 'コロンビア', 'フランス', 'メキシコ', 'エジプト', 'チリ', 'チリ人', 'チリ国籍', 'チリ籍',
  'ロシア', 'ロシア人', 'ロシア国籍', 'ウズベキスタン', 'ボリビア',
  'ラオス', 'ラオス人', 'ラオス国籍', 'マレーシア', 'マレーシア人', 'マレーシア国籍', 'シンガポール',
  'キルギス', 'タジキスタン', 'カザフスタン', 'ケニア', 'ウガンダ', 'セネガル',
  '不法滞在', '不法残留', '不法入国', '密入国', 'オーバーステイ',
  '技能実習生', '元技能実習生', '特定技能', '留学生', '元留学生', '仮放免',
  '偽造在留カード', '在留カード', '入管法', '入管難民法',
  '難民', '難民申請',
  'インド人', 'インド国籍', 'イギリス人', '英国籍', 'カナダ人', 'カナダ国籍',
  'ドイツ人', 'ドイツ国籍', 'オーストラリア人', '豪州籍',
  'アフガニスタン', '北朝鮮', '朝鮮籍', '不法就労', '密航'
];

// 代表的国籍リスト
const NATIONALITIES = [
  'ベトナム', '中国', '韓国', 'ブラジル', 'ペルー', 'ネパール', 'フィリピン', 'タイ人', 'タイ国籍', 'タイ籍',
  'インドネシア', 'カンボジア', 'スリランカ', 'パキスタン', 'バングラデシュ', 'モンゴル',
  'ナイジェリア', 'ガーナ', 'トルコ', 'ミャンマー', 'イラン', 'クルド',
  'アルゼンチン', 'コロンビア', 'フランス', 'メキシコ', 'エジプト', 'チリ', '台湾',
  'ロシア', 'ウズベキスタン', 'ボリビア', 'アフガニスタン', '北朝鮮',
  'ラオス', 'マレーシア', 'シンガポール', 'キルギス', 'タジキスタン', 'カザフスタン',
  'アメリカ', '米国', '米国籍', 'インド', 'イギリス', '英国',
  'ドイツ', 'オーストラリア', 'カナダ'
];

// 犯罪・容疑を示すキーワード（あらゆる罪種・手口・司法フェーズを完全網羅）
const CRIME_KEYWORDS = [
  '逮捕', '容疑', '疑い', '書類送検', '不法', '強盗', '窃盗', '暴行', '傷害',
  '放火', '現住建造物等放火', '死体遺棄', '遺棄', '保護責任者遺棄', '殺人未遂', '殺人', '刺殺',
  '公務執行妨害', '職務質問', '逃走', '乱闘',
  '銃刀法', '拳銃', '刃物所持', '不法所持',
  '覚醒剤', '大麻', 'コカイン', '麻薬', '密売', '密輸', '薬物',
  '詐欺', '横領', '背任', '受け子', '出し子', '特殊詐欺',
  'わいせつ', '不同意性交', '不同意わいせつ', '盗撮', '風俗', '売春',
  '再逮捕', 'ひき逃げ', '当て逃げ', '危険運転', '飲酒運転', '酒酔い', '酒気帯び', '無免許', '過失運転', '過失致死', '過失致傷',
  '摘発', '検挙', '起訴', '追起訴', '送検', '追送検', '求刑', '実刑', '懲役', '指名手配', '逮捕状',
  '退去強制', '強制送還', '不法就労助長', '資格外活動', '偽装滞在', '不法滞在', 'オーバーステイ',
  '住居侵入', '建造物侵入', '邸宅侵入', '器物損壊', '脅迫', '恐喝', '監禁', '略取', '誘拐',
  '万引き', '公判', '判決', '初公判',
  '不法投棄', '廃棄物処理法', 'ヤード', '無許可解体',
  '地下銀行', '無許可送金', 'マネロン', '偽造', '偽装', '商標法', '不正アクセス'
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
  ['ひき逃げ', '危険運転', '多重事故', '過失運転', '人身事故'],
  ['マッサージ', '客引き', '風営法', '無許可営業', 'ポンバシ', '歓楽街'],
  ['あおり運転', '妨害運転', 'オートバイ', 'ミニバイク', 'バイク転倒', 'バイク'],
  ['ミャンマー', '特定技能', '虐待', '保護', '6人'],
  ['スコップ', '頭殴', '殴打', '頭部殴打'],
  ['中野ブロードウェイ', '高級時計', '高級腕時計', 'チリ人', 'チリ国籍', '2億円'],
  ['北谷', '北谷町', 'ホテル火災', '宿泊施設火災', '放火殺人未遂', '簡易ホテル火災']
];

// 海外現地・国外ニュースを除外するための単語
const OVERSEAS_LOCATIONS = [
  'タイニン', 'タイの', 'タイで', 'タイ首都', '首都近郊', '韓国の', '韓国で', 'ベトナムで', 'ベトナムの',
  'アメリカの', 'アメリカで', '中国の', '中国で', '台湾の', '台湾で',
  'フィリピンの', 'フィリピンで', 'ブラジルの', 'ブラジルで', 'ソウル', 'バンコク',
  'ワシントン', '北京', 'ロンドン', 'パリ', '現地', '国外',
  'インドの', 'インドで', 'ミャンマーの', 'ミャンマーで', 'カンボジアの', 'カンボジアで', 'インドネシアの', 'インドネシアで',
  'モロッコの', 'モロッコで', 'イランの', 'イランで', 'シリアの', 'シリアで', 'メキシコの', 'メキシコで',
  'トルコの', 'トルコで', 'イスラエルの', 'イスラエルで', 'ドイツの', 'ドイツで',
  'マレーシアの', 'マレーシアで', 'オーストラリアの', 'オーストラリアで',
  '海外', '渡航先',
  'ホアヒン', 'パタヤ', 'チェンマイ', 'プーケット', 'ラヨーン', 'セブ', 'バリ', 'グアム', 'ハワイ',
  'カリフォルニア', 'テキサス', 'フロリダ', 'ロサンゼルス', 'シカゴ',
  'マカオ', 'ラオスの', 'ラオスで', '英国の', '英国で', '米国の', '米国で', 'ドンムアン', 'ホーチミン', 'ハノイ',
  'プノンペン', 'ジャカルタ', 'マニラ', 'クアラルンプール', 'ニューヨーク',
  'シンガポール', '上海', '香港', '台北', '深圳', 'ムンバイ',
  'ヤンゴン', 'ダッカ', 'カラチ', 'リヤド', 'ドバイ', 'テルアビブ',
  'モスクワ', 'キーウ', 'ベルリン', 'ローマ', 'マドリード', 'シドニー',
  'スワンナプーム', '仁川', '桃園', 'ヒースロー', 'JFK',
  'Reform UK', '超法規的', 'インドへ出国', 'メトロジャヤ', 'ジャカルタ首都圏', 'インドネシア共和国',
  '南京', '湖北', '江蘇', '広州', '武漢', '天津', '青島', '大連', '成都', '重慶', '杭州', '西安',
  '天安', '水原', '城南', '高陽', '龍仁', '清州', '全州', '大邱', '大田', '光州', '蔚山',
  '京畿', '江原', '忠清', '全羅', '慶尚', '済州'
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
  '資格外活動'
];

// 除外キーワード
const EXCLUDE_KEYWORDS = [
  '知事会', '基本法', '要請', 'まつり', '花笠', '白バイ', 'ロンドン',
  '米警察', '米当局', '韓国警察', '現地警察', '現地当局', 'FBI', '国際指名手配',
  'イベント', '訓練', 'サーキット', '減給処分', '知事', 'サッカー', '代表監督',
  '中国ネット', '強制送還され',
  
  // デマ・不確定情報・事実否定報道の完全排除
  '不確定情報', '事実を把握していない', 'デマ', '事実無根', '裏付ける事実はない', '確認されていない',
  
  // オピニオン・コラム・発言記事の排除
  '私見', '持論', '語る', '苦言', '言及', '内幕', '捜査の内幕', '氏、', 'ひろゆき',

  // 海外固有の刑法・事案用語
  '存続殺人', '尊属殺人',

  // 日本人被疑者の海外逃亡・海外特殊詐欺拠点（被疑者が日本人）の排除
  '組員', '暴力団', '組幹部', '指定暴力団', '住吉会', '山口組', '稲川会', '道仁会', '工藤会',
  '移送目的', '移送しようと', 'に潜伏', 'へ潜伏', 'に逃亡', 'へ逃亡', '当局が拘束', '日本に移送', '拠点特殊詐欺', 'に派遣',
  
  // 日本人雇用主・経営者による不法就労助長（被疑者が日本人）の排除
  '不法就労助長', '派遣会社社長', '会社社長を逮捕', '社長を逮捕', '経営者を逮捕', '役員を逮捕',
  
  // 日本人偽装・なりすまし犯罪
  '外国人装い', '外国人を装', '外国人のふり', '外国人のフリ', '外国人になりすま', '外国人に扮', '外国人の真似',

  // 外国人が純粋な被害者側（ひき逃げ被害・事件被害等）の排除
  // ※ extractItemsFromRSS() および cleanExisting で「逮捕」「容疑」がタイトルに
  //    含まれていない被害者記事のみを除外する安全ロジックを使用

  // ドラマ・映画・アニメ・マンガ・芸能・フィクション徹底遮断
  'ドラマ', '連続ドラマ', '新ドラマ', '連ドラ', '劇場版', '映画', 'アニメ', '漫画', 'マンガ', 'コミック', '小説', '原作', '脚本',
  'キャスト', '出演', '主演', '助演', 'ヒロイン', '主人公', '登場人物', 'クランクイン', 'クランクアップ', 'オフショット',
  '放送', '見逃し', 'あらすじ', 'ネタバレ', '予告', '場面カット', '先行カット', '場面写真', 'スチール', 'キービジュアル',
  'ピンチ', '急展開', '衝撃の結末', '伏線', '怒涛の展開',
  '最終回', '最終話',
  '第1話', '第2話', '第3話', '第4話', '第5話', '第6話', '第7話', '第8話', '第9話', '第10話', '第11話', '第12話',
  '第１話', '第２話', '第３話', '第４話', '第５話', '第６話', '第７話', '第８話', '第９話', '第１０話', '第１１話', '第１２話',

  // フィクション・煽り記号（ストレート事件報道に存在しない記号）
  '!!', '!?', '！？', '？！', '！！', '？？', '??',
  '【ネタバレ】', '【あらすじ】', '【場面写真】', '【予告】', '【動画】'
];

// 海外メディア名リスト
const OVERSEAS_MEDIA = [
  'Informat.ro', 'Mshale', 'Vietnam.vn', 'Laodong.vn', 'ENTREVUE.FR', 'arabnews', 'Reuters',
  'AP通信', 'AFP', 'タイランドハイパーリンクス', 'タイニュース', 'クロスボンバー', 'bomberth',
  'VnExpress', 'Tuoi Tre', 'The Guardian', 'BBC', 'CNN', 'New York Times',
  'Washington Post', 'South China Morning Post', 'Yonhap', 'Channel News Asia',
  'VOI.ID', 'voi.id', 'ANTARA'
];

// 芸能・エンタメ・テレビ番組メディアの完全除外リスト
const ENTERTAINMENT_MEDIA = [
  'ORICON', 'オリコン', 'モデルプレス', 'クランクイン', 'MANTANWEB', 'mantan-web',
  'ナタリー', 'シネマトゥデイ', '映画.com', 'テレ朝POST', 'WEBザテレビジョン',
  'TVガイド', 'マイナビニュース', 'ENCOUNT', 'リアルサウンド', 'cinemacafe',
  'スポニチ', 'デイリースポーツ', 'サンケイスポーツ', '日刊スポーツ', 'スポーツ報知'
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
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
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
  // 0. 特徴的事件現場ランドマーク・管轄警察組織を最優先（例: あべちか→大阪府、大阪府警→大阪府、警視庁→東京都）
  const PRIMARY_LOCATION_SIGNS = [
    { key: '津幡', pref: '石川県' },
    { key: '浜松', pref: '静岡県' },
    { key: '宇和島', pref: '愛媛県' },
    { key: 'あべちか', pref: '大阪府' },
    { key: '天王寺', pref: '大阪府' },
    { key: '中野ブロードウェイ', pref: '東京都' },
    { key: '八王子', pref: '東京都' },
    { key: '八雲', pref: '北海道' },
    { key: '千歳', pref: '北海道' },
    { key: 'テレビ愛知', pref: '愛知県' },
    { key: '中京テレビ', pref: '愛知県' },
    { key: '大阪府警', pref: '大阪府' },
    { key: '警視庁', pref: '東京都' },
    { key: '埼玉県警', pref: '埼玉県' },
    { key: '愛知県警', pref: '愛知県' },
    { key: '神奈川県警', pref: '神奈川県' },
    { key: '千葉県警', pref: '千葉県' },
    { key: '兵庫県警', pref: '兵庫県' },
    { key: '京都府警', pref: '京都府' },
    { key: '福岡県警', pref: '福岡県' }
  ];
  for (const item of PRIMARY_LOCATION_SIGNS) {
    if (title.includes(item.key)) {
      return item.pref;
    }
  }

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
    '東京税関', '横浜税関', '税関', '麻薬取締部', 'マトリ', '海上保安部', '海保',
    '東京地裁', '大阪地裁', '名古屋地裁', '福岡地裁', '横浜地裁', 'さいたま地裁', '千葉地裁', '那覇地裁', '京都地裁', '神戸地裁',
    '東京地検', '大阪地検', '名古屋地検', '福岡地検', '最高裁'
  ];
  return JP_ENFORCEMENT.some(kw => title.includes(kw));
}

// 国内での事案かどうか判定（ポジティブ国内確証ホワイトリスト方式）
function isDomesticCrime(title, media) {
  // 1. 海外メディア・外国語メディア（ハングル等）・通信社海外発信は即除外
  if (media) {
    if (OVERSEAS_MEDIA.some(m => media.includes(m))) return false;
    if (ENTERTAINMENT_MEDIA.some(m => media.includes(m))) return false;
    // ハングル文字（韓国メディア）または中国・韓国の主要通信社・メディアは100%除外
    if (/[\uac00-\ud7af]/.test(media) || /中央日報|朝鮮日報|東亜日報|ハンギョレ|毎日経済|매일경제|聯合ニュース|KBS|MBC|SBS|JTBC|YTN|新華社|人民日報|環球時報/.test(media)) {
      return false;
    }
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

  // 3. 日本国内である明確な証拠（都道府県・市町村名、日本の警察・捜査機関、日本固有の法令、公認国内メディア、国内特有事案）
  const detectedLoc = detectLocation(title);
  const hasPrefecture = detectedLoc !== '全国';
  const hasEnforcement = hasJapaneseEnforcement(title);
  const hasDomesticIndicator = DOMESTIC_INDICATORS.some(ind => title.includes(ind));

  // 日本の公認国内メディアからの配信、または太陽光・銅線窃盗等の日本特有事案の救済
  const isDomesticSpecificCrime = /(太陽光|メガソーラー|銅線|空室|空き部屋|受け子|出し子|ヤード|不法就労)/.test(title);
  const isCertifiedDomesticMedia = media && /(新聞|テレビ|放送|NEWS DIG|NNN|FNN|ANN|JNN|Yahoo|ｄメニュー|goo|au)/.test(media);

  // 国内証拠（地名、警察機関、国内指示ワード、または特有犯罪×国内メディア）のいずれかが必須
  if (!hasPrefecture && !hasEnforcement && !hasDomesticIndicator && !(isDomesticSpecificCrime && isCertifiedDomesticMedia)) {
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

  // 同義語・表現ゆれの完全正規化
  function canonicalizeTitle(t) {
    return normalizeTitle(t)
      .replace(/火を付[けける]|火災|火事/g, '放火')
      .replace(/宿泊施設|簡易宿所|簡易ホテル|ホテル|旅館/g, 'ホテル施設')
      .replace(/空き部屋|空き室|空室|賃貸住宅の空き/g, '空き部屋')
      .replace(/出し子|回収役|特殊詐欺|sns型投資詐欺|投資詐欺/g, '受け子詐欺')
      .replace(/不同意わいせつ|強制わいせつ/g, 'わいせつ')
      .replace(/乾燥大麻|大麻リキッド/g, '大麻')
      .replace(/高級腕時計|高級時計/g, '高級時計')
      .replace(/けがをさせ逃走|逃走か|逃走した疑い/g, 'ひき逃げ');
  }

  const canonA = canonicalizeTitle(titleA);
  const canonB = canonicalizeTitle(titleB);
  if (canonA === canonB) return true;

  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);

  if (normA === normB) return true;

  // 1. 固有施設名・現場名・特徴的ランドマークの一致
  const LANDMARKS = [
    'あべちか', '天王寺', '飯能', '加古川', '亀山', '天童', '流山', '神栖',
    '浅草橋', '名張', '松戸', '釧路', '氷見', 'ミナミ', '歌舞伎町', '六本木', '大久保',
    '豊川', '豊川市民病院', '羽田', '羽田空港', '大垣', '鶴見', '洲本',
    '北谷', '北谷町', '八雲', '千歳'
  ];
  for (const lm of LANDMARKS) {
    if (titleA.includes(lm) && titleB.includes(lm)) {
      const natA = NATIONALITIES.find(n => titleA.includes(n));
      const natB = NATIONALITIES.find(n => titleB.includes(n));
      // 新たな容疑者・実行役の逮捕など、明確な新展開報道は別記事として保持
      const isNewSuspectA = titleA.includes('新たに逮捕') || titleA.includes('実行役');
      const isNewSuspectB = titleB.includes('新たに逮捕') || titleB.includes('実行役');
      if (isNewSuspectA !== isNewSuspectB) {
        continue;
      }
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

  // 特例：中野高級時計2億円窃盗事件（チリ国籍・警視庁）
  if ((titleA.includes('中野') || titleA.includes('高級時計') || titleA.includes('高級腕時計') || titleA.includes('2億円')) &&
      (titleB.includes('中野') || titleB.includes('高級時計') || titleB.includes('高級腕時計') || titleB.includes('2億円')) &&
      (titleA.includes('チリ') || titleB.includes('チリ') || titleA.includes('時計') || titleB.includes('時計'))) {
    return true;
  }

  // 特例：沖縄・北谷町ホテル放火殺人未遂事件（米国籍32歳男・複数媒体の統合）
  if ((titleA.includes('沖縄') || titleA.includes('北谷') || locA === '沖縄県') &&
      (titleB.includes('沖縄') || titleB.includes('北谷') || locB === '沖縄県') &&
      (titleA.includes('放火') || titleA.includes('火災') || titleA.includes('火事') || titleA.includes('火を付') || titleA.includes('火をつけ')) &&
      (titleB.includes('放火') || titleB.includes('火災') || titleB.includes('火事') || titleB.includes('火を付') || titleB.includes('火をつけ'))) {
    return true;
  }

  // 特例：八王子アパート空室侵入事件（中国籍41歳男・下野新聞とTBS NEWS DIG等の統合）
  if ((titleA.includes('空き部屋') || titleA.includes('空室')) &&
      (titleB.includes('空き部屋') || titleB.includes('空室')) &&
      (titleA.includes('侵入') || titleB.includes('侵入'))) {
    return true;
  }

  // 特例：クルーズ船大麻・麻薬不起訴（米国籍女性・鹿児島地検）
  if ((titleA.includes('鹿児島地検') || titleA.includes('鹿児島')) &&
      (titleB.includes('鹿児島地検') || titleB.includes('鹿児島')) &&
      (titleA.includes('不起訴') || titleA.includes('麻薬') || titleA.includes('大麻')) &&
      (titleB.includes('不起訴') || titleB.includes('麻薬') || titleB.includes('大麻')) &&
      (titleA.includes('米国籍') || titleB.includes('米国籍'))) {
    return true;
  }

  // 特例：特殊詐欺受け子（韓国籍・宮城県警）
  if ((locA === '宮城県' || locB === '宮城県' || titleA.includes('宮城') || titleB.includes('宮城')) &&
      (titleA.includes('詐欺') || titleA.includes('受け子') || titleA.includes('警察官')) &&
      (titleB.includes('詐欺') || titleB.includes('受け子') || titleB.includes('警察官')) &&
      (titleA.includes('韓国籍') || titleB.includes('韓国籍'))) {
    return true;
  }

  // 特例：あおり運転殺人未遂（韓国籍・京都）
  if ((locA === '京都府' || locB === '京都府' || titleA.includes('京都') || titleB.includes('京都')) &&
      (titleA.includes('あおり運転') || titleA.includes('バイク') || titleA.includes('オートバイ')) &&
      (titleB.includes('あおり運転') || titleB.includes('バイク') || titleB.includes('オートバイ')) &&
      (titleA.includes('韓国籍') || titleB.includes('韓国籍'))) {
    return true;
  }

  if (commonFeats.length > 0) {
    const isNatMatch = natA && natB && natA === natB;
    const isGenericMatch = titleA.includes('外国籍') || titleB.includes('外国籍') || titleA.includes('外国人') || titleB.includes('外国人') || (!natA && !natB);

    // 同じ地域（または片方が全国）で同じ犯罪特徴グループ＆国籍一致なら即同一事件
    if ((isNatMatch || isGenericMatch) && (locA === locB || locA === '全国' || locB === '全国')) {
      return true;
    }
  }

  // 引用符内の印象的なセリフ・手口ワードの一致判定（例: 「マッサージどう」「お金をください」等）
  const quoteA = (titleA.match(/「(.*?)」/) || [])[1];
  const quoteB = (titleB.match(/「(.*?)」/) || [])[1];
  if (quoteA && quoteB && (quoteA.includes(quoteB.substring(0, 5)) || quoteB.includes(quoteA.substring(0, 5)))) {
    return true;
  }

  // 3. 先頭10文字の一致判定（＋地域一致を必須条件として誤統合を防止）
  if (normA.length >= 10 && normB.length >= 10) {
    if (normA.includes(normB.substring(0, 10)) || normB.includes(normA.substring(0, 10))) {
      if (locA === locB || locA === '全国' || locB === '全国') {
        return true;
      }
    }
  }

  // 4. 数字トークン＋国籍の一致判定（3桁以上の数字＋地域一致で年齢のみの誤統合を防止）
  const numbersA = (normA.match(/\d+/g) || []).filter(n => n.length >= 3).join(',');
  const numbersB = (normB.match(/\d+/g) || []).filter(n => n.length >= 3).join(',');

  if (numbersA && numbersA === numbersB) {
    if (locA === locB || locA === '全国' || locB === '全国') {
      for (const nat of NATIONALITIES) {
        if (normA.includes(nat) && normB.includes(nat)) {
          return true;
        }
      }
    }
  }

  // 5. Jaccard単語類似度（＋地域一致を必須条件として誤統合を防止）
  const wordsA = new Set(normA.match(/[\u3040-\u9faf]{2,}/g) || []);
  const wordsB = new Set(normB.match(/[\u3040-\u9faf]{2,}/g) || []);

  if (wordsA.size > 0 && wordsB.size > 0) {
    const intersection = [...wordsA].filter(w => wordsB.has(w));
    const union = new Set([...wordsA, ...wordsB]);
    const similarity = intersection.length / union.size;
    if (similarity >= 0.40 && (locA === locB || locA === '全国' || locB === '全国')) {
      return true;
    }
  }

  return false;
}

function cleanTitleText(t) {
  if (!t) return '';
  let cleaned = t
    .replace(/\s*\|.*$/, '') // パイプ以降のメディア名・副題を除去
    .replace(/\s*（[^）]+(?:新聞|テレビ|DIG|NEWS|編集部|NNN|FNN)）$/, '') // 末尾のメディア表記を除去
    .replace(/^(?:【[^】]+】|\([^\)]+\))\s*/, '') // 先頭の【写真】や【速報】等の装飾をスッキリ整理
    .replace(/^八代英輝弁護士\s*/, '')
    .replace(/…\s*私たちが.*$/, '')
    .trim();

  // 100文字を超える長文見出しの場合、主要な逮捕・容疑文に要約短縮
  if (cleaned.length > 100) {
    const parts = cleaned.split(/[　\s…]+/);
    if (parts.length > 1) {
      let shortTitle = '';
      for (const part of parts) {
        if ((shortTitle + ' ' + part).trim().length <= 95) {
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

      // Google News RSS の <source> タグを優先取得
      const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
      if (sourceMatch) {
        media = sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
      }

      const mediaMatch = rawTitle.match(/^(.*)\s*-\s*([^-]+)$/);
      if (mediaMatch) {
        title = mediaMatch[1].trim();
        if (media === '新聞・報道') {
          media = mediaMatch[2].trim();
        }
      }

      // 見出しのノイズ除去と要約・簡潔化
      title = cleanTitleText(title);

      // 「中国道」「中国地方」「中国電力」等の国内固有名詞を外国人判定から除外
      const titleWithoutDomesticChugoku = title.replace(/中国(道|自動車道|地方|電力|銀行|新聞|バス|管区)/g, '');

      const hasForeignKw = FOREIGN_KEYWORDS.some(kw => titleWithoutDomesticChugoku.includes(kw));
      const hasCrimeKw = CRIME_KEYWORDS.some(kw => title.includes(kw));
      const hasExcludeKw = EXCLUDE_KEYWORDS.some(kw => title.includes(kw));
      const isDomestic = isDomesticCrime(title, media);

      if (!hasForeignKw || !hasCrimeKw || hasExcludeKw || !isDomestic) {
        continue;
      }

      // 外国人が被害者側の記事（例: 「男逮捕 自転車のインドネシア人は重傷」「外国人に日常的暴行」等）を安全かつ確実に排除
      const isForeignVictim = /(インドネシア|ベトナム|中国|韓国|フィリピン|タイ|ブラジル|ミャンマー|外国)(人|国籍|籍)?[の男女代性0-9０-９歳（）\s]*[はが]?(頭蓋骨|骨折|意識不明|重傷|軽傷|死亡|重体|刺され|被害)/.test(title) ||
                              /(外国人|外国籍|実習生|留学生)[にへ]?(日常的暴行|暴行|傷害|性的暴行|差別|対する)/.test(title);
      const isForeignPerpetrator = /(外国人|外国籍|ベトナム人|中国人|韓国人|フィリピン人|タイ人|ブラジル人|ミャンマー人|米国籍|アメリカ人|米兵|実習生|留学生)[の男女代性0-9０-９（）\s]*[をが]?(逮捕|容疑|送検|再逮捕|起訴|摘発)/.test(title) ||
                                  /(逮捕|容疑|送検|再逮捕)[の男女代性0-9０-９（）\s]*[は、\s]*(外国人|外国籍|ベトナム|中国|韓国|フィリピン|タイ|ブラジル|ミャンマー|米国|アメリカ|米兵|実習生|留学生)/.test(title);
      if (isForeignVictim && !isForeignPerpetrator) {
        continue;
      }

      let location = detectLocation(title);
      if (location === '全国') {
        location = detectLocation(rawTitle);
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
  console.log('Fetching daily foreign crime news with Expanded 41-queries (72h window), high-precision location mapping & entity deduplication...');

  const searchQueries = [
    // === 基本クエリ（外国人×犯罪の幅広い網） ===
    encodeURIComponent('外国人 逮捕 when:3d'),
    encodeURIComponent('外国人 容疑 when:3d'),
    encodeURIComponent('外国籍 逮捕 when:3d'),
    encodeURIComponent('国籍 逮捕 when:3d'),
    encodeURIComponent('外国人 書類送検 OR 追送検 when:3d'),
    encodeURIComponent('外国人 摘発 OR 指名手配 when:3d'),

    // === 国籍別クエリ（主要在日外国人コミュニティ） ===
    encodeURIComponent('ベトナム 逮捕 OR 摘発 when:3d'),
    encodeURIComponent('中国籍 OR 中国人 逮捕 when:3d'),
    encodeURIComponent('ブラジル 逮捕 OR 摘発 when:3d'),
    encodeURIComponent('タイ人 OR タイ国籍 逮捕 when:3d'),
    encodeURIComponent('フィリピン人 逮捕 OR 摘発 when:3d'),
    encodeURIComponent('インドネシア 逮捕 OR 摘発 when:3d'),
    encodeURIComponent('スリランカ OR カンボジア OR ネパール 逮捕 when:3d'),
    encodeURIComponent('韓国人 OR 韓国籍 逮捕 when:3d'),
    encodeURIComponent('ペルー 逮捕 OR 摘発 when:3d'),
    encodeURIComponent('パキスタン OR バングラデシュ 逮捕 when:3d'),
    encodeURIComponent('モンゴル OR ナイジェリア 逮捕 when:3d'),
    encodeURIComponent('トルコ国籍 OR クルド人 逮捕 when:3d'),
    encodeURIComponent('アメリカ人 OR 米国籍 逮捕 when:3d'),
    encodeURIComponent('ブラジル国籍 逮捕 OR 再逮捕 when:3d'),
    encodeURIComponent('台湾人 OR 台湾国籍 OR 台湾籍 逮捕 when:3d'),

    // === 在留資格・入管制度別クエリ ===
    encodeURIComponent('技能実習生 OR 元技能実習生 OR 特定技能 逮捕 when:3d'),
    encodeURIComponent('仮放免 逮捕 OR 容疑 when:3d'),
    encodeURIComponent('不法滞在 OR 不法残留 OR オーバーステイ 逮捕 OR 摘発 when:3d'),
    encodeURIComponent('退去強制 OR 強制送還 when:3d'),
    encodeURIComponent('不法就労 逮捕 OR 摘発 when:3d'),
    encodeURIComponent('不法在留 逮捕 OR 摘発 when:3d'),
    encodeURIComponent('留学生 逮捕 OR 摘発 when:3d'),
    encodeURIComponent('在留資格 OR 偽装結婚 逮捕 when:3d'),

    // === 犯罪類型別クエリ（外国人キーワード付きで精度向上） ===
    encodeURIComponent('密輸 外国人 OR 外国籍 逮捕 when:3d'),
    encodeURIComponent('コカイン OR 覚醒剤 密輸 when:3d'),
    encodeURIComponent('危険運転 外国人 OR 外国籍 OR 米兵 逮捕 when:3d'),
    encodeURIComponent('銅線 OR 太陽光 外国人 OR 技能実習生 逮捕 OR 窃盗 when:3d'),
    encodeURIComponent('立てこもり 逮捕 OR 再逮捕 when:3d'),
    encodeURIComponent('車上ねらい OR 車上荒らし 外国人 OR 外国籍 逮捕 when:3d'),
    encodeURIComponent('わいせつ 外国人 OR 外国籍 逮捕 when:3d'),
    encodeURIComponent('住居侵入 OR 侵入窃盗 外国人 OR 外国籍 逮捕 when:3d'),
    encodeURIComponent('傷害致死 OR 殺人 外国 逮捕 when:3d'),
    encodeURIComponent('詐欺 外国人 OR 外国籍 逮捕 when:3d'),
    encodeURIComponent('窃盗 外国人 OR 外国籍 逮捕 when:3d'),
    encodeURIComponent('白タク 外国人 OR 外国籍 逮捕 when:3d'),

    // === 犯罪ジャンル別特化クエリ（多様な犯罪のすくい上げ） ===
    encodeURIComponent('放火 OR 殺人未遂 外国人 OR 外国籍 逮捕 when:3d'),
    encodeURIComponent('死体遺棄 OR 遺棄 外国人 OR 外国籍 逮捕 when:3d'),
    encodeURIComponent('ひき逃げ OR 無免許 OR 飲酒運転 外国人 OR 外国籍 逮捕 when:3d'),
    encodeURIComponent('公務執行妨害 OR 銃刀法 外国人 OR 外国籍 逮捕 when:3d'),
    encodeURIComponent('不法投棄 OR ヤード 外国人 OR 外国籍 逮捕 when:3d'),
    encodeURIComponent('地下銀行 OR 偽造 外国人 OR 外国籍 逮捕 when:3d'),
    encodeURIComponent('外国人観光客 OR 訪日客 逮捕 OR 容疑 when:3d'),

    // === 追加国籍クエリ（取り漏らし防止） ===
    encodeURIComponent('ミャンマー国籍 OR ミャンマー人 逮捕 when:3d'),
    encodeURIComponent('インド人 OR インド国籍 逮捕 when:3d'),
    encodeURIComponent('ネパール人 OR ネパール国籍 OR ネパール 逮捕 when:3d'),
    encodeURIComponent('台湾人 OR 台湾籍 OR 台湾国籍 逮捕 when:3d'),
    encodeURIComponent('ロシア人 OR ロシア国籍 逮捕 when:3d'),
    encodeURIComponent('米兵 OR 米軍 逮捕 OR 容疑 OR 摘発 when:3d'),
    encodeURIComponent('ラオス人 OR ラオス国籍 逮捕 when:3d'),
    encodeURIComponent('マレーシア人 OR マレーシア国籍 逮捕 when:3d'),
    encodeURIComponent('太陽光 OR 銅線 外国人 OR 外国籍 逮捕 when:3d')
  ];

  let fetchedItems = [];
  let successCount = 0;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    await sleep(300);
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
    // 「中国道」「中国地方」「中国電力」等の国内固有名詞を外国人判定から除外
    const titleWithoutDomesticChugoku = item.title.replace(/中国(道|自動車道|地方|電力|銀行|新聞|バス|管区)/g, '');

    const hasForeignKw = FOREIGN_KEYWORDS.some(kw => titleWithoutDomesticChugoku.includes(kw));
    const hasCrimeKw = CRIME_KEYWORDS.some(kw => item.title.includes(kw));
    if (!hasForeignKw || !hasCrimeKw) {
      console.log(`Removed non-foreign or non-crime item: ${item.title}`);
      continue;
    }
    // 外国人が被害者側の記事（例: 「男逮捕 自転車のインドネシア人は重傷」「外国人に日常的暴行」等）を安全かつ確実に排除
    const isForeignVictim = /(インドネシア|ベトナム|中国|韓国|フィリピン|タイ|ブラジル|ミャンマー|外国)(人|国籍|籍)?[の男女代性0-9０-９歳（）\s]*[はが]?(頭蓋骨|骨折|意識不明|重傷|軽傷|死亡|重体|刺され|被害)/.test(item.title) ||
                            /(外国人|外国籍|実習生|留学生)[にへ]?(日常的暴行|暴行|傷害|性的暴行|差別|対する)/.test(item.title);
    const isForeignPerpetrator = /(外国人|外国籍|ベトナム人|中国人|韓国人|フィリピン人|タイ人|ブラジル人|ミャンマー人|米国籍|アメリカ人|米兵|実習生|留学生)[の男女代性0-9０-９（）\s]*[をが]?(逮捕|容疑|送検|再逮捕|起訴|摘発)/.test(item.title) ||
                                /(逮捕|容疑|送検|再逮捕)[の男女代性0-9０-９（）\s]*[は、\s]*(外国人|外国籍|ベトナム|中国|韓国|フィリピン|タイ|ブラジル|ミャンマー|米国|アメリカ|米兵|実習生|留学生)/.test(item.title);
    if (isForeignVictim && !isForeignPerpetrator) {
      console.log(`Removed victim-side item: ${item.title}`);
      continue;
    }

    // 過去の受信チャンク分断で発生した破損文字（\ufffd）の完全修復
    if (item.title.includes('\ufffd')) {
      item.title = item.title
        .replace(/胸を\ufffd+丁で/, '胸を包丁で')
        .replace(/暴行の疑\ufffd+「怖かった」/, '暴行の疑い「怖かった」')
        .replace(/ベトナ\ufffd+料理店/, 'ベトナム料理店')
        .replace(/男女2人殺\ufffd+しようとした/, '男女2人殺害しようとした')
        .replace(/東京都\ufffd+の被害急増/, '東京都内の被害急増')
        .replace(/\ufffd+/g, '');
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

  // 最新日付（2026-08-26 → 2026-08-25 ...）順に厳密ソート
  const finalMerged = [...trulyNew, ...cleanExisting]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10000);

  fs.writeFileSync(NEWS_DATA_PATH, JSON.stringify(finalMerged, null, 2), 'utf-8');
  console.log(`Ultimate Filtering & Mapping Complete! newsData.json updated. Total entries: ${finalMerged.length}`);
}

main().catch(err => {
  console.error('Fatal error during news update:', err);
  process.exit(1);
});
