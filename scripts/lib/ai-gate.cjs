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
  minIntervalMs: 0,
  trimMs: 60 * 24 * 60 * 60 * 1000,
  requestTimeoutMs: 10000,
};
const MODELS = ['rule-validator-primary', 'rule-validator-secondary'];

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
  const body = stripHtml(item.bodyContext || '').slice(0, 320); // 本文スキャンが取り出した「国籍語を含む文」。公開データには載せない
  const desc = [body, stripHtml(item.description || '').slice(0, 240)].filter(Boolean).join(' ');
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
  // 「台湾の男」「イランの女性」のように、国籍語の「国籍/人」が省略される報道表現も拾う。
  // ただし「カンボジアでかけ子…男2人逮捕」のような犯行地＋男への誤反応を防ぐため直後の「の」を必須化する。
  `(?:${COUNTRY_ALT})(?:(?:国籍|籍|人|出身)|(?=の(?:男|女|男性|女性|少年|少女|容疑者|被告|グループ|ら)))` +
  `|[ァ-ヴー]{2,}(?:国籍|籍の)` +
  `|外国人とみられる|外国籍とみられる|外国籍|外国人|外国出身` +
  `|国籍(?:は|が|を|の)(?:${COUNTRY_ALT})|特別永住者|永住者` + // 本文の言い回し（「男の国籍は韓国」「特別永住者」）
  `|[ァ-ヴー]{3,}人(?=の?(?:男|女|少年|少女|グループ|容疑者|被告|実習生|留学生|労働者|従業員|店員|運転手|客|ら))` + // 辞書にない国名（○○人の男）
  `|(?:${COUNTRY_ALT})系(?=の?(?:男|女|少年|少女|グループ|容疑者|被告))` + // 中国系の男
  `|[ァ-ヴー]{2,}(?:・[ァ-ヴー]{1,}){1,}(?=容疑者|被告|受刑者)` + // カタカナのフルネーム＋容疑者（verifyItem用。verifyArticleContentでは国籍語確認を併用）
  `|米軍(?:関係者|基地所属|軍人)|アメリカ軍(?:関係者|兵|人|隊員|所属|属)|在日米軍` +
  `|米兵|米軍(?:兵|属|関係者|隊員|人|所属)|米(?:海軍|空軍|陸軍|海兵隊)(?:兵|隊員|所属|上等兵|一等兵|二等兵|三等兵|伍長|軍曹|曹長|准尉|少尉|中尉|大尉|少佐|中佐|大佐|将官|幹部|軍属)?` +
  `|技能実習生|元技能実習生|特定技能実習生|特定技能|留学生|元留学生` + // verifyItem用（verifyArticleContentでは明示国籍語の確認を併用）
  `|不法(?:滞在|残留|入国)|不法就労(?!助長|さ[せ]|をさせ)|オーバーステイ|仮放免`;
const NAT_RE = new RegExp(NAT_SOURCE);
const NAT_RE_G = new RegExp(NAT_SOURCE, 'g'); // matchAll 用（g 必須。付け忘れると TypeError）
const CRIME_RE = /(?:逮捕|容疑|疑い|送検|送致|起訴|判決|求刑|初公判|公判|冒頭陳述|結審|摘発|指名手配|検挙|立件|勾留|拘禁刑|懲役|実刑|有罪|被告|家宅捜索|捜査|被疑者|補導|現行犯|身柄|確保|拘束|事情聴取|取り調べ|書類送検|再逮捕|追送検|罰金|略式|不起訴|起訴猶予|逃走)/;
// 被害者になった側の述語だけ（「けがをさせた」「死亡事故で逮捕」は容疑者側なので入れない）
const VICTIM_PASSIVE_RE =
  /(?:刺され|襲われ|はねられ|撥ねられ|轢かれ|ひかれ|殺害され|殺され|だまし取られ|騙し取られ|盗まれ|奪われ|連れ去られ|監禁され|搾取され|殴られ|蹴られ|切りつけられ|脅され|襲撃され|暴行を受け|被害に遭|被害を受け|[がは]被害(?![額総者])|[がは]被害者|重傷を負(?!わせ)|(?:大?けが|大?ケガ)を(?:負(?!わせ)|し(?:た|て|ましたが|ました))|(?:骨|鎖骨|肋骨|頭蓋骨|腕|足|首)[^。]{0,8}折(?:る|り|れ)|骨折|全治\s*[0-9０-９一二三四五六七八九十]+\s*[かヶケカ]?月|[がは](?:死亡|亡くな|重体|重傷|軽傷|大?けが|大?ケガ)(?!を?負わせ|させ)|遺体で)/;
// 国籍表現が「犯行の相手（目的語・対象）」または「被害施設・車両の所有者/管理者/搭乗者」になっているケース
// ※日本の事件報道では被疑者は「男/女」、被害者は「男性/女性/実習生/観光客」等と書かれるため、単独の「男/女」は入れない（「中国人男を殴った疑いで逮捕」の誤除外防止）
const VICTIM_OBJECT_RE =
  /^(?:(?:の)?(?:\d+歳の|\d+代の)?(?:(?:(?:技能実習生|特定技能実習生|実習生|留学生|観光客|乗客)(?:の)?(?:男性|女性)?|(?:男性|女性|女児|男児|少女|児童|高齢者|お年寄り|客|店員|従業員|社員))(?:\s*[（(]\d{1,3}(?:歳)?[）)])?(?:の(?:顔面?|頭|腹部?|胸|首|背中|足|腕|体|身体))?[^をがにの、。\s]{0,8}(?:を|に|に対し[、，]?)|(?:男子中学生|女子中学生|中学生|高校生|少年|少女|グループ|仲間)(?:ら)?(?:の(?:グループの仲間|グループ|仲間|男性|女性))?(?:ら)?に対し[、，]?)(?:[^。]{0,30}?(?:暴行|わさび|ワサビ|塗|食べさせ|熱湯|殴っ|殴打|蹴っ|刺し|殺害|殺し|襲っ|脅迫|脅し|恐喝|だまし|騙し|切りつけ|はね|撥ね|轢い|ひき逃げ|衝突し|監禁|拉致|連れ去|傷つけ|負傷させ|大?けがをさせ|大?ケガをさせ|死亡させ|死なせ|強盗|コンクリート|投げ|石を投げ|火をつけ|放火))|が(?:管理|所有|経営|運営|居住|住む|暮らす|乗っていた|運転していた|歩いていた)[^。]{0,22}?(?:会社|事務所|住宅|家|店|店舗|施設|モスク|寺院|教会|神社|ビル|アパート|マンション|車|乗用車|自転車|バイク)[^。]{0,18}?(?:に火をつけ|を全焼|を焼損|に放火|に侵入|を損壊|に衝突|にはね|から現金|から金品))/;
