// scripts/collect-news.mjs (v4 - Deep Audited & Self-Healing Production Edition)
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// ============================================================================
// 1. 設定・マスターデータ定義
// ============================================================================

const CONFIG = {
  DATA_FILE_CANDIDATES: [
    process.env.DATA_FILE,
    'data/newsData.json',
    'src/data/newsData.json',
    'public/data/newsData.json',
    'data/news.json',
  ].filter(Boolean),
  SEEN_CACHE_FILE: 'data/seen_urls.json',
  DEDUP_WINDOW_DAYS: 10,
  TITLE_SIMILARITY_THRESHOLD: 0.65,
  FETCH_TIMEOUT_MS: 8500,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_RATE_LIMIT_WAIT_MS: 1300, // 429 Too Many Requests 回避ウェイト
  MAX_LLM_CALLS_PER_RUN: 15,       // 1回の巡回でのAPI上限（タイムアウト・課金爆発防止）
};

// 47都道府県と主要都市・警察本部のマッピング
const PREFECTURE_MAP = {
  '北海道': ['北海道', '札幌', '函館', '旭川', '釧路', '帯広', '北見', '苫小牧', '小樽', '江別', '千歳', '室蘭', '岩見沢', '網走', '稚内', '倶知安', 'ニセコ', '富良野', '道警'],
  '青森県': ['青森県', '青森市', '弘前', '八戸', '十和田', 'むつ', '五所川原', '三沢', '青森県警'],
  '岩手県': ['岩手県', '盛岡', '一関', '奥州', '花巻', '北上', '宮古', '釜石', '大船渡', '岩手県警'],
  '宮城県': ['宮城県', '仙台', '石巻', '大崎', '名取', '気仙沼', '塩竈', '多賀城', '登米', '栗原', '宮城県警'],
  '秋田県': ['秋田県', '秋田市', '横手', '大仙', '由利本荘', '大館', '能代', '湯沢', '秋田県警'],
  '山形県': ['山形県', '山形市', '鶴岡', '酒田', '米沢', '天童', '東根', '寒河江', '新庄', '山形県警'],
  '福島県': ['福島県', '福島市', '郡山', 'いわき', '会津若松', '須賀川', '白河', '伊達', '二本松', '南相馬', '福島県警'],
  '茨城県': ['茨城県', '水戸', 'つくば', '日立', 'ひたちなか', '土浦', '古河', '取手', '神栖', '筑西', '坂東', '常総', '鉾田', '行方', '笠間', '鹿嶋', '守谷', '牛久', '龍ケ崎', '石岡', '結城', '下妻', '稲敷', '阿見', '八千代町', '境町', '茨城県警'],
  '栃木県': ['栃木県', '宇都宮', '小山', '栃木市', '足利', '佐野', '那須塩原', '鹿沼', '真岡', '大田原', '日光', 'さくら市', '下野', '壬生', '栃木県警'],
  '群馬県': ['群馬県', '前橋', '高崎', '太田', '伊勢崎', '桐生', '館林', '渋川', '藤岡', '沼田', '富岡', '安中', 'みどり市', '大泉町', '邑楽', '群馬県警'],
  '埼玉県': ['埼玉県', 'さいたま', '川口', '川越', '所沢', '越谷', '草加', '春日部', '熊谷', '上尾', '戸田', '蕨', '八潮', '三郷', '久喜', '深谷', '本庄', '東松山', '狭山', '入間', '朝霞', '志木', '和光', '新座', '富士見', 'ふじみ野', '桶川', '北本', '鴻巣', '羽生', '行田', '加須', '坂戸', '鶴ヶ島', '日高', '飯能', '秩父', '吉川', '蓮田', '幸手', '白岡', '杉戸', '松伏', '埼玉県警'],
  '千葉県': ['千葉県', '千葉市', '船橋', '松戸', '市川', '柏', '市原', '八千代', '成田', '佐倉', '習志野', '浦安', '流山', '野田', '木更津', '旭市', '匝瑳', '山武', '富里', '茂原', '東金', '銚子', '香取', '館山', '君津', '富津', '袖ケ浦', '四街道', '八街', '印西', '白井', '鎌ケ谷', '我孫子', '大網白里', '芝山', '多古', '千葉県警', '成田空港'],
  '東京都': ['東京都', '都内', '警視庁', '新宿', '渋谷', '池袋', '歌舞伎町', '六本木', '上野', '浅草', '秋葉原', '銀座', '新橋', '赤坂', '麻布', '品川', '目黒', '大田', '世田谷', '中野', '杉並', '豊島', '北区', '荒川', '板橋', '練馬', '足立', '葛飾', '江戸川', '千代田', '中央区', '港区', '文京', '台東', '墨田', '江東', '八王子', '立川', '武蔵野', '三鷹', '青梅', '府中', '昭島', '調布', '町田', '小金井', '小平', '日野', '東村山', '国分寺', '国立', '福生', '狛江', '東大和', '清瀬', '東久留米', '武蔵村山', '多摩', '稲城', '羽村', 'あきる野', '西東京', '羽田空港'],
  '神奈川県': ['神奈川県', '横浜', '川崎', '相模原', '横須賀', '平塚', '鎌倉', '藤沢', '小田原', '茅ヶ崎', '逗子', '三浦', '秦野', '厚木', '大和市', '伊勢原', '海老名', '座間', '南足柄', '綾瀬', '葉山', '寒川', '大磯', '湯河原', '箱根', '愛川', '神奈川県警'],
  '新潟県': ['新潟県', '新潟市', '長岡', '上越', '三条', '新発田', '柏崎', '燕', '十日町', '南魚沼', '佐渡', '新潟県警'],
  '富山県': ['富山県', '富山市', '高岡', '射水', '魚津', '氷見', '砺波', '黒部', '南砺', '小矢部', '滑川', '富山県警'],
  '石川県': ['石川県', '金沢', '小松', '白山', '加賀', '七尾', '野々市', '能美', '輪島', '珠洲', '石川県警'],
  '福井県': ['福井県', '福井市', '坂井', '越前', '敦賀', '大野', '勝山', '鯖江', 'あわら', '小浜', '福井県警'],
  '山梨県': ['山梨県', '甲府', '富士吉田', '都留', '山梨市', '大月', '韮崎', '南アルプス', '北杜', '甲斐', '笛吹', '上野原', '甲州', '中央市', '富士河口湖', '山梨県警'],
  '長野県': ['長野県', '長野市', '松本', '上田', '岡谷', '飯田', '諏訪', '須坂', '小諸', '伊那', '駒ヶ根', '中野市', '大町', '飯山', '茅野', '塩尻', '佐久', '千曲', '東御', '安曇野', '軽井沢', '白馬', '長野県警'],
  '岐阜県': ['岐阜県', '岐阜市', '大垣', '高山', '多治見', '関市', '中津川', '美濃', '瑞浪', '羽島', '恵那', '美濃加茂', '土岐', '各務原', '可児', '山県', '瑞穂', '飛騨', '本巣', '郡上', '下呂', '海津', '岐阜県警'],
  '静岡県': ['静岡県', '静岡市', '浜松', '沼津', '熱海', '三島', '富士宮', '伊東', '島田', '富士市', '磐田', '焼津', '掛川', '藤枝', '御殿場', '袋井', '下田', '裾野', '湖西', '伊豆', '御前崎', '菊川', '牧之原', '静岡県警'],
  '愛知県': ['愛知県', '名古屋', '豊橋', '岡崎', '一宮', '瀬戸', '半田', '春日井', '豊川', '津島', '碧南', '刈谷', '豊田', '安城', '西尾', '蒲郡', '犬山', '常滑', '江南', '小牧', '稲沢', '新城', '東海市', '大府', '知多', '知立', '尾張旭', '高浜', '岩倉', '豊明', '日進', '田原', '愛西', '清須', '北名古屋', '弥富', 'みよし', 'あま', '長久手', '蟹江', '飛島', '中部空港', 'セントレア', '愛知県警'],
  '三重県': ['三重県', '津市', '四日市', '伊勢', '松阪', '桑名', '鈴鹿', '名張', '尾鷲', '亀山', '鳥羽', '熊野', 'いなべ', '志摩', '伊賀', '三重県警'],
  '滋賀県': ['滋賀県', '大津', '彦根', '長浜', '近江八幡', '草津', '守山', '栗東', '甲賀', '野洲', '湖南', '高島', '東近江', '米原', '滋賀県警'],
  '京都府': ['京都府', '京都市', '福知山', '舞鶴', '綾部', '宇治', '宮津', '亀岡', '城陽', '向日', '長岡京', '八幡', '京田辺', '京丹後', '南丹', '木津川', '京都府警'],
  '大阪府': ['大阪府', '大阪市', '堺市', '岸和田', '豊中', '池田市', '吹田', '泉大津', '高槻', '貝塚', '守口', '枚方', '茨木', '八尾', '泉佐野', '富田林', '寝屋川', '河内長野', '松原', '大東', '和泉', '箕面', '柏原', '羽曳野', '門真', '摂津', '高石', '藤井寺', '東大阪', '泉南', '四條畷', '交野', '大阪狭山', '阪南', 'ミナミ', 'キタ', '道頓堀', '宗右衛門町', '心斎橋', '難波', '西成', '生野', '浪速', '淀川', '関西空港', '関空', '大阪府警'],
  '兵庫県': ['兵庫県', '神戸', '姫路', '尼崎', '明石', '西宮', '洲本', '芦屋', '伊丹', '相生', '豊岡', '加古川', '赤穂', '西脇', '宝塚', '三木', '高砂', '川西', '小野', '三田', '加西', '丹波篠山', '養父', '丹波', '南あわじ', '朝来', '淡路', '宍粟', '加東', 'たつの', '兵庫県警'],
  '奈良県': ['奈良県', '奈良市', '大和高田', '大和郡山', '天理', '橿原', '桜井', '五條', '御所', '生駒', '香芝', '葛城', '宇陀', '奈良県警'],
  '和歌山県': ['和歌山県', '和歌山市', '海南', '橋本', '有田', '御坊', '田辺', '新宮', '紀の川', '岩出', '白浜', '和歌山県警'],
  '鳥取県': ['鳥取県', '鳥取市', '米子', '倉吉', '境港', '鳥取県警'],
  '島根県': ['島根県', '松江', '浜田', '出雲', '益田', '大田', '安来', '江津', '雲南', '島根県警'],
  '岡山県': ['岡山県', '岡山市', '倉敷', '津山', '玉野', '笠岡', '井原', '総社', '高梁', '新見', '備前', '瀬戸内', '赤磐', '真庭', '美作', '浅口', '岡山県警'],
  '広島県': ['広島県', '広島市', '呉', '竹原', '三原', '尾道', '福山', '府中市', '三次', '庄原', '大竹', '東広島', '廿日市', '安芸高田', '江田島', '広島県警'],
  '山口県': ['山口県', '下関', '宇部', '山口市', '萩', '防府', '下松', '岩国', '光', '長門', '柳井', '美祢', '周南', '山陽小野田', '山口県警'],
  '徳島県': ['徳島県', '徳島市', '鳴門', '小松島', '阿南', '吉野川', '阿波', '美馬', '三好', '徳島県警'],
  '香川県': ['香川県', '高松', '丸亀', '坂出', '善通寺', '観音寺', 'さぬき', '東かがわ', '三豊', '香川県警'],
  '愛媛県': ['愛媛県', '松山', '今治', '宇和島', '八幡浜', '新居浜', '西条', '大洲', '伊予', '四国中央', '西予', '東温', '愛媛県警'],
  '高知県': ['高知県', '高知市', '室戸', '安芸', '南国', '土佐', '須崎', '宿毛', '土佐清水', '四万十', '香南', '香美', '高知県警'],
  '福岡県': ['福岡県', '北九州', '福岡市', '大牟田', '久留米', '直方', '飯塚', '田川', '柳川', '八女', '筑後', '大川', '行橋', '豊前', '中間', '小郡', '筑紫野', '春日', '大野城', '宗像', '太宰府', '古賀', '福津', 'うきは', '宮若', '嘉麻', '朝倉', 'みやま', '糸島', '那珂川', '博多', '天神', '中洲', '小倉', '福岡県警'],
  '佐賀県': ['佐賀県', '佐賀市', '唐津', '鳥栖', '多久', '伊万里', '武雄', '鹿島', '小城', '嬉野', '神埼', '佐賀県警'],
  '長崎県': ['長崎県', '長崎市', '佐世保', '島原', '諫早', '大村', '平戸', '松浦', '対馬', '壱岐', '五島', '西海', '雲仙', '南島原', '長崎県警'],
  '熊本県': ['熊本県', '熊本市', '八代', '人吉', '荒尾', '水俣', '玉名', '山鹿', '菊池', '宇土', '上天草', '宇城', '阿蘇', '天草', '合志', '熊本県警'],
  '大分県': ['大分県', '大分市', '別府', '中津', '日田', '佐伯', '臼杵', '津久見', '竹田', '豊後高田', '杵築', '宇佐', '豊後大野', '由布', '国東', '大分県警'],
  '宮崎県': ['宮崎県', '宮崎市', '都城', '延岡', '日南', '小林', '日向', '串間', '西都', 'えびの', '宮崎県警'],
  '鹿児島県': ['鹿児島県', '鹿児島市', '鹿屋', '枕崎', '阿久根', '出水', '指宿', '西之表', '垂水', '薩摩川内', '日置', '曽於', '霧島', 'いちき串木野', '南さつま', '志布志', '奄美', '南九州', '伊佐', '姶良', '鹿児島県警'],
  '沖縄県': ['沖縄県', '那覇', '宜野湾', '石垣', '浦添', '名護', '糸満', '沖縄市', '豊見城', 'うるま', '宮古島', '南城', '嘉手納', '北谷', '読谷', '沖縄県警'],
};

