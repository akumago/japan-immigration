'use strict';
/**
 * ai-gate.cjs — 証拠検証つきAI審査ゲート（外国人犯罪ニュース用）
 *
 * 方針
 *  - AIには「判定」と「原文からの引用」だけをさせ、採否はコード側の機械検証で決める
 *  - 都道府県はAIに推定させず、引用文/見出しから辞書で決定する（一意に決まらなければ review）
 *  - 一時障害（429/5xx/通信）は「その回の審査を中断」して次回に持ち越す（記事を失わない・回数も数えない）
 *  - 採否の記録は data/aiDecisions(.shadow).json（Actionsのキャッシュで永続化）
 *  - シャドー運転では公開データに一切触れず、data/shadowComparison.jsonl に新旧の比較を追記する
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MUNI_PATH = path.join(DATA_DIR, 'municipalities.json');

const CFG = {
  chunkSize: 10,
  maxChunksPerRun: 6, // 1回の実行で審査する最大件数 = chunkSize × maxChunksPerRun。超過分は次回へ
  maxApiCallsPerRun: 20, // 一次判定＋最終精査＋分割リトライ・モデル切替を含む上限
  maxAttempts: 5, // 解析失敗の記事がこの回数に達したら review
  minIntervalMs: Number(process.env.GEMINI_MIN_INTERVAL_MS || 13000), // 無料枠のRPM対策（約4.5回/分）
  trimMs: 60 * 24 * 60 * 60 * 1000,
  requestTimeoutMs: 90000,
};
const MODELS = [...new Set([process.env.GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-3.1-flash-lite'].filter(Boolean))];

// ───────────────────────── テキスト正規化 ─────────────────────────
const nfkc = (s) => String(s == null ? '' : s).normalize('NFKC');
const squash = (s) => nfkc(s).replace(/\s+/g, '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stripHtml = (s) =>
  nfkc(s).replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|amp|quot|lt|gt|#39);/g, ' ').replace(/\s+/g, ' ').trim();

/** 記事自身の本文相当（見出し＋要約）。媒体名は含めない。AIへの入力と検証の対象は必ずこれに揃える */
function ownText(item) {
  let title = nfkc(item.title).replace(/\s[-–—―]\s[^-–—―]{1,30}$/, '');
  if (item.media) title = title.split(nfkc(item.media)).join('');
  const desc = stripHtml(item.description || '').slice(0, 240);
  return { title: title.trim(), desc };
}
const articleKey = (item) => crypto.createHash('md5').update(item.url || item.title || '').digest('hex').slice(0, 16);

// ───────────────────────── 国籍・事件性・被害者側 ─────────────────────────
const COUNTRY_NAMES = [
  'パキスタン', 'インド', 'ミャンマー', 'カンボジア', 'モロッコ', 'イラン', 'シリア', 'メキシコ', 'トルコ', 'イスラエル',
  'ドイツ', 'マレーシア', 'オーストラリア', 'ロシア', 'ウクライナ', 'タイ', 'フィリピン', 'ベトナム', '中国', '韓国',
  'ブラジル', 'ペルー', 'ネパール', 'スリランカ', 'バングラデシュ', 'インドネシア', 'ナイジェリア', 'ガーナ',
  'アフガニスタン', '北朝鮮', 'エジプト', 'サウジアラビア', 'イラク', 'コロンビア', 'ラオス', 'マカオ', 'アメリカ', '米国',
  '英国', 'イギリス', 'フランス', 'アルゼンチン', 'ウズベキスタン', 'カザフスタン', 'モンゴル', '台湾', '香港', 'クルド',
  'チリ', 'カナダ', 'イタリア', 'スペイン', 'ポーランド', 'ルーマニア', 'セネガル', 'カメルーン', 'ケニア', 'ウガンダ',
  'エチオピア', 'キルギス', 'タジキスタン', 'ジョージア', 'ベラルーシ', 'ボリビア', 'パラグアイ', 'ベネズエラ',
  'エクアドル', 'シンガポール', 'ニュージーランド', 'オランダ', 'ギニア', 'コンゴ', 'スーダン', 'ヨルダン', 'レバノン',
  'イエメン', 'アルジェリア', 'チュニジア', 'ブルガリア', 'ハンガリー', 'ブータン', '南アフリカ',
  '朝鮮', 'アルメニア', 'アゼルバイジャン', 'カタール', 'アラブ首長国連邦', 'UAE', 'ミクロネシア', 'フィジー', 'トンガ', 'サモア',
  'パナマ', 'キューバ', 'ジャマイカ', 'トリニダード', 'ソマリア', 'リベリア', 'シエラレオネ', 'マリ共和国', 'ザンビア',
  'ジンバブエ', 'タンザニア', 'モルドバ', 'セルビア', 'ギリシャ', 'ポルトガル', 'スウェーデン', 'ノルウェー', 'フィンランド',
  'デンマーク', 'アイルランド', 'スイス', 'オーストリア', 'ベルギー', 'チェコ', 'スロバキア', 'リトアニア', 'ラトビア',
  'エストニア', 'トルクメニスタン', '東ティモール', 'パレスチナ', 'ボスニア', 'アルバニア', 'クロアチア', 'コスタリカ',
  'ホンジュラス', 'グアテマラ', 'エルサルバドル', 'ドミニカ', 'ハイチ', 'モザンビーク', 'アンゴラ', 'マダガスカル',
  'モーリシャス', 'モーリタニア', 'リビア', 'バーレーン', 'オマーン', 'クウェート', 'キプロス', 'マルタ', 'アイスランド',
  'ルクセンブルク', 'スロベニア', 'マケドニア', 'モンテネグロ', 'コソボ', 'アイボリー', 'ブルキナファソ', 'トーゴ', 'ベナン',
];
const COUNTRY_ALT = [...COUNTRY_NAMES].sort((a, b) => b.length - a.length).map(esc).join('|');
const NAT_SOURCE =
  `(?:${COUNTRY_ALT})(?:国籍|籍|人|出身)` +
  `|[ァ-ヴー]{2,}(?:国籍|籍の)` +
  `|外国籍|外国人|外国出身` +
  `|[ァ-ヴー]{3,}人(?=の?(?:男|女|少年|少女|グループ|容疑者|被告|実習生|留学生|労働者|従業員|店員|運転手|客|ら))` + // 辞書にない国名（○○人の男）
  `|(?:${COUNTRY_ALT})系(?=の?(?:男|女|少年|少女|グループ|容疑者|被告))` + // 中国系の男
  `|[ァ-ヴー]{2,}(?:・[ァ-ヴー]{1,}){1,}(?=容疑者|被告|受刑者)` + // カタカナのフルネーム＋容疑者（報道の慣行で外国籍）
  `|米軍(?:関係者|基地所属|軍人)|アメリカ軍(?:関係者|兵|人|隊員|所属|属)|在日米軍` +
  `|米兵|米軍(?:兵|属|関係者|隊員|人|所属)|米(?:海軍|空軍|陸軍|海兵隊)(?:兵|隊員|所属)` +
  `|技能実習生|元技能実習生|特定技能|留学生|元留学生` + // 「実習生」単体は教育実習生など日本人を含むので入れない
  `|不法(?:滞在|残留|入国)|不法就労(?!助長|さ[せ]|をさせ)|オーバーステイ|仮放免|偽造在留カード`;
