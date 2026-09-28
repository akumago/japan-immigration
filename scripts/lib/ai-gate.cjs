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
  maxApiCallsPerRun: 12, // 分割リトライ・モデル切替を含む上限
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
];
const COUNTRY_ALT = [...COUNTRY_NAMES].sort((a, b) => b.length - a.length).map(esc).join('|');
const NAT_SOURCE =
  `(?:${COUNTRY_ALT})(?:国籍|籍|人|出身)` +
  `|[ァ-ヴー]{2,}(?:国籍|籍の)` +
  `|外国籍|外国人|外国出身` +
  `|米兵|米軍(?:兵|属|関係者|隊員|人|所属)|米(?:海軍|空軍|陸軍|海兵隊)(?:兵|隊員|所属)` +
  `|技能実習生|元技能実習生|特定技能|留学生|元留学生` + // 「実習生」単体は教育実習生など日本人を含むので入れない
  `|不法(?:滞在|残留|入国|就労)|オーバーステイ|仮放免|偽造在留カード`;
const NAT_RE = new RegExp(NAT_SOURCE);
const NAT_RE_G = new RegExp(NAT_SOURCE, 'g'); // matchAll 用（g 必須。付け忘れると TypeError）
const CRIME_RE = /(?:逮捕|容疑|疑い|送検|送致|起訴|判決|求刑|摘発|指名手配|検挙|立件|勾留|拘禁刑|懲役|実刑|有罪|被告|家宅捜索)/;
// 被害者になった側の述語だけ（「けがをさせた」「死亡事故で逮捕」は容疑者側なので入れない）
const VICTIM_PASSIVE_RE =
  /(?:刺され|襲われ|はねられ|撥ねられ|轢かれ|殺害され|殺され|だまし取られ|盗まれ|連れ去られ|監禁され|搾取され|殴られ|蹴られ|切りつけられ|脅され|暴行を受け|被害に遭|被害を受け|重傷を負(?!わせ)|けがを負(?!わせ))/;

/** テキスト中の国籍表現がすべて「被害を受けた側」の述語に続くなら true */
function isVictimSide(text) {
  const t = nfkc(text);
  const ms = [...t.matchAll(NAT_RE_G)];
  if (ms.length === 0) return false;
  return ms.every((m) => {
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 20).split(/[、。\s]/)[0];
    return VICTIM_PASSIVE_RE.test(after);
  });
}

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
  東京湾岸: '東京都', 生田: '兵庫県', 葺合: '兵庫県', 川端: '京都府', 行徳: '千葉県', 中村: '愛知県',
};

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

/**
 * 1件の判定を検証する。戻り値: { status: 'accepted'|'rejected'|'review', code, reason, ... }
 * 採用条件: 被疑者側の国籍表現の引用が原文に実在 ＋ 刑事手続語が見出しにある ＋ 被害者側でない ＋ 場所が一意に決まる
 */