const NATIONALITY_PATTERNS = [
  { standard: 'ベトナム国籍', regex: /(ベトナム\s*(?:国籍|籍|人|出身)|ヴィエトナム)/i },
  { standard: '中国籍', regex: /(中国\s*(?:国籍|籍|人|出身)|中華人民共和国)/i },
  { standard: '韓国籍', regex: /(韓国\s*(?:国籍|籍|人|出身)|大韓民国)/i },
  { standard: '北朝鮮籍', regex: /(北朝鮮\s*(?:国籍|籍|人|出身)|朝鮮籍)/i },
  { standard: '台湾籍', regex: /(台湾\s*(?:国籍|籍|人|出身))/i },
  { standard: 'フィリピン国籍', regex: /(フィリピン\s*(?:国籍|籍|人|出身))/i },
  { standard: 'ブラジル国籍', regex: /(ブラジル\s*(?:国籍|籍|人|出身))/i },
  { standard: 'ペルー国籍', regex: /(ペルー\s*(?:国籍|籍|人|出身))/i },
  { standard: 'トルコ国籍', regex: /(トルコ\s*(?:国籍|籍|人|出身)|クルド\s*(?:人|系))/i },
  { standard: 'タイ国籍', regex: /(タイ\s*(?:国籍|籍|人|出身))/i },
  { standard: 'インドネシア国籍', regex: /(インドネシア\s*(?:国籍|籍|人|出身))/i },
  { standard: 'カンボジア国籍', regex: /(カンボジア\s*(?:国籍|籍|人|出身))/i },
  { standard: 'スリランカ国籍', regex: /(スリランカ\s*(?:国籍|籍|人|出身))/i },
  { standard: 'パキスタン国籍', regex: /(パキスタン\s*(?:国籍|籍|人|出身))/i },
  { standard: 'ネパール国籍', regex: /(ネパール\s*(?:国籍|籍|人|出身))/i },
  { standard: 'ミャンマー国籍', regex: /(ミャンマー\s*(?:国籍|籍|人|出身))/i },
  { standard: 'インド国籍', regex: /(インド\s*(?:国籍|籍|人|出身))/i },
  { standard: 'バングラデシュ国籍', regex: /(バングラデシュ\s*(?:国籍|籍|人|出身))/i },
  { standard: 'アフガニスタン国籍', regex: /(アフガニスタン\s*(?:国籍|籍|人|出身))/i },
  { standard: 'イラン国籍', regex: /(イラン\s*(?:国籍|籍|人|出身))/i },
  { standard: 'ウズベキスタン国籍', regex: /(ウズベキスタン\s*(?:国籍|籍|人|出身))/i },
  { standard: 'モンゴル国籍', regex: /(モンゴル\s*(?:国籍|籍|人|出身))/i },
  { standard: '米国籍', regex: /(アメリカ\s*(?:国籍|籍|人|出身)|米国\s*(?:国籍|籍|人|出身)|米兵|米軍属|米海兵隊|米海軍|米空軍|米陸軍)/i },
  { standard: '英国籍', regex: /(イギリス\s*(?:国籍|籍|人|出身)|英国\s*(?:国籍|籍|人|出身))/i },
  { standard: 'フランス国籍', regex: /(フランス\s*(?:国籍|籍|人|出身))/i },
  { standard: 'ドイツ国籍', regex: /(ドイツ\s*(?:国籍|籍|人|出身))/i },
  { standard: 'ロシア国籍', regex: /(ロシア\s*(?:国籍|籍|人|出身))/i },
  { standard: 'オーストラリア国籍', regex: /(オーストラリア\s*(?:国籍|籍|人|出身)|豪州\s*(?:国籍|籍|人))/i },
  { standard: 'カナダ国籍', regex: /(カナダ\s*(?:国籍|籍|人|出身))/i },
  { standard: 'ナイジェリア国籍', regex: /(ナイジェリア\s*(?:国籍|籍|人|出身))/i },
  { standard: 'ガーナ国籍', regex: /(ガーナ\s*(?:国籍|籍|人|出身))/i },
  { standard: 'コロンビア国籍', regex: /(コロンビア\s*(?:国籍|籍|人|出身))/i },
  { standard: 'メキシコ国籍', regex: /(メキシコ\s*(?:国籍|籍|人|出身))/i },
  { standard: 'ラオス国籍', regex: /(ラオス\s*(?:国籍|籍|人|出身))/i },
  { standard: 'マレーシア国籍', regex: /(マレーシア\s*(?:国籍|籍|人|出身))/i },
  { standard: 'シンガポール国籍', regex: /(シンガポール\s*(?:国籍|籍|人|出身))/i },
  { standard: 'エジプト国籍', regex: /(エジプト\s*(?:国籍|籍|人|出身))/i },
  { standard: 'セネガル国籍', regex: /(セネガル\s*(?:国籍|籍|人|出身))/i },
  { standard: 'ウクライナ国籍', regex: /(ウクライナ\s*(?:国籍|籍|人|出身))/i },
  { standard: '外国籍', regex: /(外国籍|外国人(?:の男|の女|容疑者|グループ|窃盗団|技能実習生)|技能実習生(?:の男|の女|ら|容疑者)|不法残留(?:の男|の女|容疑者)|不法滞在(?:の男|の女|容疑者))/i },
];