const NAT_RE = new RegExp(NAT_SOURCE);
const NAT_RE_G = new RegExp(NAT_SOURCE, 'g'); // matchAll 用（g 必須。付け忘れると TypeError）
const CRIME_RE = /(?:逮捕|容疑|疑い|送検|送致|起訴|判決|求刑|摘発|指名手配|検挙|立件|勾留|拘禁刑|懲役|実刑|有罪|被告|家宅捜索|捜査|被疑者|補導|現行犯|身柄|確保|拘束|事情聴取|取り調べ|書類送検|再逮捕|追送検|罰金|略式|不起訴|起訴猶予)/;
// 被害者になった側の述語だけ（「けがをさせた」「死亡事故で逮捕」は容疑者側なので入れない）
const VICTIM_PASSIVE_RE =
  /(?:刺され|襲われ|はねられ|撥ねられ|轢かれ|ひかれ|殺害され|殺され|だまし取られ|騙し取られ|盗まれ|奪われ|連れ去られ|監禁され|搾取され|殴られ|蹴られ|切りつけられ|脅され|襲撃され|暴行を受け|被害に遭|被害を受け|[がは]被害(?![額総者])|[がは]被害者|重傷を負(?!わせ)|けがを負(?!わせ)|[がは](?:死亡|亡くな|重体|重傷|軽傷|けが)(?!を?負わせ|させ)|遺体で)/;
// 国籍表現が「犯行の相手（目的語）」になっている: 「中国人女性を暴行した疑い」（能動態の被害者）
const VICTIM_OBJECT_RE =
  /^(?:の)?(?:男性|女性|女児|男児|少女|児童|高齢者|お年寄り|客|店員|従業員|社員)[^をがの、。]{0,6}を(?:暴行し|暴行を加え|殴っ|殴打し|蹴っ|刺し|殺害し|殺し|襲っ|脅迫し|脅し|恐喝し|だまし|騙し|切りつけ|はね|轢い|ひき逃げ|監禁し|拉致し|連れ去っ|傷つけ|負傷させ|けがをさせ|ケガをさせ|死亡させ|死なせ|強盗)/;
// 国籍表現が加害者ではない役割: 雇われた側・装われた側・対象（向け/相手）
// 「インド人の男に襲われ」: 人物名詞＋「に」＋受身 は、国籍側が動作主（加害者）。「男性 車にはねられ」の「車に」は該当しない
const AGENT_PASSIVE_RE = /^(?:の)?(?:男性|女性|男|女|少年|少女|グループ|集団|客|ら|\d+人組|容疑者)(?:\(\d+\))?(?:ら)?に[^、。]{0,6}?(?:刺され|襲われ|襲撃され|殴られ|蹴られ|切りつけられ|脅され|だまし取られ|盗まれ|奪われ|連れ去られ|監禁され)/;
const NON_SUSPECT_AFTER_RE = /^(?:被害者|被害女性|被害男性|を装|になりすま|風の|向け|相手|の相談|の支援|に(?:不法|違法|働か|就労|雇)|と偽)/;
// ここに達したら被疑者側の述語に入ったとみなして、被害者語彙の探索を打ち切る
const CLAUSE_STOP_RE = /[。]|逮捕|送検|送致|起訴|容疑|疑い|摘発|検挙|立件|書類送検/;

/** NAT の各出現を「被疑者になり得る」か判定する。スペースで窓を切らない（見出しは述語の前に空白が入る） */
function natOccurrences(text) {
  const t = nfkc(text);
  return [...t.matchAll(NAT_RE_G)].map((m) => {
    const tail = t.slice(m.index + m[0].length, m.index + m[0].length + 40);
    const stop = tail.search(CLAUSE_STOP_RE);
    const win = (stop >= 0 ? tail.slice(0, stop) : tail).slice(0, 28);
    const victim = !AGENT_PASSIVE_RE.test(win) && (VICTIM_PASSIVE_RE.test(win) || VICTIM_OBJECT_RE.test(win));
    const nonSuspect = NON_SUSPECT_AFTER_RE.test(win);
    return { text: m[0], victim, nonSuspect, suspect: !victim && !nonSuspect };
  });
}

/** テキスト中の国籍表現が、すべて被疑者になり得ない（被害者側/雇用主側/対象側）なら true */
function isVictimSide(text) {
  const occ = natOccurrences(text);
  return occ.length > 0 && occ.every((o) => !o.suspect);
}

// 逮捕されたのが日本人で、外国籍の側は被害者・関係者にすぎない（「中国人女性を暴行した疑い 日本人の男を逮捕」）
const ARREST = '(?:逮捕|送検|送致|起訴|書類送検)';
const JP_ARRESTEE_RE = new RegExp(`日本(?:人|国籍)[^、。を]{0,12}を(?:(?!日本人)[^、。]){0,15}?${ARREST}`);
const FOREIGN_ARRESTEE_RE = new RegExp(`(?:${NAT_SOURCE})(?:(?!日本人)[^、。を]){0,24}?を(?:(?!日本人)[^、。]){0,15}?${ARREST}`);
// 「中国籍の男と日本人の男を逮捕」のように並列なら、外国籍側も被疑者（混成グループ）
const COORD_RE = new RegExp(`(?:${NAT_SOURCE})[^、。を]{0,12}(?:と|、|および)日本人|日本人[^、。を]{0,12}(?:と|、|および)(?:${NAT_SOURCE})`);
function isJapaneseArrestee(title) {
  const t = nfkc(title);
  return JP_ARRESTEE_RE.test(t) && !FOREIGN_ARRESTEE_RE.test(t) && !COORD_RE.test(t);
}

// 外国の警察・当局が「逮捕した」主体で、日本の警察・検察の語も日本の地名も無い → 海外の事件（国内警察への言及があれば触らない）
const FOREIGN_ARREST_RE = new RegExp(`(?:${COUNTRY_ALT})(?:警察|当局|検察|司法当局|治安当局)[^、。]{0,12}?[がはに][^、。]{0,20}?(?:逮捕|拘束|摘発|起訴)`);
const JP_AUTH_RE = /警視庁|(?:道|府|県)警|警察署|[一-龥ぁ-んァ-ヴー]{2,8}署|海上保安|地検|地裁|高裁|区検|麻薬取締|税関支署|入管|出入国在留管理/;
// 外国の地名が事件の場所として出ている（日本の地名・警察の記述が無いときだけ海外扱い。場所不明で採用する際の安全弁）
const OVERSEAS_PLACE_RE = new RegExp(`(?:${COUNTRY_ALT})(?:国内|で(?:起き|発生|の事件)|の(?:首都|州|都市))|(?:ニューヨーク|ロサンゼルス|ロンドン|パリ|ソウル|北京|上海|バンコク|マニラ|ジャカルタ|ハノイ|シドニー|ベルリン|モスクワ|ドバイ|台北|プノンペン|ヤンゴン)(?:市警|で|市内)`);
const isOverseas = (t) => {
  const x = nfkc(t);
  return (FOREIGN_ARREST_RE.test(x) || OVERSEAS_PLACE_RE.test(x)) && !JP_AUTH_RE.test(x) && !resolvePrefecture(x).pref;
};

// ───────────────────────── 場所の決定（辞書・最長一致・曖昧なら null） ─────────────────────────
const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県',
  '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県',
  '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];