function verifyItem(item, res, opts = {}) {
  const { title, desc } = ownText(item);
  const src = `${title} ${desc}`;
  const srcSq = squash(src);
  const out = (status, code, reason, extra = {}) => ({ status, code, reason, ...extra });

  if (!res || res.isValid !== true) return out('rejected', 'ai_rejected', String((res && res.reason) || 'AI判定: 不採用'));

  const sus = nfkc(res.suspectEvidence).trim();
  const loc = nfkc(res.locationEvidence).trim();
  const ev = { suspectEvidence: sus, locationEvidence: loc };

  if (sus.length < 4) return out('rejected', 'no_suspect_evidence', '被疑者の証拠引用が無い/短い', ev);
  if (!srcSq.includes(squash(sus))) return out('rejected', 'evidence_not_in_source', '被疑者の証拠引用が原文に無い', ev);
  if (!NAT_RE.test(sus)) return out('rejected', 'no_nationality', '証拠引用に国籍表現が無い', ev);
  if (!CRIME_RE.test(title)) return out('rejected', 'no_crime_term', '見出しに刑事手続語が無い', ev);
  if (isVictimSide(sus) || isVictimSide(title)) return out('rejected', 'victim_side', '国籍表現が被害者側の述語に続く', ev);

  const locRes = loc.length >= 2 && srcSq.includes(squash(loc)) ? resolvePrefecture(loc, opts) : miss('no_location_evidence');
  const titleRes = resolvePrefecture(title, opts);
  let pref = locRes.pref || null;
  if (pref && titleRes.pref && titleRes.pref !== pref) {
    return out('review', 'location_conflict', `場所が食い違う: ${pref} / ${titleRes.pref}`, ev);
  }
  if (!pref) pref = titleRes.pref || null;
  if (!pref) {
    const amb = /^ambiguous/.test(locRes.reason || '') || /^ambiguous/.test(titleRes.reason || '');
    return out('review', amb ? 'location_ambiguous' : 'location_unresolved', `場所を一意に決められない: 「${loc}」`, ev);
  }

  const ct = String(res.cleanTitle || '').trim();
  const cleanTitleOk = ct.length > 0 && titleFactsOk(ct, src, pref, opts);
  return out('accepted', 'accepted', String(res.reason || ''), { ...ev, pref, cleanTitle: cleanTitleOk ? ct : null, cleanTitleOk });
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
  return `あなたは、日本国内で発生した「外国籍の被疑者・被告人による事件」の報道だけを収録するデータベースの校閲担当です。
下の記事（見出しと要約のみ。本文はありません）を1件ずつ判定し、記事と同じ件数のJSON配列だけを出力してください。

【採用（isValid: true）— すべて満たすこと】
1. 日本国内で起きた刑事事件（逮捕・送検・起訴・摘発・公判など）の報道である
2. 被疑者・被告人（加害側）が外国籍・外国人であることが、見出しか要約に明記されている
3. 事件の場所（市区町村・都道府県・警察署名のいずれか）が、見出しか要約に明記されている

【不採用（isValid: false）】
- 海外で起きた事件、海外の司法手続き
- 外国人が被害者の事件（被疑者が日本人・国籍不明のものを含む）
- 被疑者の国籍が読み取れないもの（推測は禁止）
- 日本人が加害者の事件、コラム・論評・行政広報・デマ検証記事

【証拠の引用（必須）】
- suspectEvidence: 被疑者の国籍・外国人属性が書かれた箇所を、見出しか要約から一字も変えずに引用する。「ベトナム国籍の男を逮捕」のように国籍を示す語を必ず含める。
- locationEvidence: 事件の場所（自治体名・都道府県名・警察署名）が書かれた箇所を、そのまま引用する。媒体名（○○新聞など）は場所の証拠にならない。
- 不採用のときは suspectEvidence・locationEvidence・cleanTitle を空文字にする。
- cleanTitle: 採用時のみ。「状況＋容疑＋国籍・年齢＋逮捕/送検＋地域」のストレートニュース形式に整える。年齢・人数・国籍・地名は原文にあるものだけを使い、無いものを補わない。
- reason: 20字以内。

【記事】
${list}`;
}

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
    },
    required: ['index', 'isValid', 'reason', 'cleanTitle', 'suspectEvidence', 'locationEvidence'],
  },
};