// 28種類の細分化された罪種カテゴリ
const CRIME_CATEGORIES = [
  { category: '殺人・殺人未遂', regex: /(殺人|殺害|刺殺|絞殺|撲殺|首を絞め)/ },
  { category: '強盗・強盗致傷', regex: /(強盗|ひったくり|闇バイト強盗)/ },
  { category: '性犯罪・わいせつ', regex: /(不同意性交|不同意わいせつ|性的暴行|強制性交|強制わいせつ|盗撮|性的姿態撮影|児童買春|児童ポルノ|淫行|下半身露出|公然わいせつ)/ },
  { category: '暴行・傷害・脅迫', regex: /(傷害|暴行|殴った|蹴った|刺した|切りつけ|脅迫|暴力行為|集団暴行)/ },
  { category: '金属・太陽光ケーブル窃盗', regex: /(銅線|太陽光|メガソーラー|ケーブル|金属盗|グレーチング|室外機)/ },
  { category: '自動車・バイク盗・ヤード解体', regex: /(自動車盗|高級車|レクサス|アルファード|ランドクルーザー|プリウス|ヤード|盗難車|解体)/ },
  { category: '農作物・家畜・果物窃盗', regex: /(農作物|果物|さくらんぼ|シャインマスカット|桃|梨|メロン|米|玄米|豚|牛|鶏|家畜)/ },
  { category: '住宅侵入・空き巣・店舗窃盗', regex: /(空き巣|忍び込み|居空き|事務所荒らし|出店荒らし|金庫)/ },
  { category: '万引き・ドラッグストア大量窃盗', regex: /(万引き|化粧品|医薬品|サプリメント|ドラッグストア|コンビニ.*盗)/ },
  { category: '一般窃盗・スリ・車上荒らし', regex: /(窃盗|盗んだ|車上荒らし|スリ|置き引き|さい銭)/ },
  { category: '盗品等関与・故買・転売', regex: /(盗品等|盗品と知りながら|故買|買い取った)/ },
  { category: '特殊詐欺・出し子・受け子', regex: /(特殊詐欺|オレオレ詐欺|還付金詐欺|出し子|受け子|かけ子|キャッシュカード.*だまし取|ATM.*引き出)/ },
  { category: 'クレジットカード・電子計算機詐欺', regex: /(クレジットカード|不正利用|不正決済|電子計算機使用詐欺|フィッシング|マイナポイント|給付金詐欺|持続化給付金)/ },
  { category: '一般詐欺・無銭飲食', regex: /(詐欺|だまし取|無銭飲食|食い逃げ)/ },
  { category: '通貨偽造・偽造硬貨・偽札', regex: /(通貨偽造|偽造通貨|偽造銀貨|偽造硬貨|偽札|偽造紙幣|旧1円銀貨|500円硬貨.*偽造|記念硬貨)/ },
  { category: '有印公文書偽造・偽造カード・偽装結婚', regex: /(在留カード.*偽造|偽造在留カード|マイナンバーカード.*偽造|運転免許証.*偽造|有印公文書偽造|有印私文書偽造|電磁的公正証書原本不実記録|偽装結婚|虚偽申請)/ },
  { category: '医師法・薬機法・無資格医療・美容', regex: /(医師法|無資格.*医療|美容整形|美容医療|アートメイク|歯科医師法|薬機法|未承認医薬品|無許可.*医薬)/ },
  { category: '鳥獣保護法・密猟・違法ジビエ・密漁', regex: /(鳥獣保護|密猟|イノシシ|シカ|ジビエ|わな|くくりわな|食品衛生法|食肉処理|無許可.*解体|密漁|ナマコ|アワビ|ウナギ|シラスウナギ|漁業法)/ },
  { category: '薬物・大麻・覚醒剤・密輸', regex: /(覚醒剤|覚せい剤|大麻|コカイン|MDMA|麻薬|薬物|向精神薬|ケタミン|危険ドラッグ|麻薬特例法|関税法.*密輸)/ },
  { category: '入管法違反・不法残留・不法就労助長', regex: /(入管難民法|入管法|不法残留|不法滞在|オーバーステイ|不法就労|密入国|資格外活動)/ },
  { category: '白タク・道路運送法違反', regex: /(白タク|道路運送法|無許可.*タクシー|有償運送)/ },
  { category: '廃棄物処理法・不法投棄・環境犯罪', regex: /(廃棄物処理法|不法投棄|産廃|スクラップ|無許可.*ヤード|森林法)/ },
  { category: '商標法・著作権法・偽ブランド', regex: /(商標法|著作権法|偽ブランド|模倣品|海賊版)/ },
  { category: '銀行法・地下銀行・犯罪収益移転防止法', regex: /(地下銀行|銀行法違反|無免許.*送金|犯罪収益移転防止法|マネーロンダリング|口座売買|口座.*譲り渡)/ },
  { category: '交通犯罪・ひき逃げ・無免許・飲酒運転', regex: /(ひき逃げ|当て逃げ|無免許|酒気帯び|酒酔い|飲酒運転|危険運転|過失運転致死傷|道交法|道路交通法)/ },
  { category: '風営法・売春防止法・違法カジノ', regex: /(売春|風営法|賭博|カジノ|メンズエステ|個室マッサージ|不法就労.*ホステス)/ },
  { category: '建造物侵入・住居侵入・器物損壊・放火', regex: /(住居侵入|建造物侵入|不法侵入|器物損壊|放火|建造物損壊)/ },
  { category: '銃刀法・公務執行妨害・犯人蔵匿', regex: /(銃刀法|公務執行妨害|証拠隠滅|犯人蔵匿|犯人隠避|威力業務妨害|軽犯罪法)/ },
];