const PREF_SHORT = new Map(PREFECTURES.map((p) => [p === '北海道' ? p : p.slice(0, -1), p]));
const SHORT_DOT_RE = new RegExp(`(${[...PREF_SHORT.keys()].map(esc).join('|')})・(?=\\S)`, 'g'); // 「新潟・上越」形式
// 「北海道新聞」「京都新聞」のような媒体名を場所として拾わない
const MEDIA_RE = /[一-龥ァ-ヴーA-Za-z0-9]{1,8}(?:新聞|放送|テレビ|TV|ニュース|通信|日報|タイムス|ラジオ)/g;
const maskMedia = (t) => t.replace(MEDIA_RE, ' ');

// 市区町村名から導けない警察署名（不足分は summary の「未解決の場所」に出るので育てる）
const CURATED_STATIONS = {
  武南: '埼玉県', 西入間: '埼玉県', 伊勢佐木: '神奈川県', 戸部: '神奈川県', 川崎臨港: '神奈川県', 横浜水上: '神奈川県',
  曽根崎: '大阪府', 天満: '大阪府', 万世橋: '東京都', 丸の内: '東京都', 愛宕: '東京都', 麻布: '東京都', 高輪: '東京都',
  築地: '東京都', 月島: '東京都', 原宿: '東京都', 代々木: '東京都', 荻窪: '東京都', 志村: '東京都', 光が丘: '東京都',
  東京湾岸: '東京都', 池袋: '東京都', 巣鴨: '東京都', 蒲田: '東京都', 竹の塚: '東京都', 亀有: '東京都', 小岩: '東京都',
  浅草: '東京都', 石神井: '東京都', 尾久: '東京都', 五反野: '東京都', 蔵前: '東京都', 生田: '兵庫県', 葺合: '兵庫県', 川端: '京都府', 行徳: '千葉県', 中村: '愛知県',
};

// 単独では管轄が決まらない署名（中央署・城東署は東京と大阪の両方にある等）。辞書に同名の市区町村があっても採用しない
const AMBIGUOUS_STATIONS = new Set(['中央', '東', '西', '南', '北', '中', '本', '新', '城東', '城西', '城南', '城北', '港', '湾岸']);

let DICT = null;
function setMunicipalities(map) {
  DICT = { map, keys: Object.keys(map).sort((a, b) => b.length - a.length) };
}
function loadMunicipalities() {
  if (DICT) return DICT;
  let map = {};
  try {
    const raw = JSON.parse(fs.readFileSync(MUNI_PATH, 'utf-8'));
    map = raw.map || raw;
  } catch (e) {
    console.warn(`⚠️ ${MUNI_PATH} を読めません (${e.message})。市区町村での場所解決は無効（都道府県名がある記事のみ採用可）`);
  }
  setMunicipalities(map);
  return DICT;
}

const hit = (pref, method) => ({ pref, method });
const miss = (reason, candidates = []) => ({ pref: null, reason, candidates });

function lookupMuni(base, dict) {
  for (const suf of ['市', '区', '町', '村']) {
    const prefs = dict.map[base + suf];
    if (prefs) return prefs.length === 1 ? { pref: prefs[0] } : { ambiguous: prefs };
  }
  return null;
}
function lookupStation(c, dict) {
  if (CURATED_STATIONS[c]) return { pref: CURATED_STATIONS[c] };
  if (AMBIGUOUS_STATIONS.has(c)) return { ambiguous: [] };
  const direct = lookupMuni(c, dict);
  if (direct) return direct;
  const m = c.match(/^(.{2,6}?)(?:東|西|南|北|中央|中)$/); // 「松戸東」「千葉中央」→ 松戸市 / 千葉市
  return m ? lookupMuni(m[1], dict) : null;
}

/**
 * 都道府県を決定する。戻り値: { pref, method } | { pref: null, reason, candidates }
 * 優先順: 明示された都道府県名 → 警視庁/道警 → 「新潟・上越」形式 → 警察署名 → 市区町村名 → ランドマーク
 * 複数の県が出る・曖昧な名称（「中央区」等）は null にして呼び出し側で review にする。
 */
function resolvePrefecture(text, opts = {}) {
  const dict = loadMunicipalities();
  const t = maskMedia(nfkc(text));

  const found = PREFECTURES.filter((p) => t.includes(p));
  if (found.length === 1) return hit(found[0], 'prefecture');
  if (found.length > 1) {
    const withPolice = found.filter((p) => new RegExp(`${esc(p)}警`).test(t)); // 「埼玉県警」など捜査側
    if (withPolice.length === 1) return hit(withPolice[0], 'prefecture_police');
    return miss('ambiguous_prefecture', found);
  }
  if (/警視庁/.test(t)) return hit('東京都', 'keishicho');
  if (/道警/.test(t)) return hit('北海道', 'dokei');

  const shorts = new Set([...t.matchAll(SHORT_DOT_RE)].map((m) => PREF_SHORT.get(m[1])));
  if (shorts.size === 1) return hit([...shorts][0], 'prefecture_short');
  if (shorts.size > 1) return miss('ambiguous_prefecture', [...shorts]);

  // 警察署名 → 市区町村（最長の接尾一致を優先: 「茨城県警常陸大宮署」→ 常陸大宮市、大宮区ではない）
  const stationPrefs = new Set();
  let stationAmbiguous = null;
  for (const m of t.matchAll(/([一-龥ぁ-んァ-ヴー]{2,10}?)(?:警察署|署)(?![一-龥])/g)) {
    const stem = m[1];
    for (let len = Math.min(stem.length, 8); len >= 2; len--) {
      const r = lookupStation(stem.slice(-len), dict);
      if (!r) continue;
      if (r.pref) stationPrefs.add(r.pref);
      else stationAmbiguous = r.ambiguous;
      break;
    }
  }
  if (stationPrefs.size === 1) return hit([...stationPrefs][0], 'police_station');
  if (stationPrefs.size > 1) return miss('ambiguous_station', [...stationPrefs]);
  if (stationAmbiguous) return miss('ambiguous_station', stationAmbiguous);

  // 市区町村名（長い名称から順に照合し、照合済みの範囲は潰す）
  let rest = t;
  const unique = new Set();
  const ambiguous = [];
  for (const key of dict.keys) {
    let from = 0;
    let idx;
    while ((idx = rest.indexOf(key, from)) !== -1) {
      const prev = idx > 0 ? rest[idx - 1] : '';
      // 2文字の名称（津市・森町・北区…）は、漢字の直後（「大森町」の「森町」）では一致させない
      const ok = key.length > 2 || !prev || !/[一-龥]/.test(prev) || '県府都道郡市区'.includes(prev);
      if (!ok) { from = idx + 1; continue; }
      const prefs = dict.map[key];
      if (prefs.length === 1) unique.add(prefs[0]);
      else ambiguous.push(prefs);
      rest = rest.slice(0, idx) + '\u0001'.repeat(key.length) + rest.slice(idx + key.length);
      from = idx + key.length;
    }
  }
  if (unique.size === 1) return hit([...unique][0], 'municipality');
  if (unique.size > 1) return miss('ambiguous_municipality', [...unique]);
  if (ambiguous.length) {
    const inter = ambiguous.reduce((a, b) => a.filter((x) => b.includes(x)));
    return inter.length === 1 ? hit(inter[0], 'municipality_intersect') : miss('ambiguous_municipality', ambiguous[0]);
  }

  for (const s of [...(opts.primaryLocationSigns || [])].sort((a, b) => b.key.length - a.key.length)) {
    if (t.includes(s.key)) return hit(s.pref, 'landmark');
  }
  return miss('unresolved');
}