// 国籍表現が加害者ではない役割: 雇われた側・装われた側・乗客・対象（向け/相手）
// 「インド人の男に襲われ」: 人物名詞＋「に」＋受身 は、国籍側が動作主（加害者）。「男性 車にはねられ」の「車に」は該当しない
const AGENT_PASSIVE_RE = /^(?:の)?(?:男性|女性|男|女|少年|少女|グループ|集団|客|ら|\d+人組|容疑者)(?:\(\d+\))?(?:ら)?に[^、。]{0,6}?(?:刺され|襲われ|襲撃され|殴られ|蹴られ|切りつけられ|脅され|だまし取られ|盗まれ|奪われ|連れ去られ|監禁され)/;
const NON_SUSPECT_AFTER_RE = /^(?:被害者|被害女性|被害男性|観光客|乗客|の観光客|の乗客|窃盗グループ[^。]{0,12}から|の窃盗グループ[^。]{0,12}から|を乗せ|を送迎|を装|になりすま|風の|向け|相手|の相談|の支援|(?:[^。]{0,45}?)(?:に(?:(?:不法|違法)(?:に|な)?(?:働か|就労|滞在|残留|入国|労働|雇用)|働か|就労|雇|資格外活動をさせ|在留資格を得させ|偽造を依頼)|を(?:[^。]{0,30}?)(?:不法に働かせ|違法に働かせ|不法就労させ|就労させ|雇用し|雇い|雇って|かくまい|蔵匿し|隠避し))|から(?:[^。]{0,25}?)(?:買い取|譲り受け|購入し)|と偽|の?(?:男|女|男性|女性)は(?:現場にいた|事件を目撃|目撃していた|同乗していた|同行していた|立ち会っていた))/;
// ここに達したら被疑者側の述語または逆接による主語転換に入ったとみなして、被害者語彙の探索を打ち切る
const CLAUSE_STOP_RE = /[。]|ましたが|したが|ものの[、，]?|にもかかわらず|にも関わらず|逮捕|送検|送致|起訴|初公判|公判|求刑|判決|有罪|容疑|疑い|摘発|検挙|立件|書類送検/;

/** NAT の各出現を「被疑者になり得る」か判定する。スペースで窓を切らない（見出しは述語の前に空白が入る） */
const VICTIM_HEAD_RE = /(?:被害者|被害に遭った|被害を受けた|襲われたのは|(?:大?けが|大?ケガ)をしたのは|刺されたのは|殺害されたのは|亡くなったのは|死亡したのは|盗まれたのは|自転車に乗っていた|歩いていた|横断歩道を渡っていた|対立する)[^。、]{0,15}$/;
function natOccurrences(text) {
  const t = nfkc(text);
  return [...t.matchAll(NAT_RE_G)].map((m) => {
    const head = t.slice(Math.max(0, m.index - 28), m.index);
    const victimHead = VICTIM_HEAD_RE.test(head);
    const tail = t.slice(m.index + m[0].length, m.index + m[0].length + 150);
    const stop = tail.search(CLAUSE_STOP_RE);
    const stopSlice = stop >= 0 ? tail.slice(0, stop + 4) : tail;
    const win = stopSlice.slice(0, 60);
    const victimPossession = /^(?:観光客|女性|女|男性|男|客)[^。]{0,70}(?:が所持|が持|の所持|の持)[^。]{0,55}(?:を盗|を窃盗|を置き引き|が盗まれ|が奪われ)/.test(tail);
    const victim = victimHead || victimPossession || (!AGENT_PASSIVE_RE.test(win) && (VICTIM_PASSIVE_RE.test(win) || VICTIM_OBJECT_RE.test(win)));
    const nonSuspect = NON_SUSPECT_AFTER_RE.test(stopSlice.slice(0, 60));
    // index: 同じ国籍語が1文に2回出る（被害者と被疑者が同国籍）場合に、各出現の位置で判定するため保持
    return { text: m[0], index: m.index, victim, nonSuspect, suspect: !victim && !nonSuspect };
  });
}

// 人物語（職業・身分を含む）。「ベトナム国籍の解体工」「中国籍の大学生」のような被疑者表記を拾う。
const PERSON_NOUN = '(?:男|女|男性|女性|少年|少女|容疑者|被告|工員|会社員|会社役員|従業員|店員|運転手|作業員|解体工|技能実習生|留学生|大学生|専門学校生|アルバイト|無職|自営業|[0-9０-９]+人)';

// 国籍語が文中にあるだけでは加害者とみなさない。国籍表現が逮捕等の
// 直接目的語、または「国籍の男が逮捕」の主語に結び付く場合だけを採用する。
function nationalityLinkedToSuspect(sentence, occurrence) {
  const t = nfkc(sentence);
  const occText = nfkc(occurrence.text);
  // 同じ国籍語が複数回出る文では、natOccurrences が記録した出現位置を使う（先頭の被害者側と取り違えない）
  const at = Number.isInteger(occurrence.index) && t.slice(occurrence.index, occurrence.index + occText.length) === occText
    ? occurrence.index : t.indexOf(occText);
  if (at < 0) return false;
  const prefix = t.slice(Math.max(0, at - 70), at);
  const tail = t.slice(at + occText.length, at + occText.length + 180);
  // 逆接（「〜ましたが」「〜したが」「〜ものの」「〜にもかかわらず」）の後に別の主語（「○○被告は」「○○容疑者は」等）が来る場合は節を切る
  const clause = tail.split(/[。「」]|(?:ましたが|したが|ものの|にもかかわらず|にも関わらず)[、，\s]*(?=[一-龥々]{1,6}(?:被告|容疑者|受刑者)|男[はが]|女[はが]|警察)/, 1)[0];

  // 1. 同じ文に「逮捕されたのは日本人」など、実際の被疑者が別人だと明示されているときは除外
  if (/(?:逮捕|送検|送致|起訴)[^。]{0,24}(?:されたのは|したのは)\s*日本(?:人|国籍)/.test(clause)) return false;

  // 2. 従属節（「〜したとして、」「〜した疑いで、」「〜を乗せ、」「〜を不法就労させた疑いで、」「〜が管理する施設に火をつけ」「〜の仲間に対しコンクリート片を投げ」）の後に別の被疑者が来る構文は前半の国籍語が被害者/管理者/対象相手なので除外
  if (/^(?:の)?[^。]{0,85}?(?:に暴行|を暴行|の顔に|の顔面に|を乗せ|を送迎|を働かせ|を不法に働かせ|を違法に働かせ|を不法就労させ|に不法就労させ|を就労させ|を雇用|を雇い|から現金|から買い取|から購入|に偽造を依頼|をかくまい|を蔵匿|が管理する[^。]{0,25}?(?:火をつけ|全焼|放火|侵入|損壊)|(?:のグループ|の仲間|の生徒|の少年|の男性|の女性)に対し)[^。]{0,45}?(?:として|疑いで|容疑で|罪に問われ|コン|投げ|殴|蹴|刺|奪)/.test(clause)) return false;
  const escapedSuspectAct = /^(?:とみられる|風の|グループの|集団の|\s|の)*(?:男|女|人物|グループ|[0-9０-９]+人組?)[^。]{0,45}?(?:切り付け|切りつけ|刺し|殴|暴行|奪っ|盗ん|押し入|侵入|放火|はね|ひき逃げ|殺害)[^。]{0,30}?(?:逃走|逃げ|行方)/.test(clause);

  // 被害者・対象者としての明示を除外（「外国人女性は大ケガをしましたが」「遺体で見つかった」等）
  if (VICTIM_PASSIVE_RE.test(clause) || VICTIM_OBJECT_RE.test(clause)) return false;
  if (/(?:遺体|死亡|けが|ケガ|骨折|全治|重傷|軽傷|刺され|殴られ|被害|だまし取られ|奪われ)/.test(clause) && !/(?:容疑者|被告|逮捕|起訴|送検|不起訴)/.test(clause) && !escapedSuspectAct) return false;
  if (/^(?:の)?(?:女性|女|男性|男)[^、。]{0,24}(?:被害|を装|になりすま|と結婚|と偽)/.test(clause)) return false;

  // 国籍語の直後（読点区切りで住所・職業・自称などが挟まる場合を含む）に人物名詞が存在するか
  const personMatch = new RegExp(`^(?:[、，で]|の|で[^\\s、。]+[、，]|[\\s])?[^。]{0,80}?${PERSON_NOUN}`).test(clause);

  // 3. 導入構文: prefixに「逮捕されたのは」「起訴されたのは」等があり、後続に人物名詞
  const isIntro = /(?:逮捕|送検|送致|起訴|書類送検|再逮捕|摘発|初公判|公判|求刑|判決|有罪)[^。]{0,35}されたのは/.test(prefix);
  if (isIntro && personMatch && !/(?:日本人|日本国籍)[^、。]{0,12}(?:逮捕|容疑者|被告)/.test(prefix + clause)) {
    return true;
  }

  // 4. 直前逮捕・起訴修飾構文: prefixの直前で「〜逮捕された[国籍]の[人物]」
  const arrestInPrefix = /(?:逮捕|再逮捕|送検|書類送検|起訴|指名手配|初公判|公判|求刑|判決)[^。]{0,12}(?:された|した)[^。]{0,10}$/.test(prefix);
  if (arrestInPrefix && personMatch && !/(?:日本人|日本国籍)/.test(prefix)) {
    return true;
  }

  // 5. 罪名＋疑いで逮捕構文: prefixに容疑・罪名があり、clauseで人物〜逮捕/逃走
  const chargeInPrefix = /(?:疑い|容疑|違反)[^。]{0,20}(?:で|として)/.test(prefix);
  if (chargeInPrefix && personMatch && /(?:逮捕|送検|送致|起訴|不起訴|再逮捕|現行犯逮捕|初公判|公判|求刑|判決|有罪|逃走)/.test(clause)) {
    return true;
  }

  // 6. 直接逮捕・起訴・容疑者構文: 国籍の後に人物名詞があり、同一節で逮捕・送検・起訴・不起訴・容疑者・犯行後逃走等
  if (!personMatch) return false;
  const directPredicate = new RegExp(`(?:逮捕|送検|送致|起訴|不起訴|書類送検|再逮捕|現行犯逮捕|指名手配|身柄確保|摘発|検挙|拘束|容疑者|被告|初公判|公判|求刑|判決|有罪|実刑|懲役|禁錮|拘禁刑|罰金|(?:盗ん|窃盗|強盗|詐欺|暴行|侵入|密輸|所持|販売|製造|密造|撮影|運転|殺人)[^。]{0,24}(?:疑い|逃走))`);
  return directPredicate.test(clause) || escapedSuspectAct;
}