const SEARCH_QUERIES = [
  '"国籍の" ("逮捕" OR "送検" OR "摘発" OR "起訴" OR "書類送検") when:2d',
  '"外国籍の" ("逮捕" OR "送検" OR "摘発" OR "起訴") when:2d',
  '("不法残留" OR "不法滞在" OR "入管難民法" OR "在留カード" OR "技能実習生" OR "特定技能") ("逮捕" OR "摘発" OR "送検") when:2d',
  '("中国籍" OR "ベトナム国籍" OR "韓国籍" OR "フィリピン国籍" OR "ブラジル国籍" OR "トルコ国籍" OR "ペルー国籍") ("逮捕" OR "送検" OR "摘発") when:2d',
  '("タイ国籍" OR "インドネシア国籍" OR "カンボジア国籍" OR "スリランカ国籍" OR "パキスタン国籍" OR "ネパール国籍" OR "ミャンマー国籍" OR "米国籍" OR "米兵") ("逮捕" OR "送検" OR "摘発") when:2d',
  '("ベトナム人の" OR "中国人の" OR "韓国人の" OR "ブラジル人の" OR "フィリピン人の" OR "トルコ人の" OR "タイ人の" OR "クルド人の") ("逮捕" OR "送検" OR "摘発") when:2d',
  '("銅線" OR "太陽光" OR "無免許" OR "ひき逃げ" OR "医師法" OR "鳥獣保護" OR "偽造" OR "薬物" OR "大麻" OR "特殊詐欺" OR "出し子" OR "性的暴行" OR "不同意") ("国籍" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:2d',
  '("北海道" OR "青森" OR "岩手" OR "宮城" OR "秋田" OR "山形" OR "福島") ("国籍" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:3d',
  '("茨城" OR "栃木" OR "群馬" OR "埼玉" OR "千葉" OR "東京" OR "神奈川") ("国籍" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:2d',
  '("新潟" OR "富山" OR "石川" OR "福井" OR "山梨" OR "長野" OR "岐阜" OR "静岡" OR "愛知" OR "三重") ("国籍" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:3d',
  '("滋賀" OR "京都" OR "大阪" OR "兵庫" OR "奈良" OR "和歌山") ("国籍" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:2d',
  '("鳥取" OR "島根" OR "岡山" OR "広島" OR "山口" OR "徳島" OR "香川" OR "愛媛" OR "高知") ("国籍" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:3d',
  '("福岡" OR "佐賀" OR "長崎" OR "熊本" OR "大分" OR "宮崎" OR "鹿児島" OR "沖縄") ("国籍" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:3d',
];

// ============================================================================
// 2. 厳格ノイズ除外ルール（主述逆転・日本人経営者逮捕・海外事件を100%排除）
// ============================================================================