// ───────────────────────── 検証（AIの出力を信用しない） ─────────────────────────
/** 整形後の見出しが原文にない数字・国名・県名を含まないか */
function titleFactsOk(cleanTitle, srcText, pref, opts) {
  const ct = nfkc(cleanTitle).trim();
  const src = nfkc(srcText);
  if (ct.length < 8 || ct.length > 100) return false;
  const srcNums = new Set(src.match(/\d+/g) || []);
  for (const n of ct.match(/\d+/g) || []) if (!srcNums.has(n)) return false;
  for (const c of COUNTRY_NAMES) if (ct.includes(c) && !src.includes(c)) return false;
  const p = resolvePrefecture(ct, opts);
  if (p.pref && pref && p.pref !== pref) return false;
  return true;
}

const LOCATION_STRICT = process.env.LOCATION_STRICT === '1'; // 1: 場所が一意に決まらない記事は公開しない（旧動作）
const UNKNOWN_LOCATION = process.env.UNKNOWN_LOCATION || '全国'; // このサイトでは、場所が決まらない記事は「全国」

/** 被疑者になり得る国籍表現があれば、その表記を返す（AIの引用が不正確でもここで拾う） */
function ruleSuspect(title, desc) {
  const occ = [...natOccurrences(title), ...natOccurrences(desc)].filter((o) => o.suspect);
  return occ.length ? occ[0].text : null;
}
/** AIの判定とは独立に、ルールだけで「取りこぼしてはいけない記事」かを見る */
function rulesPass(item, opts = {}) {
  const { title, desc } = ownText(item);
  const src = `${title} ${desc}`;
  return !!ruleSuspect(title, desc) && (CRIME_RE.test(title) || CRIME_RE.test(desc)) && !isOverseas(src) &&
    !isJapaneseArrestee(title) && !(/日本国籍|日本に帰化|帰化した/.test(src) && !COORD_RE.test(title)) &&
    (opts.requireLocation === false || !!(resolvePrefecture(title, opts).pref || resolvePrefecture(desc, opts).pref));
}

/**
 * 1件の判定を検証する。戻り値: { status: 'accepted'|'rejected'|'review', code, reason, ... }
 * 採用条件: 被疑者側の国籍表現が原文に実在 ＋ 刑事手続語 ＋ 被害者・雇用主・日本人被疑者・海外事件でない。
 * 場所は「一意に決まれば県名、決まらなければ場所不明」で採用する（LOCATION_STRICT=1 のときだけ review）。
 * AIの引用が不正確でも、原文に被疑者側の国籍表現がルールで見つかれば採用側に倒す（取りこぼし防止）。
 */
function verifyItem(item, res, opts = {}) {
  const strict = opts.strictLocation != null ? opts.strictLocation : LOCATION_STRICT;
  const { title, desc } = ownText(item);
  const src = `${title} ${desc}`;
  const srcSq = squash(src);
  const out = (status, code, reason, extra = {}) => ({ status, code, reason, ...extra });

  if (!res || res.isValid !== true) {
    return out('rejected', 'ai_rejected', String((res && res.reason) || 'AI判定: 不採用'), { ruleAgrees: rulesPass(item, opts) });
  }

  // AIが明示した「除外すべき性質」は機械的に採る（ここは取りこぼしより誤採用の排除を優先する）
  if (res.suspectNationality === 'japanese') return out('rejected', 'japanese_suspect', 'AI: 被疑者は日本人（日本国内の日本人の犯罪は対象外）', { ruleAgrees: false });
  if (res.suspectNationality === 'victim_only') return out('rejected', 'victim_side', 'AI: 外国籍の側は被害者のみ', { ruleAgrees: false });
  if (res.crimeInJapan === 'no') return out('rejected', 'overseas', 'AI: 日本国外で起きた事件', { ruleAgrees: false });

  let sus = nfkc(res.suspectEvidence).trim();
  const loc = nfkc(res.locationEvidence).trim();
  let evCode = null;
  if (sus.length < 4) evCode = ['no_suspect_evidence', '被疑者の証拠引用が無い/短い'];
  else if (!srcSq.includes(squash(sus))) evCode = ['evidence_not_in_source', '被疑者の証拠引用が原文に無い'];
  else if (!NAT_RE.test(sus)) evCode = ['no_nationality', '証拠引用に国籍表現が無い'];
  else if (isVictimSide(sus)) evCode = ['victim_side', 'AIが引いた箇所は被害者側'];
  let susFallback = false;
  if (evCode) {
    const r = ruleSuspect(title, desc); // 原文に被疑者側の国籍表現があれば、AIの引用ミスは救済する
    if (!r) return out('rejected', evCode[0], evCode[1], { suspectEvidence: sus, locationEvidence: loc });
    sus = r; susFallback = true;
  }
  const ev = { suspectEvidence: sus, locationEvidence: loc };

  if (!CRIME_RE.test(title) && !CRIME_RE.test(desc)) return out('rejected', 'no_crime_term', '見出し・要約に刑事手続語が無い', ev);
  if (isOverseas(src)) return out('rejected', 'overseas', '外国の捜査・司法機関が主体で、日本の警察の記述が無い', ev);
  if (/日本国籍|日本に帰化|帰化した/.test(src) && !COORD_RE.test(title)) return out('rejected', 'japanese_suspect', '日本国籍（帰化を含む）と明記されている', ev);
  const occ = [...natOccurrences(title), ...natOccurrences(desc)];
  if (occ.length && occ.every((o) => !o.suspect)) return out('rejected', 'victim_side', '国籍表現が被害者・雇用主・対象の側（被疑者ではない）', ev);
  if (isJapaneseArrestee(title)) return out('rejected', 'japanese_suspect', '逮捕されたのは日本人（外国籍の側は被害者・関係者）', ev);

  const locRes = loc.length >= 2 && srcSq.includes(squash(loc)) ? resolvePrefecture(loc, opts) : miss('no_location_evidence');
  const titleRes = resolvePrefecture(title, opts);
  let pref = locRes.pref || null;
  let conflict = false;
  if (pref && titleRes.pref && titleRes.pref !== pref) conflict = true;
  if (!pref) pref = titleRes.pref || null;
  if (!pref && desc) pref = resolvePrefecture(desc, opts).pref || null; // 見出しで決まらなければ要約で
  if (conflict) pref = null;
  // AIが「日本国内か判断できない」と言い、日本の地名も日本の警察・検察の語も無い → 公開しない（海外事件を通さない）
  if (!pref && res.crimeInJapan === 'unknown' && !JP_AUTH_RE.test(src)) return out('review', 'domestic_unconfirmed', '日本国内の事件と確認できない', ev);
  if (!pref && strict) {
    const amb = conflict || /^ambiguous/.test(locRes.reason || '') || /^ambiguous/.test(titleRes.reason || '');
    return out('review', conflict ? 'location_conflict' : amb ? 'location_ambiguous' : 'location_unresolved', `場所を一意に決められない: 「${loc}」`, ev);
  }

  const ct = String(res.cleanTitle || '').trim();
  const cleanTitleOk = ct.length > 0 && titleFactsOk(ct, src, pref, opts);
  return out('accepted', 'accepted', String(res.reason || ''), {
    ...ev, pref, locationUnknown: !pref, susFallback, cleanTitle: cleanTitleOk ? ct : null, cleanTitleOk,
  });
}