/** テキスト中の国籍表現が、すべて被疑者になり得ない（被害者側/雇用主側/対象側）なら true */
function isVictimSide(text) {
  const occ = natOccurrences(text);
  return occ.length > 0 && occ.every((o) => !o.suspect);
}

// 逮捕されたのが日本人で、外国籍の側は被害者・関係者にすぎない（「中国人女性を暴行した疑い 日本人の男を逮捕」）
const ARREST = '(?:逮捕|送検|送致|起訴|書類送検|初公判|公判|求刑|判決|有罪)';
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
// 外国の行政区画・裁判所・公安機関の固有名（韓国・中国・台湾など）および海外発信クレジット（【ソウル＝...】等）。国名を伴わない海外報道の翻訳記事を除外する。
const FOREIGN_REGION_RE = /(?:京畿道|江原道|慶尚[南北]道|全羅[南北]道|忠清[南北]道|済州道|釜山|仁川|大邱|水原|城南市|ブンダン|盆唐|[^\s、。]{1,6}支院|広東省|福建省|浙江省|江蘇省|遼寧省|吉林省|黒竜江省|山東省|河北省|河南省|四川省|雲南省|湖南省|湖北省|公安局|高雄|台中市|^\s*[【\[（(](?:ソウル|北京|上海|香港|台北|バンコク|マニラ|ハノイ|ジャカルタ|プノンペン|ヤンゴン|ニューデリー|ワシントン|ニューヨーク|ロサンゼルス|ロンドン|パリ|ベルリン|モスクワ|ローマ|シドニー|カイロ|イスタンブール|テヘラン|ドバイ)[＝=・\s時事共同])/m;
const isOverseas = (t) => {
  const x = nfkc(t);
  // 記事の別段落にある日本の地名・住所・逮捕場所が、海外で起きた犯行を
  // 国内事件へ反転させない。海外の事件場所・外国当局の執行が本文に明記
  // されている場合は、本文のどこかに都道府県名があるかで打ち消さない。
  return FOREIGN_ARREST_RE.test(x) || OVERSEAS_PLACE_RE.test(x) || FOREIGN_REGION_RE.test(x);
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
  浅草: '東京都', 石神井: '東京都', 尾久: '東京都', 五反野: '東京都', 蔵前: '東京都', 生田: '兵庫県', 葺合: '兵庫県', 甲子園: '兵庫県', 川端: '京都府', 行徳: '千葉県', 中村: '愛知県', 津幡: '石川県', 与板: '新潟県', 津川: '新潟県', うるま: '沖縄県', 大津北: '滋賀県', 門別: '北海道',
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
  for (const m of t.matchAll(/([一-龥ぁ-んァ-ヴー]{1,10}?)(?:警察署|署|地方検察庁|地検|区検|地方裁判所|地裁|簡裁)(?![一-龥])/g)) {
    const stem = m[1];
    for (let len = Math.min(stem.length, 8); len >= 1; len--) {
      const sub = stem.slice(-len);
      if (PREF_SHORT.has(sub)) {
        stationPrefs.add(PREF_SHORT.get(sub));
        break;
      }
      if (len < 2) continue;
      const r = lookupStation(sub, dict);
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

// ───────────────────────── ローカル審査実行本体 ─────────────────────────
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
 * 完全ローカル審査実行
 * 外部通信・Gemini API呼び出しは一切行わず、ルール検証（verifyItem / ruleOnlyResponse）のみで採否を決定
 * @param {object} p
 * @param {object[]} p.candidates 審査対象
 * @param {boolean}  p.shadow     true: 公開データに触れず比較ログだけ残す
 * @param {object[]|null} p.legacyAccepted シャドー時比較用
 * @returns {{accepted: object[], summary: object}}
 */
async function run(p) {
  const { candidates, shadow, legacyAccepted = null, primaryLocationSigns = [] } = p;
  const log = p.log || console;
  const statePath = p.statePath || path.join(DATA_DIR, shadow ? 'aiDecisions.shadow.json' : 'aiDecisions.json');
  const shadowLogPath = p.shadowLogPath || path.join(DATA_DIR, 'shadowComparison.jsonl');
  const state = loadState(statePath);
  const summary = {
    evaluated: 0, accepted: 0, rejected: 0, review: 0, pending: 0, skipped: 0,
    ruleAccepted: 0, unknownLocation: 0, codes: {},
  };
  const accepted = [];
  const records = [];
  const legacyKeys = legacyAccepted ? new Set(legacyAccepted.map(articleKey)) : null;
  const vopts = { primaryLocationSigns };

  const adopt = (item, v) => {
    const adopted = { ...item };
    if (v.cleanTitleOk && v.cleanTitle) adopted.title = v.cleanTitle;
    const existing = item.location && item.location !== UNKNOWN_LOCATION ? item.location : null;
    adopted.location = v.pref || existing || UNKNOWN_LOCATION;
    adopted.summary = `${adopted.location}で発生した外国人関与の事件・容疑に関する報道速報です。`;
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

  for (const item of candidates) {
    const key = articleKey(item);
    const d = state.decisions[key];
    if (d && ['accepted', 'rejected', 'review'].includes(d.status)) {
      summary.skipped++;
      continue;
    }

    summary.evaluated++;
    const res = ruleOnlyResponse(item);
    const v = res && verifyItem(item, res, vopts);
    const ts = new Date().toISOString();

    if (!v) {
      state.decisions[key] = { status: 'rejected', code: 'no_rule_match', reason: 'ルール不合致', title: item.title, ts };
      summary.rejected++;
      bump(summary.codes, 'no_rule_match');
      shadowRec(item, key, ts, 'rejected', 'no_rule_match', 'ルール不合致');
      continue;
    }

    const rec = { status: v.status, code: v.code, reason: v.reason, title: item.title, suspectEvidence: v.suspectEvidence, locationEvidence: v.locationEvidence, model: 'local-rules', ts };
    state.decisions[key] = rec;

    if (v.status === 'accepted') {
      adopt(item, v);
      summary.ruleAccepted++;
      shadowRec(item, key, ts, 'accepted', v.code, v.reason, { pref: v.pref, suspectEvidence: v.suspectEvidence, locationEvidence: v.locationEvidence });
    } else {
      if (v.status === 'rejected') summary.rejected++;
      else if (v.status === 'review') summary.review++;
      else summary.pending++;
      bump(summary.codes, v.code);
      shadowRec(item, key, ts, v.status, v.code, v.reason, { suspectEvidence: v.suspectEvidence, locationEvidence: v.locationEvidence });
    }
  }

  saveState(statePath, state);
  setOutput('state_changed', 'true');

  if (shadow) appendShadowLog(records, shadowLogPath);

  const md = [
    `### ローカル審査ゲート（${shadow ? 'シャドー運転' : '本番'}）`,
    `審査 ${summary.evaluated} ／ **採用 ${summary.accepted}** ／ 却下 ${summary.rejected} ／ 要確認 ${summary.review} ／ 既決スキップ ${summary.skipped}`,
    Object.keys(summary.codes).length ? `理由別: ${Object.entries(summary.codes).map(([k, v]) => `${k}=${v}`).join(', ')}` : '',
  ].filter(Boolean).join('\n');
  log.log('\n' + md);
  writeStepSummary(md);

  return { accepted, summary };
}

// 国内主要空港（密輸・出入国事件などで頻出する現場）
const DOMESTIC_AIRPORTS = {
  '福岡空港': '福岡県', '成田空港': '千葉県', '羽田空港': '東京都',
  '関西空港': '大阪府', '関西国際空港': '大阪府', '中部空港': '愛知県',
  '中部国際空港': '愛知県', '新千歳空港': '北海道', '那覇空港': '沖縄県',
  '伊丹空港': '大阪府', '大阪国際空港': '大阪府', '神戸空港': '兵庫県',
  '仙台空港': '宮城県', '広島空港': '広島県', '北九州空港': '福岡県'
};

// 地名辞書の語幹（例: 江戸川区→江戸川）が別地名の一部に偶然含まれるケースを補正する。
const DOMESTIC_LANDMARKS = {
  '江戸川台駅': '千葉県',
  // 「広島・福山港」のような県名省略の事件現場表記。
  '福山港': '広島県',
  // 多摩川〜武蔵小杉のような都県境を越える区間は、誤った都県を割り当てず全国扱いにする。
  '東急東横線': '全国',
};

// 警察署・捜査機関および居住地・出身地の表記を除去
function cleanPoliceAndResidence(str) {
  return nfkc(str)
    .replace(/(?:警視庁|北海道警|道警|東京都|京都府|大阪府|[一-龥]{2,3}(?:県警|府警))(?:は)?[、，\s]*(?:\d{1,2}日[、，\s]*)?(?:北海道|東京都|京都府|大阪府|[一-龥]{2,3}県)[^、。]{0,22}[、，\s]*(?=(?:住所不定|中国|韓国|台湾|ベトナム|フィリピン|ブラジル|タイ|インドネシア|ネパール|スリランカ|パキスタン|トルコ|ペルー|ミャンマー|カンボジア|米国|アメリカ|外国|[ァ-ヴー]{2,}国籍|会社員|無職|自称))/g, ' ')
    .replace(/[^\s、。]*(?:警察署|地裁|簡裁|高裁|最高裁|捜査本部|検察庁|地検|区検|県警|府警|道警|警視庁)/g, ' ')
    .replace(/[＝=][^＝=]{2,30}[＝=]/g, ' ')
    .replace(/[^\s、。]+(?:に住む|在住|出身)(?:の)?\s*(?:\d+代|\d+歳)?(?:の)?\s*(?:男性|女性|男|女|大学生|会社員|無職|容疑者)?(?:のクレジットカード|の名義)?/g, ' ')
    .replace(/(?:北海道|東京都|京都府|大阪府|[一-龥]{2,3}県)[^\s、。]{0,12}の(?:\d+代|\d+歳)?(?:男性|女性)のクレジットカード情報/g, ' ')
    .replace(/(?:容疑で|疑いで|として|されたのは)[、，\s]*(?:いずれも[^、。]{1,18}[、，\s]*)?(?:北海道|東京都|京都府|大阪府|[一-龥]{2,3}県)?[^、。]{1,22}?(?:市|区|町|村)[^、。]{0,14}[、，\s]*(?=(?:中国|韓国|台湾|ベトナム|フィリピン|ブラジル|タイ|インドネシア|ネパール|スリランカ|パキスタン|トルコ|ペルー|ミャンマー|カンボジア|米国|アメリカ|外国|[ァ-ヴー]{2,}国籍|会社員|無職|自称|アルバイト|職業不詳|解体工|工員|大学生|専門学校生))/g, ' ')
    .replace(/(?:北海道|東京都|京都府|大阪府|[一-龥]{2,3}県)(?:、|\s)*(?:の|在住の|住所不定)?\s*(?=(?:中国|韓国|台湾|ベトナム|フィリピン|ブラジル|タイ|インドネシア|ネパール|スリランカ|パキスタン|トルコ|ペルー|ミャンマー|カンボジア|米国|アメリカ|外国|[ァ-ヴー]{2,}国籍))/g, ' ')
    .replace(/(?:国籍|外国籍|中国籍|韓国籍|台湾籍|米国籍|英国籍|人)(?:の男|の女)?(?:で|の)\s*[^。]{1,25}?(?:市|区|町|村)[^、。]{0,12}(?:の|、)/g, ' ')
    .replace(/(?:疑いで|として)[、，]\s*(?:いずれも[^、。]{1,15}[、，]\s*)?[^、。]{2,20}?(?:市|区|町|村)[^、。]{0,12}[、，]\s*(?:会社員|無職|自称|アルバイト|職業不詳|解体工|工員|技能実習生)/g, ' ');
}

/**
 * 犯罪行為の文脈（suspectSentence または直前文）と直接結びついた国内現場を特定する
 */
function resolveCrimeSceneInContext(targetSentence, dict = loadMunicipalities()) {
  const rawNorm = nfkc(targetSentence);
  const cleanSent = cleanPoliceAndResidence(targetSentence);

  // 現場表現のキーワード（単独の「宅」は誤検知を防ぐため「〇〇宅」に限定、自治体名＋助詞・商業施設・アウトレット等を含む）
  const SCENE_RE = /(?:都内|道内|府内|県内|市内|町内|村内|(?:都|道|府|県|市|区|町|村)(?:[で内]|において|から|へ)|路上|アパート|マンション|住宅|空き家|空き巣|解体工事現場|(?:[^\s、。]{1,6})宅|店舗|敷地|車内|山林|ホテル|自宅|港|空港|現場|店|駅|ヤード|倉庫|工場|ビル|施設|部屋|アウトレット|モール|商業施設|スーパー|コンビニ|駐車場|パーキング|銀行|ATM|交差点|電車内|コンテナ|市道|県道|国道)/;

  for (const [landmark, pref] of Object.entries(DOMESTIC_LANDMARKS)) {
    if (cleanSent.includes(landmark)) return { pref, evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
  }

  // 1. 空港辞書の照合
  for (const [ap, pref] of Object.entries(DOMESTIC_AIRPORTS)) {
    if (cleanSent.includes(ap)) {
      return { pref, evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
    }
  }

  // 1.5 「松戸東署は、同市内の路上で〜」のように警察署名＋「同市内/同町内/同区内/管内」で現場が示される文では、警察署の管轄県を優先特定
  if (/(?:同市|同区|同町|同村|管内)(?:内|の)?(?:で|において|の路上|の店舗|の住宅|の駐車場|にある)/.test(rawNorm)) {
    const stationTokens = rawNorm.match(/[一-龥ぁ-んァ-ヴー]{2,10}(?:警察署|署)/g) || [];
    if (stationTokens.length > 0) {
      const stationResolved = resolvePrefecture(stationTokens.join(' '));
      if (stationResolved?.pref && stationResolved.method === 'police_station') {
        return { pref: stationResolved.pref, evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
      }
    }
  }

  // 2. 都道府県名の照合（北から順ではなく、「〇〇県で」等の現場助詞・管轄警察・出現位置順を優先）
  const scenePrefRegex = new RegExp(`(${PREFECTURES.map(esc).join('|')})(?:[^、。]{0,10}?(?:市|区|町|村))?(?:内)?(?:で|において|にある|の路上|の店舗|の施設|の商業施設|の住宅|のホテル|の工場|の駐車場|運転免許)`);
  const scenePrefMatch = cleanSent.match(scenePrefRegex);
  if (scenePrefMatch) {
    return { pref: scenePrefMatch[1], evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
  }
  const orderedPrefs = PREFECTURES
    .map((p) => ({ p, idx: cleanSent.indexOf(p) }))
    .filter((x) => x.idx >= 0)
    .sort((a, b) => a.idx - b.idx);
  if (orderedPrefs.length === 1) {
    return { pref: orderedPrefs[0].p, evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
  }
  if (orderedPrefs.length > 1) {
    const policeMatched = orderedPrefs.find(({ p }) => new RegExp(`${esc(p === '北海道' ? '道' : p.slice(0, -1))}警|${esc(p)}警`).test(rawNorm));
    if (policeMatched) {
      return { pref: policeMatched.p, evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
    }
    return { pref: orderedPrefs[0].p, evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
  }
  const shortDotMatches = [...cleanSent.matchAll(SHORT_DOT_RE)].map((m) => PREF_SHORT.get(m[1])).filter(Boolean);
  if (shortDotMatches.length === 1) {
    return { pref: shortDotMatches[0], evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
  }
  const bracketPref = cleanSent.match(/[【\[（(](北海道|東京|京都|大阪|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)[】\]）)]/);
  if (bracketPref && PREF_SHORT.has(bracketPref[1])) {
    return { pref: PREF_SHORT.get(bracketPref[1]), evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
  }

  // 3. 市区町村辞書の照合（市区町村名が含まれており、SCENE_RE または 現場・犯罪文脈があること）
  if (dict && dict.keys) {
    const hasSceneOrCrime = SCENE_RE.test(cleanSent) || /(?:事件|発生|行われ|被害|犯行|疑い|容疑|逮捕|見つか|発見|押し入|侵入|密造|密輸|引き出し|盗み|盗取|殺害|殴|窃盗|詐欺|使用|所持|不法|事故)/.test(cleanSent);
    if (hasSceneOrCrime) {
      for (const key of dict.keys) {
        const keyAt = cleanSent.indexOf(key);
        if (keyAt >= 0) {
          const prevChar = keyAt > 0 ? cleanSent[keyAt - 1] : '';
          const isSubCityTown = /(?:町|村)$/.test(key) && /[市区]$/.test(prevChar);
          const isKanjiSuffix = key.length <= 2 && prevChar && /[一-龥]/.test(prevChar) && !/[都道府県郡市区]$/.test(prevChar);
          if (!isSubCityTown && !isKanjiSuffix) {
            const prefs = dict.map[key];
            if (prefs && prefs.length === 1) return { pref: prefs[0], evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
          }
        }
        const stem = key.replace(/(?:市|区|町|村)$/, '');
        const stemAt = (stem.length >= 3 && /[一-龥ァ-ヴー]/.test(stem)) ? cleanSent.indexOf(stem) : -1;
        const prevStem = stemAt > 0 ? cleanSent[stemAt - 1] : '';
        const afterStem = stemAt >= 0 ? cleanSent[stemAt + stem.length] : '';
        if (stemAt >= 0 && !(/(?:町|村)$/.test(key) && /[市区]$/.test(prevStem)) && (!afterStem || !/[一-龥]/.test(afterStem))) {
          const prefs = dict.map[key];
          if (prefs && prefs.length === 1) return { pref: prefs[0], evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
        }
      }
    }
  }

  return null;
}

/**
 * 本文（メモリ上）の3要素結合検証
 * ※見出し title は合格根拠には一切使わず、回遊リンク汚染を検出・除外するトピック照合ガードとしてのみ使用
 */
function verifyArticleContent(text, title = '') {
  const result = {
    verified: false,
    rejected: false,
    insufficientEvidence: false,
    rejectReason: null,
    pendingReason: null,
    location: null,
    audit: {
      japanCrime: { verified: false, evidence: null },
      suspectRole: { verified: false, evidence: null },
      foreignNationality: { verified: false, evidence: null }
    }
  };

  // 社説・論説・コラム・解説・オピニオン・政治批判・事後反応（要請・議会答弁・抗議集会・遺族コメント・連載企画）は、
  // 事件の説明や引用を含んでいても新規の被疑者事件報道ではないため最終ゲートで確実に止める。
  const NON_CASE_HEADLINE_RE = /(?:社説|論説|社論|オピニオン|コラム|提言|シンポジウム|有識者|エキスパートトピ|【[^】]*(?:解説|詳報|前編|後編|中編|連載|特集)[^】]*】|[一-龥ァ-ヶ]{2,8}(?:大|大学)(?:講師|教授|准教授|名誉教授)\s*$|私見|に驚き|持論|苦言|モーニングショー|羽鳥慎一|ひるおび|ミヤネ屋|ゴゴスマ|めざまし8|サン!シャイン|ワイドナショー|[一-龥ァ-ヶ]{2,10}(?:弁護士|コメンテーター|元刑事)[、:]|(?:再)?逮捕へ(?:\s|$|[・　])|(?:書類)?送検へ(?:\s|$)|起訴へ(?:\s|$)|方針を固め|メッセージの遅さ|極めて遺憾|日米と県協議|協定の改定|改定が必要|パリピ生活|水際で阻止|応えよ$|求めよ$|べきだ$|とは…|できたワケ|の正体|とは何か|^[▽▼■◆●]\s*[上中下前後0-9０-９]|連帯広げる|不安抱く社会|浮かび上がる[^。]*の「?構図」?|専門家が(?:語[るった]|み[るた])|だまされないための対策|エックス速報|合同巡回で米兵[^。]*外出禁止違反|憲兵隊が拘束|事件受けたパトロール|(?:事件|逮捕)[^。]{0,10}受け[^。]*(?:要請|抗議|答弁|集会|声明|談話|コメント|申し入れ|削除依頼|怒りの声|外出制限)|(?:首相|外務省|防衛省|政府|米軍)に[^。]*(?:要請|抗議|申し入れ)|(?:知事|市長|官房長官|大臣)[^。]*(?:再発防止|要請|抗議|注視|言及|批判|遺憾)|県議会[^。]*答弁|市民団体[^。]*(?:抗議|集会|怒りの声|要請|声明)|遺族(?:が|ら|も)[^。]*(?:コメント|談話|手記)|被害者へ中傷|中傷[^。]*削除依頼|日米共同演習|相次いで先島に飛来|FRIDAY|フライデー|逮捕直後の.*表情|初公判の傍聴券|傍聴席に.*姿|[＝=]中国ネット)/i;
  if (title && NON_CASE_HEADLINE_RE.test(nfkc(title))) {
    result.rejected = true;
    result.rejectReason = 'editorial_or_opinion';
    return result;
  }

  if (!text || typeof text !== 'string') {
    result.insufficientEvidence = true;
    result.pendingReason = 'empty_or_invalid_text';
    return result;
  }

  // 1. 文脈結合による外国籍被疑者の検証（本文 sentences のみ）
  // 記事全体に対する「日本人逮捕」判定は使わない。別件・共犯者・引用中の日本人記述で
  // 外国籍被疑者の記事全体を誤って落とし得るため、外国籍表現ごとに同一文内の役割を確認する。
  // 被疑者文には逮捕・容疑・送検・起訴・有罪などの刑事手続語・犯罪述語が同一文内に存在することを必須化
  const CRIME_PREDICATE_RE = /(?:逮捕|容疑|疑い|送検|送致|起訴|不起訴|処分|判決|求刑|初公判|公判|冒頭陳述|結審|罪状認否|摘発|指名手配|検挙|立件|有罪|被告|被疑者|現行犯|身柄|拘束|書類送検|再逮捕|罰金|勾留|実刑|懲役|逃走)/;
  // 別事件・過去事件の捜査端緒（「今年7月…カンボジア国籍の男2人=窃盗罪で起訴=を逮捕し、処分先として同社が浮上」「8月にも…事件が発生し、チリ国籍の男2人が逮捕されている」等）を今回の被疑者文として誤認しない
  const PAST_CASE_BACKGROUND_RE = /(?:＝|=|（|\()[^＝=）)]*?(?:起訴|公判中|受刑者|実刑|有罪)[^＝=）)]*?(?:＝|=|）|\))[^。]*?を逮捕し|を逮捕し、[^。]*?(?:処分先|売却先|買い取り先|関与|同社|男ら|容疑者ら)が浮上|(?:自宅|関係先|拠点)を家宅捜索した際[^。]*?(?:押収|見つか|浮上)|逮捕され、その後(?:起訴|有罪|実刑)|(?:\d+月|昨年|おととし|過去|以前)にも[^。]{0,50}?(?:被害|事件)が(?:あり|発生し|起き)[^。]{0,45}?(?:逮捕され(?:た|ている)|起訴され(?:た|ている))/;
  const headlineIsUnarrestedNonForeign = Boolean(
    title && /(?:人物|男|女|犯人)が逃走(?:か|中)?\s*$/.test(nfkc(title))
    && !NAT_RE.test(nfkc(title))
    && !/(?:逮捕|送検|起訴|不起訴|公判|判決|摘発|検挙)/.test(nfkc(title))
  );
  const sentences = text.split(/(?<=[。！？\n])/).map((s) => s.trim()).filter(Boolean);
  let suspectIndex = -1;
  let matchedOcc = null;

  for (let i = 0; i < sentences.length; i++) {
    if (PAST_CASE_BACKGROUND_RE.test(sentences[i])) continue;
    // 見出しが外国人表記のない未逮捕逃走事件（「客を装った人物が逃走か」等）のとき、本文中の過去事件の「逮捕・起訴」文を誤採用しない（今回の逃走犯が外国人とみられる場合は通過させる）
    if (headlineIsUnarrestedNonForeign && /(?:逮捕|起訴|判決)/.test(sentences[i]) && !/逃走|行方/.test(sentences[i])) continue;
    const occs = natOccurrences(sentences[i]);
    const suspectOcc = occs.find((o) => {
      if (!o.suspect || o.victim || o.nonSuspect) return false;
      // カタカナ氏名単体や在留・不法就労語単体（「風俗店を不法就労で摘発」等で被疑者の外国人表記がない記事）では採用せず、
      // 明示的な国籍・外国籍・外国人・外国人とみられる・米軍表記の確認を必須とする
      const IMPLICIT_ONLY_NAT_RE = /^(?:[ァ-ヴー]+(?:・[ァ-ヴー]+)+|不法(?:滞在|残留|入国|就労)|オーバーステイ|仮放免|(?:元)?技能実習生|特定技能(?:実習生)?|(?:元)?留学生)$/;
      if (IMPLICIT_ONLY_NAT_RE.test(o.text)) {
        const hasExplicitNat = occs.some((other) => other !== o && other.suspect && !IMPLICIT_ONLY_NAT_RE.test(other.text));
        if (!hasExplicitNat) return false;
      }
      return nationalityLinkedToSuspect(sentences[i], o);
    });
    if (suspectOcc && CRIME_PREDICATE_RE.test(sentences[i])) {
      suspectIndex = i;
      matchedOcc = suspectOcc;
      break;
    }
  }

  if (suspectIndex === -1) {
    // 外国当局・海外発生が本文に明記され、国内の外国籍被疑者文が確認できない場合は除外確定。
    // 被疑者文が見つかった場合は、下段でその文脈だけを使って海外事件か判定する。
    if (isOverseas(text)) {
      result.rejected = true;
      result.rejectReason = 'crime_outside_japan';
      return result;
    }
    result.insufficientEvidence = true;

    // 被疑者文（容疑者・逮捕等の記述）が存在するか文脈を精査
    const SUSPECT_ACT_RE = /(?:男|女|男性|女性|少年|少女|容疑者|被告|工員|会社員|無職|自称|職業不詳|作業員|\d+歳|ら|[0-9０-９]+人組)[^、。]{0,25}?(?:が|を)[^、。]{0,35}?(?:逮捕|緊急逮捕|現行犯逮捕|送検|送致|書類送検|再逮捕|初公判|公判|求刑|判決|有罪)/;
    const CRIME_NOUN_RE = /(?:窃盗|強盗|詐欺|暴行|傷害|殺人|覚醒剤|麻薬|密輸|不法残留|不法就労|盗撮|わいせつ|飲酒運転|ひき逃げ|横領|放火|侵入|賭博|売春|風営法|入管法)/;

    const suspectSentence = sentences.find((s) => {
      if (VICTIM_PASSIVE_RE.test(s) && !AGENT_PASSIVE_RE.test(s)) return false;
      return SUSPECT_ACT_RE.test(s) && (CRIME_NOUN_RE.test(s) || (title && CRIME_NOUN_RE.test(title)));
    });

    // 日本人判定は、該当する被疑者文 (suspectSentence) のみにスコープを絞る
    const isJpSuspectInContext = suspectSentence ? JP_ARRESTEE_RE.test(suspectSentence) : false;

    if (suspectSentence && isJpSuspectInContext) {
      result.rejected = true;
      result.rejectReason = 'suspect_is_japanese';
    } else if (suspectSentence) {
      result.pendingReason = 'suspect_identified_nationality_missing';
    } else {
      result.pendingReason = 'suspect_role_unclear_in_body';
    }
    return result;
  }

  const suspectSentence = sentences[suspectIndex];

  // 見出しの被疑者性別（「逃走の男 ひき逃げの罪で起訴」等）と、抽出された外国籍人物の性別（「外国人女性」等）が食い違う場合を全インデックスで遮断
  if (title) {
    const titleNorm = nfkc(title);
    const titleSuspectGenders = new Set(
      [...titleNorm.matchAll(/(?:逃走|逮捕|起訴|送検|公判|判決|容疑|放火|ひき逃げ)の?(男|女)(?!性|児)|(男|女)(?:を|が)(?:[^。]{0,12}?)(?:逮捕|再逮捕|送検|起訴|判決)|(?:\d+歳|代)の?(男|女)(?!性|児)/g)]
        .map((m) => m[1] || m[2] || m[3])
        .filter(Boolean)
    );
    const sentNormForTitle = nfkc(suspectSentence);
    const occTail = sentNormForTitle.slice(Math.max(0, matchedOcc.index), matchedOcc.index + matchedOcc.text.length + 20);
    const foreignGenderMatch = occTail.match(/(男|女)(?:性|児)?/);
    const isCoopTitle = /共謀|共犯|夫婦|男女|[2-9]人/.test(`${titleNorm} ${sentNormForTitle}`);
    if (!isCoopTitle && titleSuspectGenders.size === 1 && foreignGenderMatch) {
      const titleGender = [...titleSuspectGenders][0];
      const foreignGender = foreignGenderMatch[1];
      if (titleGender !== foreignGender) {
        result.rejected = true;
        result.rejectReason = 'victim_is_foreigner_suspect_is_japanese';
        return result;
      }
    }
  }

  // 主事件のリード文・見出しとの性別・県名矛盾チェック（日本人主犯記事で偽造依頼先・捜査端緒の別事件外国人に誤爆するケースを遮断）
  if (suspectIndex > 0) {
    const leadContext = nfkc(`${title || ''} ${sentences[0] || ''}`);
    const leadHasForeign = NAT_RE.test(leadContext);
    if (!leadHasForeign && /(?:逮捕|再逮捕|送検|起訴|判決)/.test(leadContext)) {
      const leadGenders = new Set([...leadContext.matchAll(/(?:\d+歳|代|市|区|町|村|容疑者)の?(男|女)(?!性|児)|(男|女)[（(]\d{2}[）)]|(男|女)が逮捕|(男|女)を逮捕/g)].map((m) => m[1] || m[2] || m[3] || m[4]).filter(Boolean));
      const sentNorm = nfkc(suspectSentence);
      const sentGenders = new Set([...sentNorm.matchAll(/(?:国籍|籍|人|\d+歳|代)の?(男|女)(?!性|児)|(男|女)[（(]\d{2}[）)]/g)].map((m) => m[1] || m[2]).filter(Boolean));
      const isCoop = /共謀|共犯|夫婦|男女|[2-9]人/.test(`${leadContext} ${sentNorm}`);
      if (!isCoop && leadGenders.size === 1 && sentGenders.size === 1 && ![...leadGenders].some((g) => sentGenders.has(g))) {
        result.rejected = true;
        result.rejectReason = 'suspect_is_japanese_or_background_foreigner';
        return result;
      }
      const leadScene = resolvePrefecture(leadContext);
      const sentScene = resolvePrefecture(sentNorm);
      if (!isCoop && leadScene?.pref && sentScene?.pref && leadScene.pref !== sentScene.pref
        && /(?:偽造依頼|依頼|家宅捜索|押収|端緒|浮上|別事件)/.test(`${leadContext} ${sentNorm}`)) {
        result.rejected = true;
        result.rejectReason = 'suspect_is_japanese_or_background_foreigner';
        return result;
      }
    }
  }

  // 海外事件の検出も本文全体ではなく、被疑者文と直前の事件文脈に限定する。
  // 記事ページの別記事・過去事件への言及に海外地名があっても対象事件を誤除外しない。
  const previousSentence = suspectIndex > 0 ? sentences[suspectIndex - 1] : '';
  const hasEventContext = /(?:事件|発生|行われ|被害|犯行|疑い|容疑|逮捕|見つか|発見|押し入|侵入|窃盗|強盗|詐欺|暴行|傷害|密輸|所持|販売|製造)/.test(previousSentence);
  const overseasContext = `${hasEventContext ? previousSentence : ''} ${suspectSentence}`;
  if (isOverseas(overseasContext)) {
    result.rejected = true;
    result.rejectReason = 'crime_outside_japan';
    return result;
  }

  // 【トピック整合性ガード】見出しの事件話題と本文被疑者文が完全に乖離している場合は回遊リンク汚染と判定
  // ※見出しは合格根拠には一切使わず、別事件の混入を検出・拒否するネガティブガードとしてのみ使用
  if (title) {
    const CRIME_TOPIC_WORDS = [
      '詐欺', '詐取', '偽造', '強盗', '窃盗', '盗み', '密輸', '密入国', '覚醒剤', '麻薬', 'コカイン',
      '大麻', '殺人', '暴行', '傷害', '客引き', '白タク', '不法滞在', '不法就労',
      '横領', '密猟', '侵入', '車庫', '空き家', 'タイヤ', 'オカヤドカリ', '商標法', '偽サプリ', 'すり',
      '業務妨害', '盗撮', '電波法', '偽基地局', 'ヤミ金', '風営法', '薬機法'
    ];
    const titleTopics = CRIME_TOPIC_WORDS.filter((w) => title.includes(w));
    if (titleTopics.length > 0) {
      // 照合対象は被疑者文および直前文（直結する犯行文脈）のみに限定し、本文先頭の一致によるすり抜けを完全排除
      const prevSentence = suspectIndex > 0 ? sentences[suspectIndex - 1] : '';
      const suspectContext = `${prevSentence} ${suspectSentence}`;
      const TOPIC_EQUIVALENTS = {
        '窃盗': /窃盗|盗み|盗ん/,
        'すり': /すり|盗み|盗ん/,
        '詐取': /詐取|詐欺|だまし取/,
        '偽造': /偽造|偽の/,
        '空き巣': /空き巣|住居侵入|侵入|窃盗|盗み|盗ん/,
        '偽サプリ': /商標|偽物|偽.{0,3}サプリ|健康サプリ/,
        '商標法': /商標|偽物|偽サプリ|健康サプリ/,
      };
      const hasMatchingTopic = titleTopics.some((w) => (TOPIC_EQUIVALENTS[w] || new RegExp(w)).test(suspectContext));
      if (!hasMatchingTopic) {
        result.insufficientEvidence = true;
        result.pendingReason = 'topic_mismatch_contamination';
        return result;
      }
    }
  }

  result.audit.foreignNationality = { verified: true, evidence: `本文抜粋: ${matchedOcc.text}` };
  result.audit.suspectRole = { verified: true, evidence: `本文抜粋: ${suspectSentence.slice(0, 80)}` };

  // 4. 犯罪行為と同一文脈での国内現場検証
  const dict = loadMunicipalities();
  let scene = resolveCrimeSceneInContext(suspectSentence, dict);

  if (!scene && suspectIndex > 0) {
    const prevSentence = sentences[suspectIndex - 1];
    const OCCURRENCE_RE = /(?:事件|発生|行われ|被害|犯行|疑い|容疑|逮捕|見つか|発見|押し入|侵入|トラブル)/;
    if (OCCURRENCE_RE.test(prevSentence)) {
      scene = resolveCrimeSceneInContext(prevSentence, dict);
    }
  }

  if (!scene) {
    // 被疑者の住所と「男は自宅付近の市道で…」が隣接する続き文に明示された場合だけ、
    // 住所を犯行現場そのものとは扱わず、「自宅付近」の本文根拠と結合して場所を確定する。
    const nearbySubjectContext = sentences.slice(suspectIndex, Math.min(sentences.length, suspectIndex + 3)).join(' ');
    if (/(?:男|女|容疑者)は[^。]{0,80}自宅(?:付近|近く)/.test(nearbySubjectContext) && /(?:市道|県道|国道|路上|走行中)/.test(nearbySubjectContext)) {
      scene = resolveCrimeSceneInContext(nearbySubjectContext, dict);
      if (scene) {
        const sceneAt = nearbySubjectContext.search(/自宅(?:付近|近く)/);
        const excerptStart = Math.max(0, sceneAt - 90);
        scene.evidence = `本文抜粋: ${nearbySubjectContext.slice(excerptStart, excerptStart + 150)}`;
      }
    }
  }

  // 直後文や記事冒頭からの現場探索（手前の精密探索で見つからなかった場合のフォールバック）
  if (!scene) {
    const candidateIndices = [];
    if (suspectIndex + 1 < sentences.length) candidateIndices.push(suspectIndex + 1);
    if (suspectIndex + 2 < sentences.length) candidateIndices.push(suspectIndex + 2);
    if (suspectIndex > 1) candidateIndices.push(0);

    const OCCURRENCE_RE = /(?:事件|発生|行われ|被害|犯行|疑い|容疑|逮捕|見つか|発見|押し入|侵入|密造|密輸|引き出し|盗み|盗取|殺害|殴|窃盗|詐欺|使用|所持|不法|事故|トラブル)/;
    for (const idx of candidateIndices) {
      const sent = sentences[idx];
      if (OCCURRENCE_RE.test(sent)) {
        scene = resolveCrimeSceneInContext(sent, dict);
        if (scene) break;
      }
    }
  }

  if (!scene) {
    // 第2優先: 見出しに明示された現場地名（例: 「大阪・ミナミ」「【愛媛】」など）
    if (title) {
      const titleScene = resolveCrimeSceneInContext(title, dict);
      if (titleScene && titleScene.pref !== '全国') {
        scene = { pref: titleScene.pref, evidence: `見出し・本文統合根拠: ${title.slice(0, 80)}` };
      }
    }
  }

  if (!scene) {
    // 第3優先: 特殊詐欺や入管法違反等で具体的な建物現場の記載がない場合、被疑者文・見出しの国内警察署・県警・地裁の管轄都道府県を採用
    const authTargets = [suspectSentence, suspectIndex > 0 ? sentences[suspectIndex - 1] : '', title || ''].filter(Boolean);
    for (const tgt of authTargets) {
      if (JP_AUTH_RE.test(tgt)) {
        const authResolved = resolvePrefecture(tgt);
        if (authResolved && authResolved.pref && authResolved.pref !== '全国') {
          scene = { pref: authResolved.pref, evidence: `国内捜査・司法機関管轄根拠: ${tgt.slice(0, 80)}` };
          break;
        }
      }
    }
  }

  if (!scene) {
    // 国内現場も国内捜査機関管轄も特定できなければ保留。
    result.insufficientEvidence = true;
    result.pendingReason = 'crime_location_unclear_in_context';
    return result;
  }

  result.audit.japanCrime = { verified: true, evidence: scene.evidence };
  if (scene.pref === '全国') {
    result.insufficientEvidence = true;
    result.pendingReason = 'crime_location_unclear_in_context';
    return result;
  }
  result.location = scene.pref;

  // 3要素すべてが本文の同一犯行文脈で客観的に確認できた場合のみ合格候補
  result.verified = true;
  return result;
}

/**
 * 本文が未取得/短文で、見出しだけから全条件を明示的に確定できる場合の限定フォールバック。
 * 本文判定が「不採用」を返した記事には使わない。見出し中の明示語だけを根拠として記録する。
 */
function verifyHeadlineOnly(title) {
  const headline = nfkc(title).trim();
  const out = {
    verified: false, rejected: false, insufficientEvidence: true,
    rejectReason: null, pendingReason: 'headline_evidence_incomplete', location: null,
    verificationMode: 'headline_only',
    audit: {
      japanCrime: { verified: false, evidence: null },
      suspectRole: { verified: false, evidence: null },
      foreignNationality: { verified: false, evidence: null },
    },
  };
  if (!headline || isOverseas(headline) || /海外|現地(?:警察|当局|で)|国外/.test(headline)) {
    out.pendingReason = 'headline_overseas_or_missing';
    return out;
  }
  const occurrences = natOccurrences(headline);
  const suspectOccurrence = occurrences.find((occurrence) => occurrence.suspect
    && !occurrence.victim && !occurrence.nonSuspect
    && nationalityLinkedToSuspect(headline, occurrence));
  const explicitForeignStatus = suspectOccurrence && new RegExp(
    `^(?:(?:${COUNTRY_ALT})(?:国籍|籍|人|出身|系)|外国人とみられる|外国籍とみられる|外国籍|外国人|外国出身|米兵|米軍|在日米軍|(?:米|アメリカ)(?:海兵隊|海軍|陸軍|空軍))$`
  ).test(suspectOccurrence.text);
  if (!suspectOccurrence || !explicitForeignStatus) {
    out.pendingReason = 'headline_suspect_nationality_unclear';
    return out;
  }
  const criminalProcedure = /逮捕|再逮捕|現行犯|送検|送致|起訴|不起訴|追起訴|摘発|検挙|書類送検|容疑|疑い|初公判|公判|求刑|判決|有罪|逃走/;
  const crimeTopic = /窃盗|盗み|盗ん|強盗|詐欺|暴行|傷害|切り付け|切りつけ|殺人|殺害|覚醒剤|覚せい剤|麻薬|大麻|コカイン|密輸|侵入|盗撮|わいせつ|不法(?:入国|残留|滞在|就労)|入管法|商標法|偽造|横領|放火|賭博|売春|ひき逃げ|無免許|酒気帯び|酒酔い/;
  if (!criminalProcedure.test(headline) || !crimeTopic.test(headline)
    || VICTIM_PASSIVE_RE.test(headline) || VICTIM_OBJECT_RE.test(headline)) {
    out.pendingReason = 'headline_crime_or_suspect_role_unclear';
    return out;
  }
  let place = resolveCrimeSceneInContext(headline, loadMunicipalities());
  if ((!place || place.pref === '全国') && JP_AUTH_RE.test(headline)) {
    const authPlace = resolvePrefecture(headline);
    if (authPlace && authPlace.pref && authPlace.pref !== '全国') {
      place = { pref: authPlace.pref, evidence: `見出し根拠: 国内捜査・司法機関管轄 (${headline.slice(0, 80)})` };
    }
  }
  if (!place || place.pref === '全国') {
    out.pendingReason = 'headline_domestic_location_unclear';
    return out;
  }
  const location = place.pref;
  out.verified = true;
  out.insufficientEvidence = false;
  out.pendingReason = null;
  out.location = location;
  out.audit.foreignNationality = { verified: true, evidence: `見出し根拠: ${suspectOccurrence.text}` };
  out.audit.suspectRole = { verified: true, evidence: `見出し根拠: ${headline.slice(0, 120)}` };
  out.audit.japanCrime = { verified: true, evidence: place?.evidence?.replace(/^本文抜粋:/, '見出し根拠:') || `見出し根拠: 国内捜査機関の明記 (${headline.slice(0, 100)})` };
  return out;
}

/**
 * 記事の手続段階を判定する (逮捕/送検/起訴/公判/判決)
 */
function determineStage(itemOrText) {
  const text = typeof itemOrText === 'string'
    ? itemOrText
    : itemOrText?.title || '';
  const t = nfkc(text).replace(/[（(][^）)]*(?:公判中|起訴|服役|実刑|執行猶予)[^）)]*[）)]/g, ' ');
  if (/判決|実刑|禁錮刑|拘禁刑|有罪判決|無罪判決|執行猶予(?:付き)?(?:の)?判決|罰金刑/.test(t)) return '判決';
  if (/初公判|公判|求刑|結審|冒頭陳述|被告人質問|罪状認否/.test(t)) return '公判';
  if (/不起訴|処分保留/.test(t)) return '不起訴';
  if (/(?:追起訴|起訴|在宅起訴|略式起訴)(?!猶予)/.test(t)) return '起訴';
  if (/(?:書類)?送検|送致|追送検/.test(t)) return '送検';
  if (/再逮捕/.test(t)) return '再逮捕';
  if (/逮捕|現行犯|身柄確保/.test(t)) return '逮捕';
  return null;
}

module.exports = {
  run, verifyItem, rulesPass, ruleSuspect, ruleOnlyResponse, resolvePrefecture, titleFactsOk, isVictimSide, isJapaneseArrestee, isOverseas, natOccurrences,
  articleKey, ownText,
  setMunicipalities, loadMunicipalities, NAT_RE, CRIME_RE, CFG,
  DOMESTIC_AIRPORTS, DOMESTIC_LANDMARKS, cleanPoliceAndResidence, resolveCrimeSceneInContext, verifyArticleContent, verifyHeadlineOnly,
  nationalityLinkedToSuspect,
  determineStage,
};