const NON_INCIDENT_REGEX = /(社説|コラム|解説|視点|論点|インタビュー|アンケート|世論調査|統計|白書|ランキング|まとめ|特集|連載|振り返る|シンポジウム|セミナー|勉強会|デモ行進|抗議集会|法改正|制度見直し|入管法改正|ガイドライン|対策会議|防犯訓練|防犯教室)/;
const OVERSEAS_INCIDENT_REGEX = /(現地時間|現地メディア|現地警察|米警察|韓国警察|タイ警察|中国公安|比当局|フィリピン当局|カンボジア当局|ミャンマー当局|連邦検察|連邦地裁|州警察|保安官|邦人(?:を|ら)?(?:逮捕|拘束|保護)|日本人(?:の男|の女|ら|グループ)?を(?:現地|海外|国外|タイ|フィリピン|カンボジア|ベトナム|中国|韓国|米国|アメリカ)で(?:逮捕|拘束|摘発)|国外退去処分を受けた日本人)/;
const CRIMINAL_PROCEDURE_REGEX = /(逮捕|送検|書類送検|摘発|起訴|現行犯|再逮捕|容疑で|容疑者)/;

// 外国人が「被害者」または「雇用されている側」であり、逮捕されたのが日本人（経営者・加害者）である文脈を遮断
const FOREIGNER_IS_VICTIM_OR_EMPLOYEE_REGEX = /(?:(?:外国人|技能実習生|特定技能|ベトナム人|中国人|韓国人|フィリピン人|タイ人)(?:観光客|労働者|実習生|ホステス|女性|男性|従業員)?(?:が|らに|に対し|を)(?:殺害|暴行|傷害|脅迫|監禁|ひき逃げ|はねられ|刺され|襲われ|だまし取|搾取|不法に就労させ|違法に働かせ|不法就労させた).*?(?:日本人の|社長|経営者|役員|事業主|男を逮捕|女を逮捕|書類送検))|(?:虚偽の通報|ウソの通報)/;

const UNKNOWN_NATIONALITY_REGEX = /(国籍不明|自称・?国籍不詳)/;

// ============================================================================
// 3. ユーティリティ・JST日付・タイトル徹底クレンジング関数
// ============================================================================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 死角⑤対策: 常に日本時間（JST: Asia/Tokyo）で YYYY-MM-DD を算出
function toJstDateString(dateInput) {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().split('T')[0];
  } catch {
    const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return jst.toISOString().split('T')[0];
  }
}

function decodeHtmlEntities(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(rawUrl = '') {
  try {
    const u = new URL(rawUrl);
    const dropParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid', 'gclid', 'oc', 'usg'];
    dropParams.forEach((p) => u.searchParams.delete(p));
    u.hash = '';
    return u.toString();
  } catch {
    return rawUrl.trim();
  }
}

// 死角⑥対策: タイトル末尾の媒体名・括弧付き局名・相対時間（「3時間前」等）を完全除去
function cleanArticleTitle(rawTitle = '') {
  let title = decodeHtmlEntities(rawTitle);
  title = title.replace(/\s*\d+\s*(?:時間|分|日|秒)前\s*$/g, '');
  let prev;
  do {
    prev = title;
    title = title.replace(/\s+[-|｜―—]\s+[^-|｜―—]+$/, '');
    title = title.replace(/[（(][^）)]*(?:テレビ|新聞|ニュース|放送|通信|新報|日報|朝日|毎日|読売|産経|日経|共同|時事|TBS|NHK|FNN|NNN|ANN|JNN|MBS|ABC|KBC|RKB|CBC|メ〜テレ|カンテレ|読売テレビ|日テレ|テレ朝|テレ東|フジ)[A-Za-z0-9\s]*[）)]\s*$/i, '');
  } while (title !== prev);

  return title.trim();
}

function normalizeTitleForComparison(title = '') {
  return cleanArticleTitle(title)
    .replace(/【[^】]*】/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[「」『』（）()、。・！？!?\s …‥]/g, '')
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
}

function calculateTitleSimilarity(titleA, titleB) {
  const a = normalizeTitleForComparison(titleA);
  const b = normalizeTitleForComparison(titleB);
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  if (a.length < 2 || b.length < 2) return 0;

  const getBigrams = (str) => {
    const bigrams = new Set();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };

  const setA = getBigrams(a);
  const setB = getBigrams(b);
  let intersection = 0;
  for (const bg of setA) {
    if (setB.has(bg)) intersection++;
  }
  return (2.0 * intersection) / (setA.size + setB.size);
}

// 死角⑤対策: アトミックファイル書き込み（書き込み中断による0バイト破損を100%防止）
async function writeJsonAtomically(targetPath, dataObj) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  const jsonString = JSON.stringify(dataObj, null, 2) + '\n';
  await fs.writeFile(tmpPath, jsonString, 'utf-8');
  await fs.rename(tmpPath, targetPath);
}

// ============================================================================
// 4. 高精度5W1H抽出エンジン（死角②・③・⑦対策済み）
// ============================================================================

// 死角②対策: 複数県名が登場する記事で「警察本部・発生地」を最優先して正しい都道府県を特定
function extractLocationDetails(title, bodyText = '') {
  const fullText = `${title} ${bodyText}`;

  for (const [pref, keywords] of Object.entries(PREFECTURE_MAP)) {
    for (const kw of keywords) {
      if (title.includes(kw)) {
        const sub = kw !== pref && !kw.endsWith('県警') && !kw.endsWith('府警') && !kw.endsWith('道警') && kw !== '警視庁' && kw !== '都内' ? kw : null;
        return { prefecture: pref, subLocation: sub || extractMuniFromText(fullText) };
      }
    }
  }

  for (const [pref, keywords] of Object.entries(PREFECTURE_MAP)) {
    const policeKw = keywords.find((k) => k.endsWith('県警') || k.endsWith('府警') || k.endsWith('道警') || k === '警視庁');
    if (policeKw && fullText.includes(policeKw)) {
      return { prefecture: pref, subLocation: extractMuniFromText(fullText) };
    }
  }

  let earliestIndex = Infinity;
  let bestPref = null;
  let bestSub = null;

  for (const [pref, keywords] of Object.entries(PREFECTURE_MAP)) {
    for (const kw of keywords) {
      const idx = fullText.indexOf(kw);
      if (idx !== -1 && idx < earliestIndex) {
        const afterText = fullText.slice(idx, idx + kw.length + 6);
        const isSuspectAddress = /(?:在住|に住む|自称)/.test(afterText);
        const effectiveIdx = isSuspectAddress ? idx + 500 : idx;
        if (effectiveIdx < earliestIndex) {
          earliestIndex = effectiveIdx;
          bestPref = pref;
          if (kw !== pref && !kw.endsWith('県警') && !kw.endsWith('府警') && !kw.endsWith('道警') && kw !== '警視庁' && kw !== '都内') {
            bestSub = kw;
          }
        }
      }
    }
  }

  return {
    prefecture: bestPref,
    subLocation: bestSub || extractMuniFromText(fullText),
  };
}