/** AIを使えないときの代替: ルールだけで「AIが採用と言った場合」と同じ形の応答を組み立てる */
function ruleOnlyResponse(item) {
  const { title, desc } = ownText(item);
  const nat = ruleSuspect(title, desc);
  if (!nat) return null;
  const src = nfkc(title).includes(nat) ? nfkc(title) : nfkc(desc);
  return { isValid: true, reason: 'ルール判定（AI未使用）', cleanTitle: '', suspectEvidence: src.slice(Math.max(0, src.indexOf(nat)), src.indexOf(nat) + nat.length + 12), locationEvidence: title };
}

// ───────────────────────── 状態ファイル ─────────────────────────
function loadState(p) {
  try {
    const s = JSON.parse(fs.readFileSync(p, 'utf-8'));
    if (s && typeof s.decisions === 'object') {
      const now = Date.now();
      for (const [k, d] of Object.entries(s.decisions)) {
        if (d.ts && now - new Date(d.ts).getTime() > CFG.trimMs) delete s.decisions[k];
      }
      return s;
    }
  } catch (_) { /* 初回 */ }
  return { version: 2, decisions: {} };
}
function saveState(p, state) {
  state.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(state, null, 2), 'utf-8');
}
function setOutput(k, v) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
}

// ───────────────────────── Gemini 呼び出し ─────────────────────────
const kindErr = (kind, message) => Object.assign(new Error(message), { kind }); // transient | permanent | parse | budget
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildPrompt(items) {
  const list = items
    .map((it, i) => {
      const { title, desc } = ownText(it);
      return `[記事番号: ${i}]\n見出し: ${title}\n要約: ${desc || 'なし'}`;
    })
    .join('\n\n');
  return `あなたは、日本国内で発生した「外国籍の被疑者・被告人による事件」の報道を、取りこぼさず収録するデータベースの一次判定担当です。
下の記事（見出しと要約のみ。本文はありません）を1件ずつ判定し、記事と同じ件数のJSON配列だけを出力してください。
この後に、別の校閲担当が誤採用を探す最終精査を行います。あなたは取りこぼしを出さないことを優先し、明確に対象外のものだけを不採用にしてください。

【採用（isValid: true）】
1. 日本国内で起きた刑事事件（逮捕・送検・起訴・摘発・公判・捜査など）の報道である
2. 被疑者・被告人（加害側）が外国籍・外国人であることが、見出しか要約に読み取れる
   （「○○国籍」「○○人」「外国人」「技能実習生」「留学生」「不法滞在」、カタカナのフルネーム＋容疑者、なども含む）
3. 場所が書かれていなくても、日本の警察・検察・裁判所の報道と読めれば採用してよい（場所の引用は空文字でよい）

【不採用（isValid: false）— 明確なものだけ】
- 海外で起きた事件・海外の司法手続き（日本の警察が関与していないもの）
- 被疑者が日本人・日本国籍のもの（日本国内の日本人の犯罪は対象外）
- 外国人が被害者のみで、被疑者が日本人・国籍不明のもの
- 被疑者の国籍・外国人属性が、見出しにも要約にも全く無いもの（推測は禁止）
- コラム・論評・行政広報・デマ検証記事

【構造化フィールド（必須）】
- suspectNationality: 被疑者・被告人の国籍を、見出し・要約から次のいずれかで答える。
  foreign（外国籍・外国人と読める）／japanese（日本人・日本国籍と読める）／victim_only（外国籍の人物は被害者・関係者だけ）／unknown（読み取れない）
- crimeInJapan: 事件が日本国内で起きたか。yes（日本の警察・検察・裁判所・日本の地名から読める）／no（海外と読める）／unknown（判断材料が無い）

【証拠の引用】
- suspectEvidence: 被疑者の国籍・外国人属性が書かれた箇所を、見出しか要約から一字も変えずに引用する。「ベトナム国籍の男を逮捕」のように国籍を示す語を必ず含める。
- locationEvidence: 事件の場所（自治体名・都道府県名・警察署名）が書かれた箇所を、そのまま引用する。無ければ空文字。媒体名（○○新聞など）は場所の証拠にならない。
- 不採用のときは suspectEvidence・locationEvidence・cleanTitle を空文字にする。
- cleanTitle: 採用時のみ。「状況＋容疑＋国籍・年齢＋逮捕/送検＋地域」のストレートニュース形式に整える。年齢・人数・国籍・地名は原文にあるものだけを使い、無いものを補わない。
- reason: 20字以内。

【記事】
${list}`;
}

/** 最終精査: 一次判定を通った記事から「誤採用」を探す。別の視点（除外の根拠探し）で読ませる */
function buildAuditPrompt(entries) {
  const list = entries
    .map((e, i) => {
      const { title, desc } = ownText(e.item);
      return `[記事番号: ${i}]\n見出し: ${title}\n要約: ${desc || 'なし'}\n一次判定: 被疑者の国籍表現「${e.s1.suspectEvidence || '-'}」／場所「${e.s1.pref || '不明'}」`;
    })
    .join('\n\n');
  return `あなたは、「日本国内で発生した、外国籍の被疑者・被告人による事件」だけを収録するデータベースの【最終校閲】担当です。
下の記事は一次判定で採用候補になりました。あなたの仕事は、公開してはいけない誤採用を見つけて除外することです。
記事と同じ件数のJSON配列だけを出力してください。

【除外（verdict: exclude）にするもの】category と、見出しか要約から一字も変えずに引いた根拠 evidence が必須です。
- overseas: 事件が日本国外で起きた／外国の捜査・司法機関の手続きで、日本の警察が関与していない
- japanese_suspect: 被疑者・被告人が日本人・日本国籍。または、逮捕されたのは日本人で、外国籍の人物は被害者・関係者・雇用主・経営者にすぎない
- victim_only: 外国籍の人物が被害者だけで、外国籍の被疑者がいない
- nationality_unknown: 被疑者の国籍・外国人属性が、見出しにも要約にも書かれていない
- not_crime_report: 個別の事件の報道ではない（コラム・論評・行政広報・デマ検証・統計・過去の回顧など）

【保持（verdict: keep）にするもの】
- 上のどれにも、原文から根拠を引いて言えないもの。推測で除外してはいけません（根拠が引けない除外は無効になります）。
- 外国籍の被疑者と日本人の被疑者が一緒に逮捕された記事は keep です。
- 被害者が外国人でも、別に外国籍の被疑者がいれば keep です。

【locationOk】一次判定の場所が、記事の内容と食い違っているときだけ false。場所が「不明」なら true のままにします。
evidence は keep のとき空文字にします。reason は30字以内。

【記事】
${list}`;
}

const enumStr = (values) => ({ type: 'STRING', enum: values });
const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      index: { type: 'INTEGER' },
      isValid: { type: 'BOOLEAN' },
      reason: { type: 'STRING' },
      cleanTitle: { type: 'STRING' },
      suspectEvidence: { type: 'STRING' },
      locationEvidence: { type: 'STRING' },
      suspectNationality: enumStr(['foreign', 'japanese', 'victim_only', 'unknown']),
      crimeInJapan: enumStr(['yes', 'no', 'unknown']),
    },
    required: ['index', 'isValid', 'reason', 'cleanTitle', 'suspectEvidence', 'locationEvidence', 'suspectNationality', 'crimeInJapan'],
  },
};
const AUDIT_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      index: { type: 'INTEGER' },
      verdict: enumStr(['keep', 'exclude']),
      category: enumStr(['ok', 'overseas', 'japanese_suspect', 'victim_only', 'nationality_unknown', 'not_crime_report']),
      evidence: { type: 'STRING' },
      locationOk: { type: 'BOOLEAN' },
      reason: { type: 'STRING' },
    },
    required: ['index', 'verdict', 'category', 'evidence', 'locationOk', 'reason'],
  },
};