async function requestOnce(model, prompt, ctx) {
  let resp;
  try {
    resp = await ctx.fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ctx.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0, maxOutputTokens: 8192 },
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

async function callGemini(items, ctx) {
  const prompt = buildPrompt(items);
  let lastErr = null;
  for (const model of MODELS) {
    if (ctx.deadModels.has(model)) continue;
    if (ctx.calls >= CFG.maxApiCallsPerRun) throw kindErr('budget', `API呼び出し上限(${CFG.maxApiCallsPerRun})に到達`);
    await throttle(ctx);
    ctx.calls++;
    try {
      const arr = await requestOnce(model, prompt, ctx);
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
async function inspectChunk(items, ctx) {
  if (ctx.abort) return items.map(() => undefined);
  try {
    const arr = await callGemini(items, ctx);
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
    const left = await inspectChunk(items.slice(0, mid), ctx);
    const right = await inspectChunk(items.slice(mid), ctx);
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
  const summary = { evaluated: 0, accepted: 0, rejected: 0, review: 0, pending: 0, skipped: 0, deferred: 0, aborted: null, codes: {} };
  const accepted = [];
  const records = [];
  const unresolved = [];
  const legacyKeys = legacyAccepted ? new Set(legacyAccepted.map(articleKey)) : null;

  const todo = [];
  for (const item of candidates) {
    const key = articleKey(item);
    const d = state.decisions[key];
    if (d && ['accepted', 'rejected', 'review'].includes(d.status)) { summary.skipped++; continue; }
    todo.push({ item, key });
  }
  if (todo.length === 0) return { accepted, summary };

  if (!apiKey) {
    summary.aborted = { kind: 'no_api_key', message: 'GEMINI_API_KEY 未設定。新着は審査されず、公開もされません（fail-closed）' };
    log.warn(`::warning title=AI gate::${summary.aborted.message}`);
    writeStepSummary(`### AIゲート\n⚠️ ${summary.aborted.message}`);
    return { accepted, summary };
  }

  const work = todo.slice(0, CFG.chunkSize * CFG.maxChunksPerRun);
  summary.deferred = todo.length - work.length;
  const ctx = {
    apiKey, log, fetchImpl: p.fetchImpl || fetch, minIntervalMs: p.minIntervalMs != null ? p.minIntervalMs : CFG.minIntervalMs,
    lastCallAt: 0, calls: 0, deadModels: new Set(), abort: null, model: null,
  };

  for (let i = 0; i < work.length && !ctx.abort; i += CFG.chunkSize) {
    const chunk = work.slice(i, i + CFG.chunkSize);
    log.log(`   📦 審査 ${i + 1}〜${i + chunk.length} / ${work.length} 件`);
    const outcomes = await inspectChunk(chunk.map((w) => w.item), ctx);
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
      const v = verifyItem(item, o.res, { primaryLocationSigns });
      const rec = { status: v.status, code: v.code, reason: v.reason, title: item.title, suspectEvidence: v.suspectEvidence, locationEvidence: v.locationEvidence, model: ctx.model, ts };
      if (v.status === 'accepted') {
        rec.location = v.pref;
        rec.cleanTitle = v.cleanTitle;
        const adopted = { ...item };
        if (v.cleanTitleOk) adopted.title = v.cleanTitle;
        adopted.location = v.pref;
        adopted.summary = `${v.pref}で発生した外国人関与の事件・容疑に関する報道速報です。`;
        accepted.push(adopted);
        summary.accepted++;
      } else {
        summary[v.status]++;
        bump(summary.codes, v.code);
        if (v.status === 'review') unresolved.push({ title: item.title, loc: v.locationEvidence, code: v.code });
      }
      state.decisions[key] = rec;
      summary.evaluated++;
      if (shadow) {
        const legacy = legacyKeys ? (legacyKeys.has(key) ? 'accepted' : 'rejected') : 'unknown';
        records.push({
          ts, key, title: item.title, url: item.url || '', legacy, gate: v.status, code: v.code, reason: v.reason,
          pref: v.pref || null, cleanTitle: v.cleanTitle || null, suspectEvidence: v.suspectEvidence, locationEvidence: v.locationEvidence,
          agree: legacy === 'unknown' ? null : (legacy === 'accepted') === (v.status === 'accepted'),
        });
      }
    });
  }

  if (ctx.abort) {
    summary.aborted = ctx.abort;
    const level = ctx.abort.kind === 'permanent' ? 'error' : 'warning';
    log.warn(`::${level} title=AI gate::審査を中断 (${ctx.abort.kind}): ${ctx.abort.message}。未審査分は次回に持ち越します`);
  }
  saveState(statePath, state);
  setOutput('state_changed', 'true');

  if (shadow) appendShadowLog(records, shadowLogPath);
  const mism = records.filter((r) => r.agree === false);
  const md = [
    `### AIゲート（${shadow ? 'シャドー運転' : '本番'}）`,
    `評価 ${summary.evaluated} ／ 採用 ${summary.accepted} ／ 却下 ${summary.rejected} ／ 要確認 ${summary.review} ／ 保留 ${summary.pending} ／ 既決スキップ ${summary.skipped} ／ 次回持越 ${summary.deferred}`,
    summary.aborted ? `⚠️ 中断: ${summary.aborted.kind} — ${summary.aborted.message}` : '',
    Object.keys(summary.codes).length ? `理由別: ${Object.entries(summary.codes).map(([k, v]) => `${k}=${v}`).join(', ')}` : '',
    shadow && records.length ? `新旧の不一致: ${mism.length} / ${records.length} 件` : '',
    mism.length ? '\n| 旧 | 新 | 理由 | 見出し |\n|---|---|---|---|\n' + mism.slice(0, 30).map((r) => `| ${r.legacy} | ${r.gate} | ${cell(r.code)} | ${cell(r.title)} |`).join('\n') : '',
    unresolved.length ? '\n未解決の場所（辞書・署名表の追加候補）:\n' + unresolved.slice(0, 20).map((u) => `- ${cell(u.loc)} ← ${cell(u.title)}`).join('\n') : '',
  ].filter(Boolean).join('\n');
  log.log('\n' + md);
  writeStepSummary(md);

  return { accepted, summary };
}

module.exports = {
  run, verifyItem, resolvePrefecture, titleFactsOk, isVictimSide, articleKey, ownText, buildPrompt,
  setMunicipalities, loadMunicipalities, NAT_RE, CRIME_RE, CFG,
};