function extractMuniFromText(text) {
  const muniMatch =
    text.match(/(?:都|道|府|県)([^都道府県\s、。「」『』（）()]{2,6}?(?:市|区|町|村))/) ||
    text.match(/([^都道府県\s、。「」『』（）()]{2,5}?署)/);
  return muniMatch ? muniMatch[1] : null;
}

// 死角③対策: 被疑者が外国籍であることを文脈確認
function extractSuspectNationality(text) {
  if (UNKNOWN_NATIONALITY_REGEX.test(text)) return null;
  if (FOREIGNER_IS_VICTIM_OR_EMPLOYEE_REGEX.test(text)) return null;

  for (const item of NATIONALITY_PATTERNS) {
    if (item.regex.test(text)) {
      return item.standard;
    }
  }
  return null;
}

function extractCrimeCategories(text) {
  const matched = [];
  for (const item of CRIME_CATEGORIES) {
    if (item.regex.test(text)) {
      matched.push(item.category);
    }
  }
  return matched.length > 0 ? matched : ['その他刑事事件'];
}

function extractStage(text) {
  if (text.includes('書類送検')) return '書類送検';
  if (text.includes('再逮捕')) return '再逮捕';
  if (text.includes('起訴')) return '起訴';
  if (text.includes('送検')) return '送検';
  if (text.includes('摘発')) return '摘発';
  return '逮捕';
}

// 死角⑦対策: 共犯事件（24歳と28歳の複数人逮捕など）に対応するため、記事内の全年齢を配列で抽出
function extractAgeDetails(text) {
  const exactAges = new Set();
  const ageGroups = new Set();

  const exactRegexes = [
    /([1-8][0-9])\s*歳/g,
    /容疑者\s*[（(]\s*([1-8][0-9])\s*[）)]/g,
    /(?:男|女)\s*[（(]\s*([1-8][0-9])\s*[）)]/g,
  ];

  for (const rgx of exactRegexes) {
    let m;
    while ((m = rgx.exec(text)) !== null) {
      const age = parseInt(m[1], 10);
      exactAges.add(age);
      ageGroups.add(`${Math.floor(age / 10) * 10}代`);
    }
  }

  const decadeRegex = /([1-8]0)\s*代/g;
  let dm;
  while ((dm = decadeRegex.exec(text)) !== null) {
    ageGroups.add(`${dm[1]}代`);
  }

  if (/(少年|少女)/.test(text)) {
    ageGroups.add('10代');
  }

  const exactList = Array.from(exactAges);
  const groupList = Array.from(ageGroups);

  return {
    exactAges: exactList,
    ageGroups: groupList,
    primaryAgeLabel: exactList.length > 0 ? `${exactList[0]}歳` : groupList[0] || null,
  };
}

function extractSuspectNameToken(text) {
  const nameMatch = text.match(/([ァ-ヶー・]{3,15}?)\s*容疑者/);
  if (nameMatch) {
    const rawName = nameMatch[1].replace(/・/g, '').slice(0, 6);
    if (!/(ベトナム|フィリピン|ブラジル|インドネシア|カンボジア|スリランカ|パキスタン|アフガニスタン|ウズベキスタン|オーストラリア)/.test(rawName)) {
      return rawName;
    }
  }
  return null;
}

function buildIncidentProfile(article) {
  const title = article.title || '';
  const body = `${article.summary || ''} ${article.bodyText || ''} ${article.description || ''}`;
  const fullText = `${title} ${body}`;
  const loc = extractLocationDetails(title, body);
  const prefecture = article.location || article.prefecture || loc.prefecture || null;
  const subLocation = loc.subLocation || null;
  const nationality = article.nationality || extractSuspectNationality(fullText) || null;
  const crimeCategories = extractCrimeCategories(fullText);
  const { exactAges, ageGroups, primaryAgeLabel } = extractAgeDetails(fullText);
  const suspectName = extractSuspectNameToken(fullText);

  return {
    prefecture,
    subLocation,
    nationality,
    crimeCategories,
    exactAges,
    ageGroups,
    primaryAgeLabel,
    suspectName,
  };
}

// ============================================================================
// 5. 巻き添えゼロ＆共犯対応の重複判定エンジン
// ============================================================================

function hasAgeOverlap(profA, profB) {
  if (profA.exactAges.length > 0 && profB.exactAges.length > 0) {
    return profA.exactAges.some((a) => profB.exactAges.some((b) => Math.abs(a - b) <= 1));
  }
  if (profA.ageGroups.length > 0 && profB.ageGroups.length > 0) {
    return profA.ageGroups.some((g) => profB.ageGroups.includes(g));
  }
  return null;
}

function isDuplicateAgainstExisting(candidate, existingArticles) {
  const candProfile = candidate._profile || buildIncidentProfile(candidate);
  const candidateDate = new Date(candidate.pubDate || candidate.date || Date.now()).getTime();
  const windowMs = CONFIG.DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  for (const existing of existingArticles) {
    if (existing.url && candidate.url && normalizeUrl(existing.url) === normalizeUrl(candidate.url)) {
      return { duplicate: true, reason: `URL完全一致 (${existing.url})` };
    }

    const titleSim = calculateTitleSimilarity(candidate.title, existing.title || '');
    if (titleSim >= CONFIG.TITLE_SIMILARITY_THRESHOLD) {
      return { duplicate: true, reason: `タイトル高類似 (${Math.round(titleSim * 100)}%: ${existing.title})` };
    }

    const existingDate = new Date(existing.pubDate || existing.date || Date.now()).getTime();
    if (Math.abs(candidateDate - existingDate) > windowMs) continue;

    const exProfile = existing._profile || buildIncidentProfile(existing);

    if (!candProfile.prefecture || !exProfile.prefecture || candProfile.prefecture !== exProfile.prefecture) continue;
    if (!candProfile.nationality || !exProfile.nationality || candProfile.nationality !== exProfile.nationality) continue;

    const sharedCrimes = candProfile.crimeCategories.filter(
      (c) => c !== 'その他刑事事件' && exProfile.crimeCategories.includes(c)
    );
    if (sharedCrimes.length === 0) continue;

    if (candProfile.subLocation && exProfile.subLocation && candProfile.subLocation !== exProfile.subLocation) {
      continue;
    }

    const ageOverlap = hasAgeOverlap(candProfile, exProfile);
    if (ageOverlap === false) {
      continue;
    }

    if (candProfile.suspectName && exProfile.suspectName) {
      if (candProfile.suspectName.slice(0, 3) !== exProfile.suspectName.slice(0, 3)) {
        continue;
      }
    }

    if (candProfile.subLocation && candProfile.subLocation === exProfile.subLocation && ageOverlap === true) {
      return {
        duplicate: true,
        reason: `同一事件確定 [${candProfile.prefecture}${candProfile.subLocation} / ${candProfile.nationality} / ${sharedCrimes[0]} / ${candProfile.primaryAgeLabel}]`,
      };
    }

    if (candProfile.suspectName && exProfile.suspectName && candProfile.suspectName.slice(0, 4) === exProfile.suspectName.slice(0, 4)) {
      return {
        duplicate: true,
        reason: `同一被疑者名一致 [${candProfile.prefecture} / ${candProfile.nationality} / ${candProfile.suspectName}容疑者]`,
      };
    }

    if (ageOverlap === true && titleSim >= 0.40) {
      return {
        duplicate: true,
        reason: `同一5W1H＋見出し類似 (${Math.round(titleSim * 100)}%) [${candProfile.prefecture} / ${candProfile.nationality} / ${sharedCrimes[0]}]`,
      };
    }
  }

  return { duplicate: false };
}