const AUDIT_CATS = new Set(['overseas', 'japanese_suspect', 'victim_only', 'nationality_unknown', 'not_crime_report']);
/**
 * 最終精査の応答を評価する。除外は「原文に実在する根拠の引用」があるときだけ有効（AIの幻覚で正しい記事を消さない）。
 * 根拠が引けない除外は公開もしない（review）。戻り値: keep | exclude | review | retry
 */
function evalAudit(item, res) {
  if (!res) return { action: 'retry' };
  const reason = String(res.reason || '');
  if (res.verdict === 'keep') return { action: 'keep', locationOk: res.locationOk !== false, reason };
  if (res.verdict !== 'exclude') return { action: 'retry' };
  const cat = AUDIT_CATS.has(res.category) ? res.category : 'other';
  const { title, desc } = ownText(item);
  const ev = nfkc(res.evidence).trim();
  if (ev.length >= 2 && squash(`${title} ${desc}`).includes(squash(ev))) return { action: 'exclude', code: `audit_${cat}`, reason, evidence: ev };
  return { action: 'review', code: 'audit_unverified_exclusion', reason: `最終精査が除外を示したが、原文に根拠の引用が無い (${cat}): ${reason}` };
}

async function requestOnce(model, prompt, schema, ctx) {
  let resp;
  try {
    resp = await ctx.fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ctx.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0, maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(CFG.requestTimeoutMs),
    });
  } catch (e) {
    throw kindErr('transient', `通信エラー: ${e.message}`);
  }
  if (resp.status === 429 || resp.status >= 500) throw kindErr('transient', `HTTP ${resp.status}`);
  if (!resp.ok) throw kindErr('permanent', `HTTP ${resp.status}（モデル名・キー・権限を確認）`);

  let data;
  try { data = await resp.json(); } catch (_) { throw kindErr('parse', 'レスポンスがJSONでない'); }
  const cand = data && data.candidates && data.candidates[0];
  if (!cand) throw kindErr('parse', `candidatesなし (blockReason: ${(data && data.promptFeedback && data.promptFeedback.blockReason) || '-'})`);
  if (cand.finishReason && cand.finishReason !== 'STOP') throw kindErr('parse', `finishReason=${cand.finishReason}`);
  const text = ((cand.content && cand.content.parts) || []).filter((p) => !p.thought).map((p) => p.text || '').join('').replace(/```json|```/g, '').trim();
  let arr;
  try { arr = JSON.parse(text); } catch (_) { throw kindErr('parse', 'JSONとして解析できない'); }
  if (!Array.isArray(arr)) throw kindErr('parse', '配列ではない');
  return arr;
}

async function throttle(ctx) {
  const wait = ctx.lastCallAt + ctx.minIntervalMs - Date.now();
  if (wait > 0) await sleep(wait);
  ctx.lastCallAt = Date.now();
}

async function callGemini(items, ctx, kind) {
  const prompt = kind === 'audit' ? buildAuditPrompt(items) : buildPrompt(items);
  const schema = kind === 'audit' ? AUDIT_SCHEMA : RESPONSE_SCHEMA;
  // 最終精査は、一次判定に使ったモデルとは別のモデルを優先する（同じ見落としを繰り返さないため）
  const order = kind === 'audit' && ctx.triageModel ? [...MODELS.filter((m) => m !== ctx.triageModel), ...MODELS.filter((m) => m === ctx.triageModel)] : MODELS;
  let lastErr = null;
  for (const model of order) {
    if (ctx.deadModels.has(model)) continue;
    if (ctx.calls >= CFG.maxApiCallsPerRun) throw kindErr('budget', `API呼び出し上限(${CFG.maxApiCallsPerRun})に到達`);
    await throttle(ctx);
    ctx.calls++;
    try {
      const arr = await requestOnce(model, prompt, schema, ctx);
      ctx.model = model;
      return arr;
    } catch (e) {
      if (e.kind === 'parse') throw e; // モデルを替えても直らない前提で、分割リトライに回す
      if (e.kind === 'permanent') ctx.deadModels.add(model);
      lastErr = e;
      ctx.log.warn(`[AI] ${model}: ${e.message}`);
    }
  }
  throw lastErr || kindErr('permanent', '利用可能なモデルがない');
}

/** 戻り値は items と同じ長さ: { res } | { failed, message } | undefined（中断で未処理） */
async function inspectChunk(items, ctx, kind = 'triage') {
  if (ctx.abort) return items.map(() => undefined);
  try {
    const arr = await callGemini(items, ctx, kind);
    const byIdx = new Map();
    for (const r of arr) {
      if (r && Number.isInteger(r.index) && r.index >= 0 && r.index < items.length && !byIdx.has(r.index)) byIdx.set(r.index, r);
    }
    return items.map((_, i) => (byIdx.has(i) ? { res: byIdx.get(i) } : { failed: 'missing', message: 'AIの出力に含まれない' }));
  } catch (e) {
    if (e.kind !== 'parse') {
      ctx.abort = { kind: e.kind || 'transient', message: e.message };
      return items.map(() => undefined);
    }
    if (items.length === 1) return [{ failed: 'parse', message: e.message }];
    const mid = Math.ceil(items.length / 2);
    const left = await inspectChunk(items.slice(0, mid), ctx, kind);
    const right = await inspectChunk(items.slice(mid), ctx, kind);
    return [...left, ...right];
  }
}

// ───────────────────────── 実行本体 ─────────────────────────
const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 70);

function writeStepSummary(md) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
}
function appendShadowLog(records, logPath) {
  if (!records.length) return;
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, records.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf-8');
  if (fs.statSync(logPath).size > 2_000_000) {
    const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n');
    fs.writeFileSync(logPath, lines.slice(-4000).join('\n') + '\n', 'utf-8');
  }
}

/**
 * 流れ: 一次判定（取りこぼさない側）→ コードによる強制排除（海外・日本人被疑者・被害者のみ）→ 最終精査（Geminiが誤採用を探す）→ 公開
 * 公開されるのは、最終精査を通った記事だけ。AIが使えない間は公開せず、次回に持ち越す（RULE_FALLBACK=1 のときだけ例外）。
 * @param {object} p
 * @param {object[]} p.candidates      審査対象（新着候補）
 * @param {boolean}  p.shadow          true: 公開データに触れず比較ログだけ残す
 * @param {object[]|null} p.legacyAccepted  シャドー時、旧ロジックが採用した記事（比較用）
 * @param {string}   p.apiKey
 * @returns {{accepted: object[], summary: object}}
 */
