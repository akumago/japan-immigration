// scripts/collect-news.mjs (v5 - Unified Strict Verification & Zero-Duplicate Production Edition)
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const aiGate = require('./lib/ai-gate.cjs');
const articleFetcher = require('./lib/article-fetcher.cjs');
const eventDedupe = require('./lib/event-dedupe.cjs');
const publicationLedger = require('./lib/publication-ledger.cjs');
const rssSources = require('./lib/rss-sources.cjs');
const publisherListings = require('./lib/publisher-listings.cjs');
const policeBulletins = require('./lib/police-bulletins.cjs');

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
  MERGED_LEDGER_FILE: 'data/merged.json',
  REMOVED_LEDGER_FILE: 'data/removed.json',
  DEDUP_WINDOW_DAYS: 14,
  TITLE_SIMILARITY_THRESHOLD: 0.62,
  FETCH_TIMEOUT_MS: 8500,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_RATE_LIMIT_WAIT_MS: 1300,
  MAX_LLM_CALLS_PER_RUN: 15,
};

const NATIONALITY_PATTERNS = [
  { standard: 'ベトナム国籍', regex: /(ベトナム\s*(?:国籍|籍|人|出身|系)|ヴィエトナム)/i },
  { standard: '中国籍', regex: /(中国\s*(?:国籍|籍|人|出身|系)|中華人民共和国)/i },
  { standard: '韓国籍', regex: /(韓国\s*(?:国籍|籍|人|出身|系)|大韓民国)/i },
  { standard: '北朝鮮籍', regex: /(北朝鮮\s*(?:国籍|籍|人|出身)|朝鮮籍)/i },
  { standard: '台湾籍', regex: /(台湾\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'フィリピン国籍', regex: /(フィリピン\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'ブラジル国籍', regex: /(ブラジル\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'ペルー国籍', regex: /(ペルー\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'トルコ国籍', regex: /(トルコ\s*(?:国籍|籍|人|出身|系)|クルド\s*(?:人|系))/i },
  { standard: 'タイ国籍', regex: /(タイ\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'インドネシア国籍', regex: /(インドネシア\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'カンボジア国籍', regex: /(カンボジア\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'スリランカ国籍', regex: /(スリランカ\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'パキスタン国籍', regex: /(パキスタン\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'ネパール国籍', regex: /(ネパール\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'ミャンマー国籍', regex: /(ミャンマー\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'インド国籍', regex: /(インド\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'バングラデシュ国籍', regex: /(バングラデシュ\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'アフガニスタン国籍', regex: /(アフガニスタン\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'イラン国籍', regex: /(イラン\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'ウズベキスタン国籍', regex: /(ウズベキスタン\s*(?:国籍|籍|人|出身|系))/i },
  { standard: 'モンゴル国籍', regex: /(モンゴル\s*(?:国籍|籍|人|出身|系))/i },
  { standard: '米国籍', regex: /(アメリカ\s*(?:国籍|籍|人|出身)|米国\s*(?:国籍|籍|人|出身)|米兵|米軍(?:属|兵|関係者|隊員)|在日米軍|米(?:海兵隊|海軍|空軍|陸軍))/i },
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

// 28種類の細分化された罪種カテゴリ（「米兵」が「米」にマッチするバグおよび「スリランカ」が「スリ」にマッチするバグを完全排除）
const CRIME_CATEGORIES = [
  { category: '殺人・殺人未遂', regex: /(殺人|殺害|刺殺|絞殺|撲殺|首を絞め|強殺|胸などを刺|背中を刺|首を刺)/ },
  { category: '強盗・強盗致傷', regex: /(強盗|ひったくり|闇バイト強盗|脅し.{0,12}奪|現金奪)/ },
  { category: '性犯罪・わいせつ', regex: /(不同意性交|不同意わいせつ|わいせつな?行為|性的暴行|強制性交|強制わいせつ|盗撮|性的姿態撮影|児童買春|児童ポルノ|淫行|下半身露出|公然わいせつ|胸を触|体を触)/ },
  { category: '暴行・傷害・脅迫', regex: /(傷害|暴行|殴った|蹴った|刺した|刺され|切りつけ|切り付け|噛みつ|嚙みつ|脅迫|恐喝|暴力行為|集団暴行|平手打ち)/ },
  { category: '金属・太陽光ケーブル窃盗', regex: /(銅線|太陽光|メガソーラー|ケーブル|金属盗|グレーチング|室外機)/ },
  { category: '自動車・バイク盗・ヤード解体', regex: /(自動車盗|高級車|レクサス|アルファード|ランドクルーザー|プリウス|ヤード|盗難車)/ },
  { category: '農作物・家畜・果物窃盗', regex: /(農作物|果物|さくらんぼ|シャインマスカット|桃|梨|メロン|コメ|玄米|白米|新米|米袋|米\d+キロ|豚|牛|鶏|家畜)/ },
  { category: '住宅侵入・空き巣・店舗窃盗', regex: /(空き巣|忍び込み|居空き|事務所荒らし|出店荒らし|金庫|質店.*窃盗|質店.*盗|住宅に侵入.*盗|空き家に侵入.*盗)/ },
  { category: '万引き・ドラッグストア大量窃盗', regex: /(万引き|化粧品|医薬品|サプリメント|ドラッグストア|コンビニ.*盗)/ },
  { category: '一般窃盗・スリ・車上荒らし', regex: /(窃盗|盗んだ|盗み|盗む|盗もう|車上荒らし|スリ(?!ランカ)|置き引き|さい銭|ロッカー物色)/ },
  { category: '盗品等関与・故買・転売', regex: /(盗品等|盗品を保管|盗品と知りながら|故買|買い取った)/ },
  { category: '特殊詐欺・出し子・受け子', regex: /(特殊詐欺|オレオレ詐欺|還付金詐欺|出し子|受け子|かけ子|架け子|キャッシュカード.*だまし取|ATM.*引き出)/ },
  { category: 'クレジットカード・電子計算機詐欺', regex: /(クレジットカード|不正利用|不正決済|電子計算機使用詐欺|フィッシング|ボイスフィッシング|偽サイト.*メール|誘導メール|大量メール送信|大量送信|マイナポイント|給付金詐欺|持続化給付金)/ },
  { category: '一般詐欺・無銭飲食', regex: /(詐欺|だまし取|詐取|無銭飲食|食い逃げ)/ },
  { category: '通貨偽造・偽造硬貨・偽札', regex: /(通貨偽造|偽造通貨|偽造銀貨|偽造硬貨|1万円銀貨|一万円銀貨|偽造1万円|偽札|偽造紙幣|旧1円銀貨|500円硬貨.*偽造|記念硬貨)/ },
  { category: '有印公文書偽造・偽造カード・偽装結婚', regex: /(在留カード.*偽造|偽造在留カード|マイナンバーカード.*偽造|運転免許証.*偽造|偽造.*運転免許証|有印公文書偽造|偽造有印公文書|有印私文書偽造|電磁的公正証書原本不実記録|偽装結婚|虚偽申請)/ },
  { category: '医師法・薬機法・無資格医療・美容', regex: /(医師法|無資格.*医療|美容整形|美容医療|アートメイク|歯科医師法|薬機法|医薬品医療機器法|処方箋なし|未承認医薬品|無許可.*医薬)/ },
  { category: '鳥獣保護法・密猟・違法ジビエ・密漁', regex: /(鳥獣保護|密猟|イノシシ|シカ|ジビエ|わな|くくりわな|食品衛生法|食肉処理|無許可.*解体|密漁|ナマコ|アワビ|ウナギ|シラスウナギ|漁業法|オカヤドカリ|文化財保護法)/ },
  { category: '薬物・大麻・覚醒剤・密輸', regex: /(覚醒剤|覚せい剤|大麻|コカイン|MDMA|麻薬|薬物|向精神薬|ケタミン|危険ドラッグ|麻薬特例法|関税法.*密輸|家畜伝染病予防法|検疫法)/ },
  { category: '入管法違反・不法残留・不法就労助長', regex: /(入管難民法|入管法|不法残留|不法滞在|オーバーステイ|不法就労|密入国|資格外活動|旅券不携帯)/ },
  { category: '白タク・道路運送法違反', regex: /(白タク|道路運送法|無許可.*タクシー|有償運送)/ },
  { category: '廃棄物処理法・不法投棄・環境犯罪', regex: /(廃棄物処理法|不法投棄|産廃|スクラップ|無許可.*ヤード|森林法)/ },
  { category: '商標法・著作権法・偽ブランド', regex: /(商標法|著作権法|偽ブランド|偽ロゴ|模倣品|海賊版|ニセ物|偽物|偽サプリ)/ },
  { category: '銀行法・地下銀行・犯罪収益移転防止法', regex: /(地下銀行|銀行法違反|無免許.*送金|犯罪収益移転防止法|マネーロンダリング|資金洗浄|口座売買|口座.*譲り渡|出資法|闇金|ヤミ金)/ },
  { category: '交通犯罪・ひき逃げ・無免許・飲酒運転', regex: /(ひき逃げ|当て逃げ|無免許|酒気帯び|酒酔い|飲酒運転|飲酒して.*事故|危険運転|過失運転致死傷|死亡事故|玉突き事故|車突入|車突っ込|道交法|道路交通法)/ },
  { category: '風営法・売春防止法・違法カジノ', regex: /(売春|風営法|賭博|カジノ|メンズエステ|個室マッサージ|不法就労.*ホステス)/ },
  { category: '建造物侵入・住居侵入・器物損壊・放火', regex: /(住居侵入|建造物侵入|不法侵入|器物損壊|器物破損|放火|建造物損壊)/ },
  { category: '銃刀法・公務執行妨害・犯人蔵匿', regex: /(銃刀法|公務執行妨害|証拠隠滅|犯人蔵匿|犯人隠避|威力業務妨害|偽計業務妨害|軽犯罪法)/ },
];

const GOOGLE_NEWS_QUERIES = [
  '"国籍の" ("逮捕" OR "送検" OR "摘発" OR "起訴" OR "書類送検") when:2d',
  '"外国籍の" ("逮捕" OR "送検" OR "摘発" OR "起訴") when:2d',
  '("不法残留" OR "不法滞在" OR "入管難民法" OR "在留カード" OR "技能実習生" OR "特定技能") ("逮捕" OR "摘発" OR "送検") when:2d',
  '("中国籍" OR "ベトナム国籍" OR "韓国籍" OR "台湾籍" OR "フィリピン国籍" OR "ブラジル国籍" OR "トルコ国籍" OR "ペルー国籍") ("逮捕" OR "送検" OR "摘発" OR "起訴") when:2d',
  '("タイ国籍" OR "インドネシア国籍" OR "カンボジア国籍" OR "スリランカ国籍" OR "パキスタン国籍" OR "ネパール国籍" OR "ミャンマー国籍" OR "インド国籍" OR "米国籍" OR "米兵" OR "米海兵隊") ("逮捕" OR "送検" OR "摘発" OR "起訴") when:2d',
  '("ベトナム人の" OR "中国人の" OR "韓国人の" OR "ブラジル人の" OR "フィリピン人の" OR "トルコ人の" OR "タイ人の" OR "クルド人の" OR "スリランカ人の") ("逮捕" OR "送検" OR "摘発") when:2d',
  '("銅線" OR "太陽光" OR "無免許" OR "ひき逃げ" OR "医師法" OR "鳥獣保護" OR "偽造" OR "薬物" OR "大麻" OR "特殊詐欺" OR "出し子" OR "受け子" OR "性的暴行" OR "不同意") ("国籍" OR "中国籍" OR "韓国籍" OR "台湾籍" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:2d',
  '("北海道" OR "青森" OR "岩手" OR "宮城" OR "秋田" OR "山形" OR "福島") ("国籍" OR "中国籍" OR "韓国籍" OR "台湾籍" OR "ベトナム人" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:3d',
  '("茨城" OR "栃木" OR "群馬" OR "埼玉" OR "千葉" OR "東京" OR "神奈川") ("国籍" OR "中国籍" OR "韓国籍" OR "台湾籍" OR "ベトナム人" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:2d',
  '("新潟" OR "富山" OR "石川" OR "福井" OR "山梨" OR "長野" OR "岐阜" OR "静岡" OR "愛知" OR "三重") ("国籍" OR "中国籍" OR "韓国籍" OR "台湾籍" OR "ベトナム人" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:3d',
  '("滋賀" OR "京都" OR "大阪" OR "兵庫" OR "奈良" OR "和歌山") ("国籍" OR "中国籍" OR "韓国籍" OR "台湾籍" OR "ベトナム人" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:2d',
  '("鳥取" OR "島根" OR "岡山" OR "広島" OR "山口" OR "徳島" OR "香川" OR "愛媛" OR "高知") ("国籍" OR "中国籍" OR "韓国籍" OR "台湾籍" OR "ベトナム人" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:3d',
  '("福岡" OR "佐賀" OR "長崎" OR "熊本" OR "大分" OR "宮崎" OR "鹿児島" OR "沖縄") ("国籍" OR "中国籍" OR "韓国籍" OR "台湾籍" OR "米兵" OR "技能実習生" OR "不法残留") ("逮捕" OR "送検") when:3d',
];

// ============================================================================
// 2. 厳格ノイズ除外ルール（社説・コラム・政治要請・議会答弁・抗議・遺族談話・海外事件を100%排除）
// ============================================================================

const NON_INCIDENT_REGEX = /(?:社説|論説|社論|オピニオン|コラム|解説|視点|論点|提言|インタビュー|アンケート|世論調査|統計|白書|ランキング|まとめ|特集|連載|振り返る|シンポジウム|セミナー|勉強会|デモ行進|抗議集会|法改正|制度見直し|入管法改正|ガイドライン|対策会議|防犯訓練|防犯教室|有識者|エキスパートトピ|【[^】]*(?:解説|詳報|前編|後編|中編|連載|特集)[^】]*】|[一-龥ァ-ヶ]{2,8}(?:大|大学)(?:講師|教授|准教授|名誉教授)\s*$|メッセージの遅さ|極めて遺憾|日米と県協議|協定の改定|改定が必要|パリピ生活|水際で阻止|応えよ$|求めよ$|べきだ$|とは…|できたワケ|の正体|とは何か|^[▽▼■◆●]\s*[上中下前後0-9０-９]|連帯広げる|不安抱く社会|浮かび上がる[^。]*の「?構図」?|専門家が語る|だまされないための対策|エックス速報|合同巡回で米兵[^。]*外出禁止違反|憲兵隊が拘束|事件受けたパトロール|(?:事件|逮捕)[^。]{0,10}受け[^。]*(?:要請|抗議|答弁|集会|声明|談話|コメント|申し入れ|削除依頼|怒りの声|外出制限)|(?:首相|外務省|防衛省|政府|米軍)に[^。]*(?:要請|抗議|申し入れ)|(?:知事|市長|官房長官|大臣)[^。]*(?:再発防止|要請|抗議|注視|言及|批判|遺憾)|県議会[^。]*答弁|市民団体[^。]*(?:抗議|集会|怒りの声|要請|声明)|遺族(?:が|ら|も)[^。]*(?:コメント|談話|手記)|被害者へ中傷|中傷[^。]*削除依頼|日米共同演習|相次いで先島に飛来|FRIDAY|フライデー|逮捕直後の.*表情|初公判の傍聴券|傍聴席に.*姿|[＝=]中国ネット)/i;

const OVERSEAS_INCIDENT_REGEX = /(現地時間|現地メディア|現地警察|米警察|韓国警察|タイ警察|中国公安|比当局|フィリピン当局|カンボジア当局|ミャンマー当局|連邦検察|連邦地裁|州警察|保安官|邦人(?:を|ら)?(?:逮捕|拘束|保護)|日本人(?:の男|の女|ら|グループ)?を(?:現地|海外|国外|タイ|フィリピン|カンボジア|ベトナム|中国|韓国|米国|アメリカ)で(?:逮捕|拘束|摘発)|国外退去処分を受けた日本人)/;

// ============================================================================
// 3. ユーティリティ・JST日付・タイトル徹底クレンジング関数
// ============================================================================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function toJstDateString(dateInput) {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().split('T')[0];
  } catch {
    const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return jst.toISOString().split('T')[0];
  }
}

function decodeHtmlEntities(text = '') {
  return String(text || '')
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
    return String(rawUrl || '').trim();
  }
}

// タイトル末尾の媒体名・二重括弧付き局名（「（メ〜テレ（名古屋テレビ））」等）・角括弧県名・相対時間を完全除去
function cleanArticleTitle(rawTitle = '') {
  let title = decodeHtmlEntities(rawTitle).normalize('NFKC');
  title = title.replace(/\s*\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日\s*\d{1,2}:\d{2}\s*$/g, '');
  title = title.replace(/\s*\d+\s*(?:時間|分|日|秒)前\s*$/g, '');
  let prev;
  do {
    prev = title;
    title = title.replace(/\s+[-|｜―—]\s+[^-|｜―—]{1,35}$/, '');
    // 二重括弧「（メ〜テレ（名古屋テレビ））」や単一括弧の媒体名を末尾から除去（年齢「(37)」は残す）
    title = title.replace(/\s*[（(](?!\d{1,3}[）)])(?:[^（）()]|[（(][^（）()]*[）)])*(?:テレビ|新聞|ニュース|放送|通信|新報|日報|タイムス|朝日|毎日|読売|産経|日経|共同|時事|TBS|NHK|FNN|NNN|ANN|JNN|MBS|ABC|KBC|RKB|CBC|HBC|STV|HTB|UHB|TBC|ABS|TUY|TUF|BSN|SBC|UTY|SBS|ＳＢＳ|メ〜テレ|中京|東海|カンテレ|読売テレビ|日テレ|テレ朝|テレ東|フジ|サンテレビ|KBS|RCC|KRY|RNC|RNB|RKC|TNC|FBS|TVQ|STS|KTN|KKT|TOS|UMK|MBC|KTS|QAB|OTV|RBC)[A-Za-z0-9\s（）()]*[）)]\s*$/i, '');
  } while (title !== prev);

  return title.trim();
}

function normalizeTitleForComparison(title = '') {
  return cleanArticleTitle(title)
    .replace(/【[^】]*】/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[「」『』（）()、。・！？!?\s …‥―—\-~〜:：]/g, '')
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

async function writeJsonAtomically(targetPath, dataObj) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  const jsonString = JSON.stringify(dataObj, null, 2) + '\n';
  await fs.writeFile(tmpPath, jsonString, 'utf-8');
  await fs.rename(tmpPath, targetPath);
}

// ============================================================================
// 4. 5W1H抽出エンジン（ai-gate.cjs の1,741市区町村辞書・主述結合検証と完全連動）
// ============================================================================

function standardizeNationality(rawNatText = '', fallbackFullText = '') {
  const target = `${rawNatText} ${fallbackFullText}`;
  // まず ai-gate.cjs の natOccurrences で「被疑者側（suspect: true）」と判定された最初の国籍表記を優先抽出
  const occs = [
    ...aiGate.natOccurrences(rawNatText).filter((o) => o.suspect),
    ...aiGate.natOccurrences(fallbackFullText).filter((o) => o.suspect),
  ];
  const candidateTexts = occs.length > 0 ? [occs[0].text, rawNatText, target] : [rawNatText, target];

  for (const text of candidateTexts) {
    if (!text) continue;
    for (const item of NATIONALITY_PATTERNS) {
      if (item.regex.test(text)) return item.standard;
    }
    const genericCountry = String(text).match(/^([ァ-ヴー一-龥]{2,12}?)(?:国籍|籍|人|出身|系)$/);
    if (genericCountry && genericCountry[1] !== '日本' && genericCountry[1] !== '外国') {
      return `${genericCountry[1]}国籍`;
    }
  }
  return rawNatText ? '外国籍' : null;
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
  const s = aiGate.determineStage(text);
  if (s) return s;
  if (/(?:判決|有罪|実刑|懲役|禁錮|拘禁刑|罰金)/.test(text)) return '判決';
  if (text.includes('書類送検')) return '送検';
  if (text.includes('再逮捕')) return '再逮捕';
  if (text.includes('起訴')) return '起訴';
  if (text.includes('送検')) return '送検';
  if (text.includes('摘発')) return '逮捕';
  return '逮捕';
}

function extractAgeDetails(text) {
  const normalized = String(text || '')
    .normalize('NFKC')
    // 被害者の年齢表記（「30代男性」「男性(32)」「70歳の女性」「7歳だった男子小学生」等）を除外して被疑者年齢のみを抽出
    .replace(/[1-8][0-9]\s*歳(?:だった)?(?:の)?\s*(?:男性|女性|男児|女児|小学生|中学生|高校生|児童|生徒|被害者)/g, '')
    .replace(/(?:男性|女性|男児|女児|被害者)\s*[（(]\s*[1-8][0-9]\s*(?:歳)?\s*[）)]/g, '')
    .replace(/[1-8]0\s*代(?:の)?\s*(?:男性|女性|被害者)/g, '');
  const exactAges = new Set();
  const ageGroups = new Set();

  const exactRegexes = [
    /([1-8][0-9])\s*歳/g,
    /容疑者\s*[（(]\s*([1-8][0-9])\s*[）)]/g,
    /(?:男|女|被告)\s*[（(]\s*([1-8][0-9])\s*[）)]/g,
  ];

  for (const rgx of exactRegexes) {
    let m;
    while ((m = rgx.exec(normalized)) !== null) {
      const age = parseInt(m[1], 10);
      exactAges.add(age);
      ageGroups.add(`${Math.floor(age / 10) * 10}代`);
    }
  }

  const decadeRegex = /([1-8]0)\s*代/g;
  let dm;
  while ((dm = decadeRegex.exec(normalized)) !== null) {
    ageGroups.add(`${dm[1]}代`);
  }

  if (/(少年|少女)/.test(normalized)) {
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

function extractMuniFromText(text) {
  const clean = aiGate.cleanPoliceAndResidence(String(text || '').normalize('NFKC'));
  const muniMatch =
    clean.match(/(?:都|道|府|県)([^都道府県\s、。「」『』（）()]{2,6}?(?:市|区|町|村))/) ||
    clean.match(/([一-龥ぁ-んァ-ヶー]{2,6}?(?:市|区|町|村))/);
  return muniMatch ? muniMatch[1] : null;
}

function extractSuspectNameToken(text) {
  const nameMatch = String(text || '').normalize('NFKC').match(/([ァ-ヶー・]{3,15}?)\s*(?:容疑者|被告)/);
  if (nameMatch) {
    const rawName = nameMatch[1].replace(/・/g, '').slice(0, 6);
    if (!/(ベトナム|フィリピン|ブラジル|インドネシア|カンボジア|スリランカ|パキスタン|アフガニスタン|ウズベキスタン|オーストラリア)/.test(rawName)) {
      return rawName;
    }
  }
  return null;
}

function extractAccompliceToken(text) {
  const t = String(text || '').normalize('NFKC');
  if (/夫婦|妻と夫|夫と妻|男女2人/.test(t)) return 'COUPLE_OR_PAIR';
  const m = t.match(/([2-9])\s*人(?:を|ら|組)?(?:逮捕|送検|起訴|摘発)/);
  if (m) return `GROUP_${m[1]}`;
  return null;
}

function splitLocationPrefAndMuni(rawLoc = '') {
  const loc = String(rawLoc || '').normalize('NFKC').trim();
  if (!loc || loc === '全国') return { prefecture: null, muni: null };
  const h = eventDedupe.locationHierarchy({ location: loc });
  if (h?.prefecture) {
    return { prefecture: h.prefecture, muni: h.locality || null };
  }
  const m = loc.match(/^(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)(.*)$/);
  if (m) {
    const rest = m[2].trim();
    return { prefecture: m[1], muni: rest || null };
  }
  return { prefecture: null, muni: null };
}

function buildIncidentProfile(article) {
  const title = cleanArticleTitle(article.title || '');
  const evSuspect = article.evidence?.suspect || article.audit?.suspectRole?.evidence || '';
  const evNat = article.evidence?.nationality || article.audit?.foreignNationality?.evidence || '';
  const locBasis = article.locationBasis || article.audit?.japanCrime?.evidence || '';
  const summary = article.summary || '';
  const body = `${evSuspect} ${evNat} ${locBasis} ${summary} ${article.bodyText || ''} ${article.description || ''}`;
  const fullText = `${title} ${body}`;

  const fromStored = splitLocationPrefAndMuni(article.location || article.prefecture || '');
  const resolvedScene = aiGate.resolveCrimeSceneInContext(title) || aiGate.resolvePrefecture(title);
  const prefecture = fromStored.prefecture || resolvedScene?.pref || null;

  const subLocation =
    fromStored.muni ||
    extractMuniFromText(title) ||
    extractMuniFromText(evSuspect) ||
    extractMuniFromText(locBasis) ||
    null;

  const specificNat = standardizeNationality(evNat, fullText);
  const nationality =
    (article.nationality && article.nationality !== '外国籍' ? article.nationality : null) ||
    specificNat ||
    article.nationality ||
    null;
  const crimeCategories = extractCrimeCategories(fullText);
  const { exactAges, ageGroups, primaryAgeLabel } = extractAgeDetails(fullText);
  const suspectName = extractSuspectNameToken(fullText);
  const accompliceToken = extractAccompliceToken(fullText);

  return {
    prefecture,
    subLocation,
    nationality,
    crimeCategories,
    exactAges,
    ageGroups,
    primaryAgeLabel,
    suspectName,
    accompliceToken,
  };
}

// ============================================================================
// 5. 二段構え重複判定エンジン（5W1Hプロファイル突合 ＋ event-dedupe.cjs アンカー突合）
// ============================================================================

function hasAgeOverlap(profA, profB) {
  if (profA.exactAges.length > 0 && profB.exactAges.length > 0) {
    return profA.exactAges.some((a) => profB.exactAges.some((b) => Math.abs(a - b) <= 1));
  }
  if (profA.ageGroups.length > 0 && profB.ageGroups.length > 0) {
    return profA.ageGroups.some((g) => profB.ageGroups.includes(g));
  }
  return null; // どちらか（または両方）に年齢表記がない場合
}

function isSameOrParentMuni(muniA, muniB) {
  if (!muniA || !muniB) return false;
  return muniA === muniB || muniA.startsWith(muniB) || muniB.startsWith(muniA);
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

    // 第1段: event-dedupe.cjs の厳格イベント重複エンジンで検査
    const eventReason = eventDedupe.sameEventReason(candidate, existing);
    if (eventReason && !eventDedupe.isFollowUp(existing, candidate)) {
      return {
        duplicate: true,
        reason: `event-dedupe一致 (${eventReason}: ${existing.title})`,
      };
    }

    // 第2段: 28罪種カテゴリ＆5W1Hプロファイルによる重複検査（年齢未記載記事のすり抜けも防止）
    const existingDate = new Date(existing.pubDate || existing.date || Date.now()).getTime();
    const diffDays = Math.abs(candidateDate - existingDate) / (24 * 60 * 60 * 1000);
    if (Math.abs(candidateDate - existingDate) > windowMs) continue;

    const exProfile = existing._profile || buildIncidentProfile(existing);


    if (!candProfile.nationality || !exProfile.nationality || candProfile.nationality !== exProfile.nationality) continue;

    const sharedCrimes = candProfile.crimeCategories.filter(
      (c) => c !== 'その他刑事事件' && exProfile.crimeCategories.includes(c)
    );
    if (sharedCrimes.length === 0) continue;

    // 確定0: カタカナ被疑者名が一致し同国籍・同罪種の場合は、犯行現場とアジト・警察署所在地等の県名揺れを越えて重複と判定
    if (candProfile.suspectName && exProfile.suspectName && candProfile.suspectName.length >= 3 && exProfile.suspectName.length >= 3) {
      if (candProfile.suspectName.slice(0, 4) === exProfile.suspectName.slice(0, 4)) {
        return {
          duplicate: true,
          reason: `同一被疑者名一致(跨県含む) [${candProfile.prefecture || '不明'} vs ${exProfile.prefecture || '不明'} / ${candProfile.nationality} / ${candProfile.suspectName}容疑者]`,
        };
      }
    }

    if (!candProfile.prefecture || !exProfile.prefecture || candProfile.prefecture !== exProfile.prefecture) continue;

    // 市区町村が双方に明記されており、かつ食い違っている場合は別事件として保護（政令市と区の親子関係は同一扱い）
    if (candProfile.subLocation && exProfile.subLocation && !isSameOrParentMuni(candProfile.subLocation, exProfile.subLocation)) {
      continue;
    }

    // 実年齢が双方に明記されており、かつ食い違っている場合は別事件として保護
    const ageOverlap = hasAgeOverlap(candProfile, exProfile);
    if (ageOverlap === false) {
      continue;
    }

    // カタカナ名が双方に明記されており、かつ食い違っている場合は別事件として保護
    if (candProfile.suspectName && exProfile.suspectName) {
      if (candProfile.suspectName.slice(0, 3) !== exProfile.suspectName.slice(0, 3)) {
        continue;
      }
    }

    // 確定1: カタカナ被疑者名が一致
    if (candProfile.suspectName && exProfile.suspectName && candProfile.suspectName.slice(0, 4) === exProfile.suspectName.slice(0, 4)) {
      return {
        duplicate: true,
        reason: `同一被疑者名一致 [${candProfile.prefecture} / ${candProfile.nationality} / ${candProfile.suspectName}容疑者]`,
      };
    }

    // 確定2: 同県・同国籍・同罪種で、市区町村が一致（年齢一致または年齢片方省略）
    if (candProfile.subLocation && exProfile.subLocation && isSameOrParentMuni(candProfile.subLocation, exProfile.subLocation)) {
      return {
        duplicate: true,
        reason: `同一事件確定(自治体一致) [${candProfile.prefecture}${candProfile.subLocation} / ${candProfile.nationality} / ${sharedCrimes[0]}]`,
      };
    }

    // 確定3: 同県・同国籍・同罪種で、年齢一致
    if (ageOverlap === true) {
      return {
        duplicate: true,
        reason: `同一5W1H＋年齢一致 [${candProfile.prefecture} / ${candProfile.nationality} / ${sharedCrimes[0]} / ${candProfile.primaryAgeLabel}]`,
      };
    }

    // 確定4: 追跡ウィンドウ（14日）以内に同県・同国籍・同じ具体的罪種（28分類）で、自治体・実年齢・氏名に矛盾（Conflict）が一切ない場合は同一事件
    if (diffDays <= CONFIG.DEDUP_WINDOW_DAYS) {
      return {
        duplicate: true,
        reason: `同一5W1H(同県・同国籍・同罪種・矛盾なし) [${candProfile.prefecture} / ${candProfile.nationality} / ${sharedCrimes[0]}]`,
      };
    }
  }

  return { duplicate: false };
}

// ============================================================================
// 6. Gemini API 監査（オプション・レート制限保護付き）
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

  const prompt = `以下のニュースが「日本国内で発生・摘発された外国籍の被疑者による刑事事件そのものの報道」であり、かつ「登録済み事件リストの重複ではないか」を判定してください。
・海外での事件、日本人が加害者で外国人が被害者・従業員の事件、社説・コラム・解説・知事の要請・県議会答弁・市民団体の抗議集会・遺族コメントの記事は is_valid: false にしてください。
・登録済み事件リストと同一の事件は is_duplicate: true にしてください。

【登録済み事件リスト】
${recentSummaryList || '(なし)'}

【判定対象】
タイトル: ${candidate.title}
本文抜粋: ${(candidate.bodyText || '').slice(0, 800)}

JSON形式で {"is_valid": boolean, "is_duplicate": boolean, "reason": "理由"} のみ出力してください。`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT_MS);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.0 },
        }),
      }
    );
    clearTimeout(timer);
    if (!res.ok) return { approved: true };
    const data = await res.json();
    const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return { approved: true };
    const parsed = JSON.parse(rawJson);
    if (parsed.is_valid === false || parsed.is_duplicate === true) {
      return { approved: false, reason: parsed.reason || 'Gemini監査による除外' };
    }
    return { approved: true };
  } catch {
    return { approved: true };
  }
}

// ============================================================================
// 7. 全国網羅収集＆Google News URL解決・純粋本文コンテナ抽出
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

function parseRssItems(xml, defaultSource = '国内報道機関') {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
      block.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const link = (block.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) ||
      block.match(/<dc:date>([\s\S]*?)<\/dc:date>/i) || [])[1] || '';
    const description = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
      block.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || '';
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

    let source = sourceMatch ? decodeHtmlEntities(sourceMatch[1]) : '';
    if (!source && title.includes(' - ')) {
      const parts = decodeHtmlEntities(title).split(/\s+-\s+/);
      source = parts[parts.length - 1].trim();
    }

    let rawLink = decodeHtmlEntities(link).trim();
    if (rawLink.includes('bing.com/news/apiclick.aspx')) {
      try {
        const u = new URL(rawLink);
        const embedded = u.searchParams.get('url');
        if (embedded) rawLink = embedded;
      } catch {
        // ignore
      }
    }

    items.push({
      rawTitle: decodeHtmlEntities(title),
      title: cleanArticleTitle(title),
      url: normalizeUrl(rawLink),
      pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      description: decodeHtmlEntities(description),
      source: source || defaultSource,
    });
  }
  return items;
}

const googleSpacer = articleFetcher.createSpacer(600);
const NON_NEWS_DOMAIN_RE = /(?:rocket-boys\.co\.jp|shueisha\.online|bunshun\.jp|dailyshincho\.jp|gendai\.media|toyokeizai\.net|diamond\.jp|president\.jp|jbpress\.ismedia\.jp|mag2\.com|note\.com|ameblo\.jp|fc2\.com|hatenablog\.com|qiita\.com|zenn\.dev|wikipedia\.org|chiebukuro\.yahoo\.co\.jp|5ch\.net|bakusai\.com|togetter\.com|posfie\.com|x\.com|twitter\.com|youtube\.com|tiktok\.com|instagram\.com|facebook\.com|bengo4\.com)/i;

// article-fetcher.cjs の batchexecute URLデコード＆サイドバー完全除去を優先使用し、失敗時はBing/Yahooスニペットで補完
async function resolveUrlAndPureArticleBody(item) {
  if (item.sourceBody && item.sourceBody.length >= 40) {
    return item.sourceBody;
  }
  let text = '';
  try {
    let targetUrl = item.url;
    if (targetUrl.includes('news.google.com')) {
      const resolved = await articleFetcher.resolveGoogleNewsUrl(targetUrl, articleFetcher.httpRequest, googleSpacer);
      if (resolved?.url && !resolved.url.includes('news.google.com') && !NON_NEWS_DOMAIN_RE.test(resolved.url)) {
        targetUrl = normalizeUrl(resolved.url);
        item.url = targetUrl;
      }
    }
    if (!targetUrl.includes('news.google.com') && !NON_NEWS_DOMAIN_RE.test(targetUrl)) {
      const pageUrl = articleFetcher.photoPageToArticleUrl(targetUrl) || targetUrl;
      const resp = await articleFetcher.httpRequest(pageUrl, { timeoutMs: CONFIG.FETCH_TIMEOUT_MS, maxBytes: 900000 });
      if (resp.status >= 200 && resp.status < 300) {
        if (resp.finalUrl && !resp.finalUrl.includes('news.google.com') && !NON_NEWS_DOMAIN_RE.test(resp.finalUrl)) {
          item.url = normalizeUrl(resp.finalUrl);
        }
        const decodedHtml = articleFetcher.decodeHtml(resp.body, resp.headers?.['content-type']);
        text = articleFetcher.extractArticleText(decodedHtml, item.title, 8000);
      }
    }
  } catch {
    // フォールバックへ
  }

  // 本文が短い、またはGoogle News URLが解けなかった場合はBing News RSSで元記事URLとスニペットを回収
  if (text.length < 80 || item.url.includes('news.google.com')) {
    try {
      const searchQ = item.title.slice(0, 42);
      const bingRssUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(searchQ)}&format=rss&mkt=ja-JP`;
      const res = await fetchWithTimeout(bingRssUrl);
      if (res.ok) {
        const xml = await res.text();
        const bingItems = parseRssItems(xml);
        for (const bItem of bingItems) {
          if (bItem.url && NON_NEWS_DOMAIN_RE.test(bItem.url)) continue;
          if (calculateTitleSimilarity(item.title, bItem.title) >= 0.50) {
            if (item.url.includes('news.google.com') && bItem.url && !bItem.url.includes('bing.com') && !NON_NEWS_DOMAIN_RE.test(bItem.url)) {
              item.url = normalizeUrl(bItem.url);
              try {
                const resp2 = await articleFetcher.httpRequest(item.url, { timeoutMs: CONFIG.FETCH_TIMEOUT_MS, maxBytes: 900000 });
                if (resp2.status >= 200 && resp2.status < 300) {
                  const decodedHtml2 = articleFetcher.decodeHtml(resp2.body, resp2.headers?.['content-type']);
                  text = articleFetcher.extractArticleText(decodedHtml2, item.title, 8000);
                }
              } catch {
                // ignore
              }
            }
            if (!text && bItem.description) {
              text = bItem.description;
            }
            break;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return text;
}

// ============================================================================
// 8. 厳格3要素結合検証（ai-gate.cjs 連携：同一文の被疑者国籍×刑事述語×国内現場）
// ============================================================================

function inspectCandidateWithStrictGate(title, bodyText = '') {
  const cleanTitle = cleanArticleTitle(title);

  // 1. 社説・コラム・政治要請・議会答弁・市民団体・遺族コメント・海外事件を即座に100%排除
  if (NON_INCIDENT_REGEX.test(cleanTitle)) {
    return { valid: false, reason: '社説・コラム・政治反応・議会答弁・非事件記事' };
  }
  if (OVERSEAS_INCIDENT_REGEX.test(`${cleanTitle} ${bodyText}`)) {
    return { valid: false, reason: '海外事件・海外当局による摘発' };
  }

  // 2. ai-gate.cjs の verifyArticleContent（同一1文内での主述結合＋トピック整合ガード＋1,741市区町村現場特定）
  let gateResult = aiGate.verifyArticleContent(bodyText, cleanTitle);

  // 本文がペイウォール等で未取得/短文の場合のみ、見出し単体で3要素が100%明記されているか verifyHeadlineOnly で検査
  if (!gateResult.verified && !gateResult.rejected && (!bodyText || bodyText.length < 120)) {
    gateResult = aiGate.verifyHeadlineOnly(cleanTitle);
  }

  if (!gateResult.verified || gateResult.rejected || !gateResult.location || gateResult.location === '全国') {
    return {
      valid: false,
      reason: gateResult.rejectReason || gateResult.pendingReason || '3要素（外国籍被疑者・刑事手続・国内現場）の文脈結合未確認',
    };
  }

  const rawNatEvidence = gateResult.audit?.foreignNationality?.evidence || '';
  const suspectSentence = gateResult.audit?.suspectRole?.evidence || cleanTitle;
  const locationEvidence = gateResult.audit?.japanCrime?.evidence || '';

  const nationality = standardizeNationality(rawNatEvidence, `${suspectSentence} ${cleanTitle}`);
  if (!nationality) {
    return { valid: false, reason: '被疑者の外国籍表記が特定不可' };
  }

  const prefecture = gateResult.location;
  const stage = extractStage(`${cleanTitle} ${suspectSentence}`);
  const evidence = {
    suspect: suspectSentence,
    nationality: rawNatEvidence || `本文抜粋: ${nationality}`,
  };

  const profile = buildIncidentProfile({
    title: cleanTitle,
    bodyText: suspectSentence,
    location: prefecture,
    prefecture,
    nationality,
    evidence,
  });

  return {
    valid: true,
    prefecture,
    nationality,
    stage,
    crimeCategories: profile.crimeCategories,
    evidence,
    locationBasis: locationEvidence,
    profile,
    summary: `${prefecture}で発生し、${nationality}の被疑者に${stage}等の刑事手続が取られたことを本文の文脈結合で確認した報道です。`,
  };
}

// ============================================================================
// 9. 既存データのロード＆既に混入した汚染・重複データの安全な自動浄化
// ============================================================================

async function loadExistingDataFile() {
  for (const candidatePath of CONFIG.DATA_FILE_CANDIDATES) {
    try {
      const content = await fs.readFile(candidatePath, 'utf-8');
      const parsed = JSON.parse(content);
      return { filePath: candidatePath, rawData: parsed };
    } catch {
      // 次候補へ
    }
  }
  return { filePath: 'data/newsData.json', rawData: [] };
}

function isV4UnverifiedRecord(item) {
  return !item.evidence && !item.audited && !item.sourceType && /^[0-9a-f]{12}$/.test(String(item.id || ''));
}

async function sanitizeExistingArticles(rawExisting) {
  const trusted = [];
  const v4Candidates = [];

  for (const item of rawExisting) {
    if (isV4UnverifiedRecord(item)) {
      v4Candidates.push(item);
    } else {
      trusted.push(item);
    }
  }

  const sanitized = [];

  // 第1パス: 既存の正規監査済みデータを最優先で保護（明確な政治要請・議会答弁・遺族談話・過去事件端緒のみの非対象記事を除外）
  const PAST_CASE_EVIDENCE_RE = /(?:＝|=|（|\()[^＝=）)]*?(?:起訴|公判中|受刑者|実刑|有罪)[^＝=）)]*?(?:＝|=|）|\))[^。]*?を逮捕し|を逮捕し、[^。]*?(?:処分先|売却先|買い取り先|関与|同社|男ら|容疑者ら)が浮上/;
  for (const item of trusted) {
    const cleanedTitle = cleanArticleTitle(item.title || '');
    if (NON_INCIDENT_REGEX.test(cleanedTitle)) {
      console.log(`[CLEANUP-NON-CASE] 非事件・政治反応・コラム記事を除外: ${cleanedTitle}`);
      continue;
    }
    if (item.evidence?.suspect && PAST_CASE_EVIDENCE_RE.test(item.evidence.suspect) && !aiGate.NAT_RE.test(cleanedTitle)) {
      console.log(`[CLEANUP-PAST-BG] 過去事件の捜査端緒のみ（今回の被疑者の外国籍特定なし）を除外: ${cleanedTitle}`);
      continue;
    }
    if (item.stage === '逮捕' && /(?:判決|有罪|実刑|懲役|禁錮|拘禁刑|罰金)/.test(cleanedTitle) && !/逮捕/.test(cleanedTitle)) {
      item.stage = '判決';
    }
    sanitized.push({
      ...item,
      _profile: buildIncidentProfile(item),
    });
  }

  // 第2パス: v4で混入した未検証データ（evidenceなし）を検査し、サイドバー汚染や既存正規データとの重複を排除
  for (const item of v4Candidates) {
    const cleanedTitle = cleanArticleTitle(item.title || '');
    if (NON_INCIDENT_REGEX.test(cleanedTitle)) {
      console.log(`[CLEANUP-NON-CASE] 非事件・政治反応・コラム記事を除外: ${cleanedTitle}`);
      continue;
    }
    if (!aiGate.NAT_RE.test(cleanedTitle)) {
      console.log(`[CLEANUP-UNVERIFIED] 見出し・証拠に外国籍根拠がない汚染記事を除外: ${cleanedTitle}`);
      continue;
    }

    const fixedItem = { ...item, title: cleanedTitle };
    const titleScene = aiGate.resolveCrimeSceneInContext(cleanedTitle) || aiGate.resolvePrefecture(cleanedTitle);
    if (titleScene?.pref && titleScene.pref !== '全国' && fixedItem.location !== titleScene.pref) {
      console.log(`[FIX-LOCATION] 都道府県を補正 (${fixedItem.location} → ${titleScene.pref}): ${cleanedTitle}`);
      fixedItem.location = titleScene.pref;
      fixedItem.prefecture = titleScene.pref;
    }
    const specificNat = standardizeNationality('', cleanedTitle);
    if (specificNat && (!fixedItem.nationality || fixedItem.nationality === '外国籍')) {
      fixedItem.nationality = specificNat;
    }
    if (fixedItem.crimeCategory === '農作物・家畜・果物窃盗' && /米兵|米軍/.test(cleanedTitle)) {
      const fixedCats = extractCrimeCategories(cleanedTitle);
      fixedItem.crimeCategory = fixedCats[0];
    }
    if (fixedItem.crimeCategory === 'その他刑事事件') {
      const fixedCats = extractCrimeCategories(cleanedTitle);
      if (fixedCats[0] !== 'その他刑事事件') fixedItem.crimeCategory = fixedCats[0];
    }
    fixedItem.evidence = {
      suspect: `見出し根拠: ${cleanedTitle}`,
      nationality: `見出し根拠: ${fixedItem.nationality || '外国籍'}`,
    };
    fixedItem._profile = buildIncidentProfile(fixedItem);

    const dup = isDuplicateAgainstExisting(fixedItem, sanitized);
    if (dup.duplicate) {
      console.log(`[CLEANUP-DUP] 既存正規データとの重複記事を統合除外 (${dup.reason}): ${cleanedTitle}`);
      continue;
    }

    if (fixedItem.url && fixedItem.url.includes('news.google.com')) {
      await resolveUrlAndPureArticleBody(fixedItem);
    }
    sanitized.push(fixedItem);
  }

  return sanitized;
}

// ============================================================================
// 10. メイン実行パイプライン
// ============================================================================

async function main() {
  console.log('=== 外国人犯罪報道ニュース 全国網羅収集＆完全検証・重複ゼロパイプライン (v5) 開始 ===');

  const { filePath, rawData } = await loadExistingDataFile();
  const rawExisting = Array.isArray(rawData) ? rawData : (rawData.items || rawData.articles || []);

  // 1. 既存の汚染・重複記事を浄化し、正常な過去記事をすべて保護
  const existingProtected = await sanitizeExistingArticles(rawExisting);
  console.log(`[SAFE-LOAD] 既存データ検査完了: ${rawExisting.length}件 → 正常保護 ${existingProtected.length}件`);

  // 2. 永久台帳（merged.json / removed.json）および seen_urls.json をロードし、統合・除外済み記事のゾンビ復活を100%阻止
  const mergedLedger = publicationLedger.loadLedger(CONFIG.MERGED_LEDGER_FILE, 'merged');
  const removedLedger = publicationLedger.loadLedger(CONFIG.REMOVED_LEDGER_FILE, 'removed');

  let seenUrls = new Set();
  try {
    const seenRaw = JSON.parse(await fs.readFile(CONFIG.SEEN_CACHE_FILE, 'utf-8'));
    if (Array.isArray(seenRaw)) seenUrls = new Set(seenRaw);
  } catch {
    // 初回は空
  }
  existingProtected.forEach((a) => {
    if (a.url) seenUrls.add(normalizeUrl(a.url));
  });

  // 3. 全国網羅収集（①Google News 13クエリ ＋ ②公式RSS・Yahoo地域シャード ＋ ③主要局一覧ページ直接巡回 ＋ ④県警公式発表）
  const rawFetchedItems = [];

  for (const query of GOOGLE_NEWS_QUERIES) {
    const googleRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ja&gl=JP&ceid=JP:ja`;
    try {
      const res = await fetchWithTimeout(googleRssUrl);
      if (res.ok) {
        const xml = await res.text();
        rawFetchedItems.push(...parseRssItems(xml));
      }
    } catch (err) {
      console.warn(`[WARN] Google RSS取得失敗 (${query}): ${err.message}`);
    }
  }

  try {
    const officialFeeds = [...(rssSources.RSS_SOURCES || [])];
    try {
      const catRes = await fetchWithTimeout(rssSources.YAHOO_RSS_CATALOG);
      if (catRes.ok) {
        const catHtml = await catRes.text();
        const allLocal = rssSources.parseYahooMediaCatalog(catHtml);
        const shard = rssSources.selectYahooMediaShard(allLocal, { now: Date.now(), shardCount: 4 });
        officialFeeds.push(...shard.slice(0, 20));
      }
    } catch {
      // ignore
    }
    for (const feed of officialFeeds) {
      if (!feed.url) continue;
      try {
        const res = await fetchWithTimeout(feed.url);
        if (res.ok) {
          const xml = await res.text();
          rawFetchedItems.push(...parseRssItems(xml, feed.media || feed.name || '国内報道機関'));
        }
      } catch {
        // 個別フィードのタイムアウトは無視して次へ
      }
    }
  } catch {
    // ignore
  }

  try {
    const pubResult = await publisherListings.collectPublisherCandidates(articleFetcher.httpRequest, {
      logger: { log: () => {}, error: () => {} },
    });
    if (Array.isArray(pubResult?.items)) {
      for (const li of pubResult.items) {
        rawFetchedItems.push({
          rawTitle: li.title || '',
          title: cleanArticleTitle(li.title || ''),
          url: normalizeUrl(li.url || ''),
          pubDate: li.pubDate || new Date().toISOString(),
          description: li.description || '',
          source: li.media || '国内報道機関',
        });
      }
    }
  } catch {
    // ignore
  }

  try {
    const chibaItems = await policeBulletins.collectChibaBulletins(articleFetcher.httpRequest).catch(() => []);
    const shizuokaItems = await policeBulletins.collectShizuokaBulletins(articleFetcher.httpRequest).catch(() => []);
    for (const pi of [...(chibaItems || []), ...(shizuokaItems || [])]) {
      rawFetchedItems.push({
        rawTitle: pi.title || '',
        title: cleanArticleTitle(pi.title || ''),
        url: normalizeUrl(pi.url || ''),
        pubDate: pi.pubDate || new Date().toISOString(),
        description: pi.sourceBody || pi.description || '',
        sourceBody: pi.sourceBody || '',
        source: pi.media || '都道府県警察公式発表',
      });
    }
  } catch {
    // ignore
  }

  console.log(`[FETCH] 全国RSS・ローカル局・県警発表から合計 ${rawFetchedItems.length} 件の候補を取得しました。`);

  // 4. 一次フィルタ（既読URL、10日超の古い記事、永久台帳登録済み、非事件・海外見出し、バッチ内重複を除外）
  const maxAgeMs = 10 * 24 * 60 * 60 * 1000;
  const uniqueCandidates = [];
  for (const item of rawFetchedItems) {
    if (!item.title || !item.url) continue;
    if (seenUrls.has(item.url)) continue;
    if (item.pubDate && Date.now() - new Date(item.pubDate).getTime() > maxAgeMs) {
      seenUrls.add(item.url);
      continue;
    }

    // 永久除外・統合台帳（merged.json / removed.json）に載っている記事は二度と入れない
    if (
      publicationLedger.isSuppressed(item, removedLedger) ||
      publicationLedger.isMergedAway(item, mergedLedger)
    ) {
      seenUrls.add(item.url);
      continue;
    }

    if (NON_INCIDENT_REGEX.test(item.title) || OVERSEAS_INCIDENT_REGEX.test(item.title)) {
      seenUrls.add(item.url);
      continue;
    }

    // 刑事手続語が見出しにもスニペットにも一切ない一般記事は早期スキップ
    if (!aiGate.CRIME_RE.test(`${item.title} ${item.description || ''}`)) {
      continue;
    }

    const inBatchDup = uniqueCandidates.some(
      (c) => c.url === item.url || calculateTitleSimilarity(c.title, item.title) >= CONFIG.TITLE_SIMILARITY_THRESHOLD
    );
    if (!inBatchDup) {
      uniqueCandidates.push(item);
    }
  }

  console.log(`[FILTER] 厳格審査対象の未検査候補 ${uniqueCandidates.length} 件についてURL解決・本文コンテナ抽出・主述結合検証を実行します...`);

  const newlyAccepted = [];
  for (const candidate of uniqueCandidates) {
    const originalUrl = candidate.url;
    const bodyText = await resolveUrlAndPureArticleBody(candidate);

    if (NON_NEWS_DOMAIN_RE.test(candidate.url)) {
      seenUrls.add(originalUrl);
      seenUrls.add(candidate.url);
      continue;
    }

    // URL解決後に永久台帳と一致したら即スキップ
    if (
      publicationLedger.isSuppressed(candidate, removedLedger) ||
      publicationLedger.isMergedAway(candidate, mergedLedger)
    ) {
      seenUrls.add(originalUrl);
      seenUrls.add(candidate.url);
      continue;
    }

    const inspection = inspectCandidateWithStrictGate(candidate.title, bodyText);
    if (!inspection.valid) {
      // 本文取得に成功した上で不適格と確定した場合のみ既読に登録し、通信失敗・空本文は次回再試行可能にする
      if (bodyText && bodyText.length >= 100) {
        seenUrls.add(originalUrl);
        seenUrls.add(candidate.url);
      }
      continue;
    }
    seenUrls.add(originalUrl);
    seenUrls.add(candidate.url);

    const dateStr = toJstDateString(candidate.pubDate);
    const enrichedCandidate = {
      ...candidate,
      date: dateStr,
      bodyText,
      location: inspection.prefecture,
      prefecture: inspection.prefecture,
      nationality: inspection.nationality,
      stage: inspection.stage,
      crimeCategories: inspection.crimeCategories,
      evidence: inspection.evidence,
      locationBasis: inspection.locationBasis,
      summary: inspection.summary,
      _profile: inspection.profile,
    };

    const combinedExisting = [...newlyAccepted, ...existingProtected];
    const dupCheck = isDuplicateAgainstExisting(enrichedCandidate, combinedExisting);
    if (dupCheck.duplicate) {
      console.log(`[SKIP-DEDUP] 同一事件をブロック (${dupCheck.reason}): ${candidate.title}`);
      continue;
    }

    const llmCheck = await verifyWithGeminiSafe(enrichedCandidate, combinedExisting);
    if (!llmCheck.approved) {
      console.log(`[SKIP-LLM] AI監査による除外 (${llmCheck.reason}): ${candidate.title}`);
      continue;
    }

    const articleId = crypto
      .createHash('md5')
      .update(`${dateStr}_${enrichedCandidate.prefecture}_${enrichedCandidate.nationality}_${candidate.title}`)
      .digest('hex')
      .slice(0, 12);

    const finalRecord = {
      id: articleId,
      sourceRecordId: `v5-${articleId}`,
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
      evidence: enrichedCandidate.evidence,
      locationBasis: enrichedCandidate.locationBasis,
      _profile: enrichedCandidate._profile,
    };

    newlyAccepted.push(finalRecord);
    console.log(`[ACCEPT] 新規採用: [${finalRecord.location} / ${finalRecord.nationality} / ${finalRecord.crimeCategory}] ${finalRecord.title}`);
  }

  const finalArticles = [...newlyAccepted, ...existingProtected]
    .sort((a, b) => new Date(b.pubDate || b.date || 0) - new Date(a.pubDate || a.date || 0))
    .map(({ _profile, ...rest }) => rest);

  await writeJsonAtomically(filePath, finalArticles);

  const seenArray = Array.from(seenUrls).slice(-5000);
  await writeJsonAtomically(CONFIG.SEEN_CACHE_FILE, seenArray);

  console.log(`=== 完了 (${filePath}): 新規追加=${newlyAccepted.length}件 / 既存保護=${existingProtected.length}件 / 累計保存=${finalArticles.length}件 ===`);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