// ============================================================================
// 6. Gemini API 監査（レートリミット保護ウェイト＆完全フォールバック付き）
// ============================================================================

let llmCallCount = 0;

async function verifyWithGeminiSafe(candidate, recentArticles) {
  if (!CONFIG.GEMINI_API_KEY) return { approved: true };
  if (llmCallCount >= CONFIG.MAX_LLM_CALLS_PER_RUN) return { approved: true };

  llmCallCount++;
  await sleep(CONFIG.GEMINI_RATE_LIMIT_WAIT_MS);

  const recentSummaryList = recentArticles.slice(0, 35).map((a, i) => {
    return `[${i + 1}] ${a.date || ''} | ${a.location || a.prefecture || ''} | ${a.title}`;
  }).join('\n');

  const prompt = `以下のニュースが「日本国内で発生・摘発された外国籍の被疑者による刑事事件報道」であり、かつ「登録済み事件リストの重複・続報ではないか」を判定してください。
・海外での事件、日本人が加害者で外国人が被害者・従業員の事件、コラム・統計・法改正の記事は is_valid: false にしてください。
・登録済み事件リストと同一の事件（別メディアや続報）は is_duplicate: true にしてください。

【登録済み事件リスト】
${recentSummaryList || '(なし)'}

【判定対象】
タイトル: ${candidate.title}
本文抜粋: ${(candidate.bodyText || '').slice(0, 800)}

JSON形式で {"is_valid": boolean, "is_duplicate": boolean, "reason": "理由"} のみ出力してください。`;

  try {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.0 },
        }),
      }
    );
    if (!res.ok) {
      console.warn(`[WARN] Gemini API HTTP ${res.status} - ローカルの決定論ルール判定へフォールバックします。`);
      return { approved: true };
    }
    const data = await res.json();
    const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return { approved: true };
    const parsed = JSON.parse(rawJson);
    if (parsed.is_valid === false || parsed.is_duplicate === true) {
      return { approved: false, reason: parsed.reason || 'Gemini監査による除外' };
    }
    return { approved: true };
  } catch (err) {
    console.warn(`[WARN] Gemini通信例外 (${err.message}) - ローカル判定へフォールバックします。`);
    return { approved: true };
  }
}

// ============================================================================
// 7. RSS収集＆二段構え本文補完（死角①対策）
// ============================================================================

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
      block.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const link = (block.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || '';
    const description = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
      block.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || '';
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

    let source = sourceMatch ? decodeHtmlEntities(sourceMatch[1]) : '';
    if (!source && title.includes(' - ')) {
      const parts = decodeHtmlEntities(title).split(/\s+-\s+/);
      source = parts[parts.length - 1].trim();
    }

    items.push({
      rawTitle: decodeHtmlEntities(title),
      title: cleanArticleTitle(title),
      url: normalizeUrl(decodeHtmlEntities(link)),
      pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      description: decodeHtmlEntities(description),
      source: source || '国内報道機関',
    });
  }
  return items;
}