async function run(p) {
  const { candidates, shadow, legacyAccepted = null, apiKey, primaryLocationSigns = [] } = p;
  const log = p.log || console;
  const statePath = p.statePath || path.join(DATA_DIR, shadow ? 'aiDecisions.shadow.json' : 'aiDecisions.json');
  const shadowLogPath = p.shadowLogPath || path.join(DATA_DIR, 'shadowComparison.jsonl');
  const state = loadState(statePath);
  const summary = {
    evaluated: 0, stage1Passed: 0, accepted: 0, rejected: 0, review: 0, pending: 0, pendingAudit: 0, skipped: 0, deferred: 0,
    auditExcluded: 0, auditReview: 0, ruleAccepted: 0, reverified: 0, unknownLocation: 0, aborted: null, codes: {},
  };
  const accepted = [];
  const records = [];
  const unresolved = [];
  const overridable = []; // 一次判定でAIが不採用にしたが、ルール上は通る記事（取りこぼし候補）
  const excluded = []; // 最終精査が除外した記事（根拠つき）
  const legacyKeys = legacyAccepted ? new Set(legacyAccepted.map(articleKey)) : null;
  const ruleFallbackOn = process.env.RULE_FALLBACK === '1'; // 既定は無効: AI（最終精査）を通さずに公開しない
  const vopts = { primaryLocationSigns };

  const toStage1 = (v) => ({
    pref: v.pref || null, locationUnknown: !v.pref, cleanTitle: v.cleanTitleOk ? v.cleanTitle : null, cleanTitleOk: !!v.cleanTitleOk,
    suspectEvidence: v.suspectEvidence, locationEvidence: v.locationEvidence, susFallback: !!v.susFallback,
  });
  const adopt = (item, s1) => {
    const adopted = { ...item };
    if (s1.cleanTitleOk && s1.cleanTitle) adopted.title = s1.cleanTitle;
    const existing = item.location && item.location !== UNKNOWN_LOCATION ? item.location : null; // 取得側の detectLocation が決めた場所
    adopted.location = s1.pref || existing || UNKNOWN_LOCATION;
    adopted.summary = `${adopted.location}で発生した外国人関与の事件・容疑に関する報道速報です。`; // 既存サイトの文言に合わせる
    if (adopted.location === UNKNOWN_LOCATION) summary.unknownLocation++;
    accepted.push(adopted);
    summary.accepted++;
    return adopted;
  };
  const shadowRec = (item, key, ts, status, code, reason, extra = {}) => {
    if (!shadow) return;
    const legacy = legacyKeys ? (legacyKeys.has(key) ? 'accepted' : 'rejected') : 'unknown';
    records.push({
      ts, key, title: item.title, url: item.url || '', legacy, gate: status, code, reason, ...extra,
      agree: legacy === 'unknown' ? null : (legacy === 'accepted') === (status === 'accepted'),
    });
  };
  const ruleOnly = (item, key, ts) => {
    const res = ruleOnlyResponse(item);
    const v = res && verifyItem(item, res, vopts);
    if (!v || v.status !== 'accepted' || v.locationUnknown) return false; // AIなしでは場所が一意に決まる記事だけ
    state.decisions[key] = { status: 'accepted', code: 'accepted_by_rules_unaudited', reason: v.reason, title: item.title, location: v.pref, model: 'rules', ts };
    adopt(item, toStage1(v));
    summary.ruleAccepted++;
    return true;
  };

  // ── 対象の仕分け: 既決はスキップ / 精査待ちは最終精査へ / 要確認は保存したAI応答を辞書更新後に再検証 ──
  const todo = [];
  const auditQueue = [];
  for (const item of candidates) {
    const key = articleKey(item);
    const d = state.decisions[key];
    if (d && d.status === 'pending_audit' && d.stage1) { auditQueue.push({ item, key, s1: d.stage1 }); continue; }
    if (d && d.status === 'review' && d.ai) {
      const v = verifyItem(item, d.ai, vopts);
      if (v.status === 'accepted') {
        const s1 = toStage1(v);
        state.decisions[key] = { ...d, status: 'pending_audit', code: 'stage1_reverified', stage1: s1, ai: undefined, ts: new Date().toISOString() };
        auditQueue.push({ item, key, s1 });
        summary.reverified++;
      } else summary.skipped++;
      continue;
    }
    if (d && ['accepted', 'rejected', 'review'].includes(d.status)) { summary.skipped++; continue; }
    todo.push({ item, key });
  }
  if (todo.length === 0 && auditQueue.length === 0) {
    if (summary.reverified || summary.skipped) { saveState(statePath, state); if (summary.reverified) setOutput('state_changed', 'true'); }
    return { accepted, summary };
  }

  if (!apiKey) {
    const ts0 = new Date().toISOString();
    if (ruleFallbackOn) for (const w of todo) ruleOnly(w.item, w.key, ts0);
    saveState(statePath, state);
    if (summary.ruleAccepted || summary.reverified) setOutput('state_changed', 'true');
    summary.pendingAudit = auditQueue.length;
    summary.aborted = { kind: 'no_api_key', message: `GEMINI_API_KEY 未設定。${ruleFallbackOn ? `（RULE_FALLBACK=1）ルール判定のみで ${summary.ruleAccepted} 件を、最終精査なしで採用。` : '新着は審査されず、公開もされません（fail-closed）。'}残りは次回へ` };
    log.warn(`::warning title=AI gate::${summary.aborted.message}`);
    writeStepSummary(`### AIゲート\n⚠️ ${summary.aborted.message}`);
    return { accepted, summary };
  }

  const work = todo.slice(0, CFG.chunkSize * CFG.maxChunksPerRun);
  summary.deferred = todo.length - work.length;
  const ctx = {
    apiKey, log, fetchImpl: p.fetchImpl || fetch, minIntervalMs: p.minIntervalMs != null ? p.minIntervalMs : CFG.minIntervalMs,
    lastCallAt: 0, calls: 0, deadModels: new Set(), abort: null, model: null, triageModel: null,
  };

  // ── 段1: 一次判定（取りこぼさない側）＋ コードの検証・強制排除 ──
  for (let i = 0; i < work.length && !ctx.abort; i += CFG.chunkSize) {
    const chunk = work.slice(i, i + CFG.chunkSize);
    log.log(`   📦 一次判定 ${i + 1}〜${i + chunk.length} / ${work.length} 件`);
    const outcomes = await inspectChunk(chunk.map((w) => w.item), ctx, 'triage');
    const ts = new Date().toISOString();
    outcomes.forEach((o, j) => {
      if (!o) return; // 中断で未処理 → 記録せず次回へ
      const { item, key } = chunk[j];
      const prev = state.decisions[key] || {};
      if (o.failed) {
        const attempts = (prev.attempts || 0) + 1;
        if (attempts >= CFG.maxAttempts) {
          state.decisions[key] = { status: 'review', code: 'attempts_exceeded', reason: `${o.failed}: ${o.message}`, attempts, title: item.title, ts };
          summary.review++; bump(summary.codes, 'attempts_exceeded');
        } else {
          state.decisions[key] = { status: 'pending', attempts, title: item.title, ts };
          summary.pending++;
        }
        return;
      }
      const v = verifyItem(item, o.res, vopts);
      const rec = { status: v.status, code: v.code, reason: v.reason, title: item.title, suspectEvidence: v.suspectEvidence, locationEvidence: v.locationEvidence, model: ctx.model, ts };
      summary.evaluated++;
      if (v.status === 'accepted') {
        const s1 = toStage1(v);
        state.decisions[key] = { ...rec, status: 'pending_audit', code: 'stage1_passed', stage1: s1 }; // まだ公開しない。最終精査を通ってから
        auditQueue.push({ item, key, s1 });
        summary.stage1Passed++;
        return;
      }
      summary[v.status]++;
      bump(summary.codes, v.code);
      if (v.status === 'review') { unresolved.push({ title: item.title, loc: v.locationEvidence, code: v.code }); rec.ai = o.res; }
      if (v.ruleAgrees) overridable.push({ title: item.title, reason: v.reason });
      state.decisions[key] = rec;
      shadowRec(item, key, ts, v.status, v.code, v.reason, { suspectEvidence: v.suspectEvidence, locationEvidence: v.locationEvidence });
    });
  }
  ctx.triageModel = ctx.model;

  // ── 段2: 最終精査（別モデルを優先。除外は原文の引用つきのときだけ有効。通った記事だけ公開） ──
  let auditedRun = 0;
  for (let i = 0; i < auditQueue.length && !ctx.abort; i += CFG.chunkSize) {
    const chunk = auditQueue.slice(i, i + CFG.chunkSize);
    log.log(`   🔎 最終精査 ${i + 1}〜${i + chunk.length} / ${auditQueue.length} 件`);
    const outcomes = await inspectChunk(chunk, ctx, 'audit');
    const ts = new Date().toISOString();
    outcomes.forEach((o, j) => {
      if (!o) return;
      const { item, key, s1 } = chunk[j];
      const cur = state.decisions[key] || {};
      const a = o.failed ? { action: 'retry' } : evalAudit(item, o.res);
      if (a.action === 'retry') { // 精査できなかった記事は公開せず、次回に再精査する
        const n = (cur.auditAttempts || 0) + 1;
        if (n >= CFG.maxAttempts) {
          state.decisions[key] = { status: 'review', code: 'audit_attempts_exceeded', reason: '最終精査が5回続けて結果を返さない', title: item.title, ts };
          summary.review++; bump(summary.codes, 'audit_attempts_exceeded');
        } else state.decisions[key] = { ...cur, auditAttempts: n };
        return;
      }
      auditedRun++;
      if (a.action === 'keep') {
        let f = s1;
        if (!a.locationOk) f = { ...s1, pref: null, locationUnknown: true }; // 場所の食い違いは、間違った県で出さず「場所不明」にする
        if (!f.pref && LOCATION_STRICT) {
          state.decisions[key] = { status: 'review', code: 'location_unresolved', reason: '場所を一意に決められない', title: item.title, ts };
          summary.review++; bump(summary.codes, 'location_unresolved');
          return;
        }
        state.decisions[key] = { status: 'accepted', code: f.pref ? 'accepted' : 'accepted_location_unknown', reason: a.reason, title: item.title, location: f.pref || (item.location && item.location !== UNKNOWN_LOCATION ? item.location : UNKNOWN_LOCATION), cleanTitle: f.cleanTitle, model: ctx.model, ts };
        adopt(item, f);
        shadowRec(item, key, ts, 'accepted', 'accepted', a.reason, { pref: f.pref, cleanTitle: f.cleanTitle, suspectEvidence: s1.suspectEvidence, locationEvidence: s1.locationEvidence });
      } else if (a.action === 'exclude') {
        state.decisions[key] = { status: 'rejected', code: a.code, reason: a.reason, evidence: a.evidence, title: item.title, model: ctx.model, ts };
        summary.rejected++; summary.auditExcluded++; bump(summary.codes, a.code);
        excluded.push({ title: item.title, code: a.code, evidence: a.evidence });
        shadowRec(item, key, ts, 'rejected', a.code, a.reason, { suspectEvidence: s1.suspectEvidence });
      } else { // review: 除外を示したが根拠が原文に無い → 公開しない（人が見る）
        state.decisions[key] = { status: 'review', code: a.code, reason: a.reason, title: item.title, model: ctx.model, ts }; // ai は保存しない（再検証で精査を空回りさせない）
        summary.review++; summary.auditReview++; bump(summary.codes, a.code);
        unresolved.push({ title: item.title, loc: a.reason, code: a.code });
        shadowRec(item, key, ts, 'review', a.code, a.reason);
      }
    });
  }
  summary.pendingAudit = auditQueue.filter((w) => (state.decisions[w.key] || {}).status === 'pending_audit').length;

  if (ctx.abort && ctx.abort.kind === 'permanent' && ruleFallbackOn) {
    const tsR = new Date().toISOString();
    for (const w of todo) if (!state.decisions[w.key] || state.decisions[w.key].status === 'pending') ruleOnly(w.item, w.key, tsR);
  }
  if (ctx.abort) {
    summary.aborted = ctx.abort;
    const level = ctx.abort.kind === 'permanent' ? 'error' : 'warning';
    log.warn(`::${level} title=AI gate::審査を中断 (${ctx.abort.kind}): ${ctx.abort.message}。未審査・精査待ちの分は公開せず、次回に持ち越します`);
  }
  saveState(statePath, state);
  setOutput('state_changed', 'true');

  if (shadow) appendShadowLog(records, shadowLogPath);
  const mism = records.filter((r) => r.agree === false);
  const md = [
    `### AIゲート（${shadow ? 'シャドー運転' : '本番'}）`,
    `一次判定 ${summary.evaluated} ／ 一次通過 ${summary.stage1Passed} ／ **公開 ${summary.accepted}** ／ 却下 ${summary.rejected} ／ 要確認 ${summary.review} ／ 保留 ${summary.pending} ／ 精査待ち ${summary.pendingAudit} ／ 既決スキップ ${summary.skipped} ／ 次回持越 ${summary.deferred}`,
    `最終精査: 実施 ${auditedRun} ／ 除外 ${summary.auditExcluded} ／ 根拠なしの除外（要確認） ${summary.auditReview}`,
    summary.aborted ? `⚠️ 中断: ${summary.aborted.kind} — ${summary.aborted.message}` : '',
    Object.keys(summary.codes).length ? `理由別: ${Object.entries(summary.codes).map(([k, v]) => `${k}=${v}`).join(', ')}` : '',
    summary.ruleAccepted || summary.reverified || summary.unknownLocation ? `ルール採用(精査なし) ${summary.ruleAccepted} ／ 再判定 ${summary.reverified} ／ 場所不明で公開 ${summary.unknownLocation}` : '',
    excluded.length ? '\n最終精査が除外した記事（根拠の引用つき。誤除外がないか見る）:\n' + excluded.slice(0, 30).map((u) => `- [${u.code}] ${cell(u.title)} ← 「${cell(u.evidence)}」`).join('\n') : '',
    shadow && records.length ? `新旧の不一致: ${mism.length} / ${records.length} 件` : '',
    mism.length ? '\n| 旧 | 新 | 理由 | 見出し |\n|---|---|---|---|\n' + mism.slice(0, 30).map((r) => `| ${r.legacy} | ${r.gate} | ${cell(r.code)} | ${cell(r.title)} |`).join('\n') : '',
    overridable.length ? '\nAIは不採用だがルール上は通る記事（取りこぼし候補。多ければ一次判定のプロンプトを緩める）:\n' + overridable.slice(0, 20).map((u) => `- ${cell(u.title)}（AI: ${cell(u.reason)}）`).join('\n') : '',
    unresolved.length ? '\n要確認（辞書・署名表の追加候補、または根拠なしの除外）:\n' + unresolved.slice(0, 20).map((u) => `- [${u.code}] ${cell(u.loc)} ← ${cell(u.title)}`).join('\n') : '',
  ].filter(Boolean).join('\n');
  log.log('\n' + md);
  writeStepSummary(md);

  return { accepted, summary };
}

module.exports = {
  run, verifyItem, rulesPass, ruleSuspect, ruleOnlyResponse, resolvePrefecture, titleFactsOk, isVictimSide, isJapaneseArrestee, isOverseas, natOccurrences,
  articleKey, ownText, buildPrompt, buildAuditPrompt, evalAudit,
  setMunicipalities, loadMunicipalities, NAT_RE, CRIME_RE, CFG,
};