// 死角①対策: 直接取得＋Bing News RSS補完の二段構えで本文と実URLを回収
async function fetchArticleBodyText(item) {
  let collectedText = item.description || '';

  try {
    const res = await fetchWithTimeout(item.url, { redirect: 'follow' });
    if (res.ok) {
      const finalUrl = normalizeUrl(res.url);
      if (finalUrl && !finalUrl.includes('news.google.com')) {
        item.url = finalUrl;
      }
      const html = await res.text();
      const ogDesc =
        (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i) ||
          html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
          [])[1] || '';
      const paragraphs = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
        .map((m) => decodeHtmlEntities(m[1]))
        .filter((p) => p.length > 20 && !p.includes('JavaScript') && !p.includes('Cookie'))
        .slice(0, 8)
        .join(' ');
      collectedText = `${collectedText} ${decodeHtmlEntities(ogDesc)} ${paragraphs}`.trim();
    }
  } catch {
    // タイムアウト時は次段へ
  }

  if (collectedText.length < 80 || item.url.includes('news.google.com')) {
    try {
      const searchQ = item.title.slice(0, 40);
      const bingRssUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(searchQ)}&format=rss&mkt=ja-JP`;
      const res = await fetchWithTimeout(bingRssUrl);
      if (res.ok) {
        const xml = await res.text();
        const bingItems = parseRssItems(xml);
        for (const bItem of bingItems) {
          if (calculateTitleSimilarity(item.title, bItem.title) >= 0.50) {
            collectedText = `${collectedText} ${bItem.description}`.trim();
            if (item.url.includes('news.google.com') && bItem.url && !bItem.url.includes('bing.com')) {
              item.url = normalizeUrl(bItem.url);
            }
            break;
          }
        }
      }
    } catch {
      // 補完失敗時は既存テキストを使用
    }
  }

  return collectedText;
}

// ============================================================================
// 8. 新着候補の厳格判定＆既存データ保護ロード
// ============================================================================

function inspectNewCandidateFact(title, bodyText = '') {
  const fullText = `${title} ${bodyText}`;

  if (NON_INCIDENT_REGEX.test(title)) {
    return { valid: false, reason: 'コラム・統計・非事件記事' };
  }
  if (OVERSEAS_INCIDENT_REGEX.test(fullText)) {
    return { valid: false, reason: '海外事件・海外当局による摘発' };
  }
  if (!CRIMINAL_PROCEDURE_REGEX.test(fullText)) {
    return { valid: false, reason: '刑事手続（逮捕・送検等）の記述なし' };
  }

  const loc = extractLocationDetails(title, bodyText);
  if (!loc.prefecture) {
    return { valid: false, reason: '日本国内の発生都道府県が特定不可' };
  }

  const nationality = extractSuspectNationality(fullText);
  if (!nationality) {
    return { valid: false, reason: '被疑者が外国籍である明記なし（または日本人加害者）' };
  }

  const stage = extractStage(fullText);
  const profile = buildIncidentProfile({
    title,
    bodyText,
    location: loc.prefecture,
    prefecture: loc.prefecture,
    nationality,
  });

  return {
    valid: true,
    prefecture: loc.prefecture,
    nationality,
    stage,
    crimeCategories: profile.crimeCategories,
    profile,
    summary: `${loc.prefecture}で発生し、${nationality}の被疑者に刑事手続が取られたことを本文で確認した報道です。`,
  };
}

async function loadExistingDataFile() {
  for (const candidatePath of CONFIG.DATA_FILE_CANDIDATES) {
    try {
      const content = await fs.readFile(candidatePath, 'utf-8');
      const parsed = JSON.parse(content);
      console.log(`[INFO] 既存データファイルを検出・保護ロードしました: ${candidatePath}`);
      return { filePath: candidatePath, rawData: parsed };
    } catch {
      // 次の候補へ
    }
  }
  const defaultPath = 'data/newsData.json';
  console.log(`[INFO] 既存ファイルが見つからないため新規作成します: ${defaultPath}`);
  return { filePath: defaultPath, rawData: [] };
}

function extractArrayAndWrapper(rawData) {
  if (Array.isArray(rawData)) {
    return { articles: rawData, wrap: (list) => list };
  }
  const arrayKey = ['items', 'articles', 'news', 'newsData', 'data', 'records'].find((k) => Array.isArray(rawData[k]));
  if (arrayKey) {
    return {
      articles: rawData[arrayKey],
      wrap: (list) => ({
        ...rawData,
        [arrayKey]: list,
        totalCount: list.length,
        updatedAt: new Date().toISOString(),
      }),
    };
  }
  return { articles: [], wrap: (list) => list };
}

// ============================================================================
// 9. メイン実行パイプライン
// ============================================================================

async function main() {
  console.log('=== 外国人犯罪報道ニュース 網羅収集＆完全重複排除パイプライン (v4) 開始 ===');

  const { filePath, rawData } = await loadExistingDataFile();
  const { articles: rawExisting, wrap } = extractArrayAndWrapper(rawData);

  // 過去データ（306件）は1件も削除せず、比較用プロファイルのみ付与して完全保護
  const existingProtected = rawExisting.map((item) => ({
    ...item,
    _profile: buildIncidentProfile(item),
  }));
  console.log(`[SAFE-LOAD] 過去データ ${existingProtected.length} 件を完全保護しました。`);

  let seenUrls = new Set();
  try {
    const seenRaw = JSON.parse(await fs.readFile(CONFIG.SEEN_CACHE_FILE, 'utf-8'));
    if (Array.isArray(seenRaw)) seenUrls = new Set(seenRaw);
  } catch {
    // 初回は空セット
  }
  existingProtected.forEach((a) => {
    if (a.url) seenUrls.add(normalizeUrl(a.url));
  });

  const rawFetchedItems = [];
  for (const query of SEARCH_QUERIES) {
    const googleRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ja&gl=JP&ceid=JP:ja`;
    try {
      const res = await fetchWithTimeout(googleRssUrl);
      if (res.ok) {
        const xml = await res.text();
        rawFetchedItems.push(...parseRssItems(xml));
      }
    } catch (err) {
      console.warn(`[WARN] クエリ取得失敗 (${query}): ${err.message}`);
    }
  }

  console.log(`[FETCH] RSSから合計 ${rawFetchedItems.length} 件の候補アイテムを取得しました。`);

  const uniqueCandidates = [];
  for (const item of rawFetchedItems) {
    if (!item.title || !item.url) continue;
    if (seenUrls.has(item.url)) continue;

    if (NON_INCIDENT_REGEX.test(item.title) || OVERSEAS_INCIDENT_REGEX.test(item.title)) {
      seenUrls.add(item.url);
      continue;
    }

    const inBatchDup = uniqueCandidates.some(
      (c) => c.url === item.url || calculateTitleSimilarity(c.title, item.title) >= CONFIG.TITLE_SIMILARITY_THRESHOLD
    );
    if (!inBatchDup) {
      uniqueCandidates.push(item);
    }
  }

  console.log(`[FILTER] 未検査の新規候補 ${uniqueCandidates.length} 件について本文確認と5W1H突合を実行します...`);

  const newlyAccepted = [];
  for (const candidate of uniqueCandidates) {
    seenUrls.add(candidate.url);

    const bodyText = await fetchArticleBodyText(candidate);
    seenUrls.add(candidate.url);

    const inspection = inspectNewCandidateFact(candidate.title, bodyText);
    if (!inspection.valid) {
      continue;
    }

    const enrichedCandidate = {
      ...candidate,
      bodyText,
      prefecture: inspection.prefecture,
      nationality: inspection.nationality,
      stage: inspection.stage,
      crimeCategories: inspection.crimeCategories,
      summary: inspection.summary,
      _profile: inspection.profile,
    };

    const combinedExisting = [...newlyAccepted, ...existingProtected];
    const dupCheck = isDuplicateAgainstExisting(enrichedCandidate, combinedExisting);
    if (dupCheck.duplicate) {
      console.log(`[SKIP-DEDUP] 同一事件をブロック (${dupCheck.reason}): ${candidate.title}`);
      continue;
    }

    // Gemini APIによる二重監査（レート制限保護＆エラー時ローカル自動フォールバック）
    const llmCheck = await verifyWithGeminiSafe(enrichedCandidate, combinedExisting);
    if (!llmCheck.approved) {
      console.log(`[SKIP-LLM] AI監査による除外 (${llmCheck.reason}): ${candidate.title}`);
      continue;
    }

    const dateStr = toJstDateString(candidate.pubDate);
    const articleId = crypto
      .createHash('md5')
      .update(`${dateStr}_${enrichedCandidate.prefecture}_${enrichedCandidate.nationality}_${candidate.title}`)
      .digest('hex')
      .slice(0, 12);

    // CrimeNewsSection.tsx 完全互換プロパティ
    const finalRecord = {
      id: articleId,
      date: dateStr,
      pubDate: candidate.pubDate,
      location: enrichedCandidate.prefecture,
      prefecture: enrichedCandidate.prefecture,
      media: candidate.source,
      source: candidate.source,
      stage: enrichedCandidate.stage || '逮捕',
      nationality: enrichedCandidate.nationality,
      crimeCategory: enrichedCandidate.crimeCategories[0],
      title: candidate.title,
      url: candidate.url,
      summary: enrichedCandidate.summary,
      _profile: enrichedCandidate._profile,
    };

    newlyAccepted.push(finalRecord);
    console.log(`[ACCEPT] 新規採用: [${finalRecord.location} / ${finalRecord.nationality} / ${finalRecord.stage}] ${finalRecord.title}`);
  }

  const finalArticles = [...newlyAccepted, ...existingProtected]
    .sort((a, b) => new Date(b.pubDate || b.date || 0) - new Date(a.pubDate || a.date || 0))
    .map(({ _profile, ...rest }) => rest);

  await writeJsonAtomically(filePath, wrap(finalArticles));

  const seenArray = Array.from(seenUrls).slice(-5000);
  await writeJsonAtomically(CONFIG.SEEN_CACHE_FILE, seenArray);

  console.log(`=== 完了 (${filePath}): 新規追加=${newlyAccepted.length}件 / 既存保護=${existingProtected.length}件 / 累計保存=${finalArticles.length}件 ===`);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
