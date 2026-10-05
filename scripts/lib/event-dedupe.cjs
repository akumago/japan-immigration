'use strict';
/**
 * 同一事件の判定（媒体違い・見出し違いの重複を統合する）
 * 罪種辞書に依存せず、国籍・年齢・市区町村/路線・罪種・見出しの類似度を組み合わせて判定する。
 * 誤統合（別事件をまとめてしまう）を避けるため、国籍の一致を必須にし、
 * さらに「年齢」「場所」「罪種」「見出し類似」のうち複数の一致を要求する。
 */
const NAT_LIST = ['中国', '韓国', '朝鮮', '台湾', '香港', 'ベトナム', 'フィリピン', 'タイ', 'インドネシア', 'マレーシア', 'ミャンマー', 'カンボジア', 'ラオス', 'ネパール', 'インド', 'スリランカ', 'バングラデシュ', 'パキスタン', 'アフガニスタン', 'イラン', 'イラク', 'トルコ', 'クルド', 'シリア', 'ウズベキスタン', 'カザフスタン', 'キルギス', 'モンゴル', 'ロシア', 'ウクライナ', 'ブラジル', 'ペルー', 'ボリビア', 'コロンビア', 'メキシコ', 'アルゼンチン', 'チリ', 'アメリカ', '米国', 'カナダ', 'イギリス', '英国', 'フランス', 'ドイツ', 'イタリア', 'スペイン', 'ルーマニア', 'ナイジェリア', 'ガーナ', 'カメルーン', 'ウガンダ', 'エジプト', 'オーストラリア', 'ニュージーランド'];
const NAT_ALIAS = { 米国: 'アメリカ', 英国: 'イギリス' };
const NAT_RE = new RegExp(`(${NAT_LIST.join('|')})(?:国籍|籍|人|出身|系|海兵隊|兵|陸軍|海軍|空軍|軍)`, 'g');
// This expression is used with .test(); a global flag would make lastIndex
// stateful and cause nationality extraction to alternate across calls.
const US_MILITARY_RE = /米(?:兵|軍|海兵隊|海軍|空軍|陸軍|軍属)|アメリカ(?:海兵隊|陸軍|海軍|空軍|軍)/;

const CRIME_GROUPS = [
  ['盗品保管', /盗品等?保管|盗難.{0,10}高級車.{0,8}保管|高級車.{0,8}保管/],
  ['薬物', /覚醒剤|覚せい剤|麻薬|大麻|コカイン|MDMA|薬物/],
  ['詐欺', /詐欺|だまし取|特殊詐欺|受け子|出し子|架け子/],
  ['強盗', /強盗|強殺/],
  ['窃盗', /窃盗|盗ん|盗み|万引|スリ|空き巣|侵入盗/],
  ['殺人', /殺人|殺害|強殺/],
  ['暴行傷害', /暴行|傷害|切り付け|殴|刺し/],
  ['性犯罪', /不同意性交|不同意わいせつ|強制性交|強制わいせつ|性的姿態|盗撮|痴漢/],
  ['交通', /道交法|道路交通法|信号無視|赤信号|ひき逃げ|酒気帯び|酒酔い|無免許|危険運転|過失運転|逃走.{0,10}(?:車|パトカー)|パトカー.{0,10}逃走/],
  ['入管', /入管|難民法|不法(?:に)?(?:上陸|入国|滞在|在留|残留|就労)|オーバーステイ|偽造在留カード/],
  ['盗品保管', /盗品等保管|盗品保管|盗難車保管|盗品と知りながら.{0,24}保管/],
  ['商標', /商標法|偽(?:ブランド|物|ユニホ|ユニフォ|サプリ)|模倣品/],
  ['野生動物', /種の保存法|絶滅危惧/],
  ['風営', /風営法|売春/],
];

const nfkc = (s) => String(s || '').normalize('NFKC');

// 地域は文字列一致ではなく階層として比較する。含有関係・不明は矛盾にしない。
function locationHierarchy(item = {}) {
  const evidence = [item.location, item.title, item.audit?.japanCrime?.evidence,
    item.audit?.suspectRole?.evidence].filter(Boolean).join(' ').replace(/本文抜粋:\s*/g, '').normalize('NFKC');
  const prefMatch = evidence.match(/北海道|東京都|京都府|大阪府|(?:青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)県/);
  const shortPref = evidence.match(/(?:^|[・\s　])(?:北海道|東京|京都|大阪|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)(?=[・\s　])/);
  const pref = prefMatch?.[0] || (shortPref ? `${shortPref[0].trim()}${['東京'].includes(shortPref[0].trim()) ? '都' : ['京都','大阪'].includes(shortPref[0].trim()) ? '府' : '県'}` : null);
  const localityText = evidence.replace(/北海道|東京都|京都府|大阪府|(?:青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)県/g, ' ');
  const localityMatches = [...localityText.matchAll(/([一-龥々ァ-ヶー]{1,10}市(?:[一-龥々ァ-ヶー]{1,8}区)?|[一-龥々ァ-ヶー]{1,8}区|[一-龥々ァ-ヶー]{1,8}[町村])/g)];
  const locality = localityMatches.map((m) => m[1]).find((x) => !/(警察署|入管|地裁|地検|区検|市役所)$/.test(x)) || null;
  return { pref, locality };
}

function compareLocations(a, b) {
  const x = locationHierarchy(typeof a === 'string' ? { location: a } : a);
  const y = locationHierarchy(typeof b === 'string' ? { location: b } : b);
  if (x.pref && y.pref && x.pref !== y.pref) return 'conflict';
  if (x.locality && y.locality) {
    if (x.locality === y.locality || x.locality.startsWith(y.locality) || y.locality.startsWith(x.locality)) return 'compatible';
    return 'conflict';
  }
  if (x.pref && y.pref && x.pref === y.pref) return 'compatible';
  if (x.pref && y.locality && y.locality.startsWith(x.pref.replace(/[都道府県]$/, ''))) return 'compatible';
  if (y.pref && x.locality && x.locality.startsWith(y.pref.replace(/[都道府県]$/, ''))) return 'compatible';
  return 'unknown';
}

function moreSpecificLocation(a, b) {
  const x = locationHierarchy(typeof a === 'string' ? { location: a } : a);
  const y = locationHierarchy(typeof b === 'string' ? { location: b } : b);
  const score = (v) => (v.pref ? 1 : 0) + (v.locality ? 2 : 0);
  const chosen = score(y) > score(x) ? y : x;
  if (chosen.pref && chosen.locality) return `${chosen.pref}${chosen.locality}`;
  return score(y) > score(x) ? (typeof b === 'string' ? b : b.location) : (typeof a === 'string' ? a : a.location);
}

const STAGE_ORDER = {
  arrest: 1, 逮捕: 1,
  rearrest: 1.5, 再逮捕: 1.5,
  referral: 2, 送検: 2,
  indictment: 3, 起訴: 3,
  disposition: 3, 不起訴: 3,
  trial: 4, 公判: 4,
  verdict: 5, 判決: 5,
};

function procedureStage(item) {
  if (item?.stage && STAGE_ORDER[item.stage]) return item.stage;
  // 本文根拠や要約には過去経緯・関連記事が混ざることがあるため、
  // 記事自身が報じる段階はまず見出しだけから読む。
  const t = nfkc(item?.title || '');
  if (/判決|実刑|禁錮刑|拘禁刑|有罪判決|無罪判決|執行猶予(?:付き)?(?:の)?判決|罰金刑/.test(t)) return '判決';
  if (/初公判|公判|求刑|結審|冒頭陳述|被告人質問|罪状認否|懲役/.test(t)) return '公判';
  if (/不起訴|処分保留/.test(t)) return '不起訴';
  if (/(?:追起訴|起訴|在宅起訴|略式起訴)(?!猶予)/.test(t)) return '起訴';
  if (/(?:書類)?送検|送致|追送検/.test(t)) return '送検';
  if (/再逮捕/.test(t)) return '再逮捕';
  if (/逮捕|現行犯|身柄確保/.test(t)) return '逮捕';
  return null;
}

function isFollowUp(older, newer) {
  const olderStage = procedureStage(older);
  const newerStage = procedureStage(newer);
  const orderA = STAGE_ORDER[olderStage] || 0;
  const orderB = STAGE_ORDER[newerStage] || 0;
  const olderDate = Date.parse(older?.date || '');
  const newerDate = Date.parse(newer?.date || '');
  return Boolean(olderStage && newerStage && orderB > orderA
    && Number.isFinite(olderDate) && Number.isFinite(newerDate) && newerDate >= olderDate);
}

function signals(item) {
  const evidence = [
    item.audit?.suspectRole?.evidence || item.evidence?.suspect,
    item.audit?.japanCrime?.evidence || item.locationBasis,
    item.audit?.foreignNationality?.evidence || item.evidence?.nationality,
  ]
    .filter(Boolean).join(' ').replace(/本文抜粋:\s*/g, '');
  const title = nfkc(item.title).replace(/\s*\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日\s*\d{1,2}:\d{2}\s*$/, '').replace(/\s*\d+(?:分|時間)前\s*$/, '');
  const text = `${nfkc(evidence)} ${title}`;
  // 手続段階が見出しで明示されている場合は、同じ事件の続報も別記事として残す。
  // 本文中の過去経緯（「再逮捕」等）で段階を誤分類しないよう、まず見出しだけを見る。
  const stage = procedureStage(item);
  const nats = new Set([...text.matchAll(NAT_RE)].map((m) => NAT_ALIAS[m[1]] || m[1]));
  if (US_MILITARY_RE.test(text)) nats.add('アメリカ');
  const ages = new Set([...text.matchAll(/(?:[（(](\d{2})[）)]|(\d{2})歳)/g)].map((m) => m[1] || m[2]));
  const places = new Set((text.match(/[一-龥ァ-ヴー]{1,6}(?:市|区|町|村)(?![役長民議])/g) || [])
    .map((p) => p.replace(/^.*?(?:都|道|府|県)/, ''))
    .filter((p) => p.length >= 2 && !/^(?:同市|同町|同区|都市|市区|地区)$/.test(p)));
  (text.match(/(?:東急|京王|小田急|JR|東京メトロ|都営|西武|東武|京急|京成|阪急|阪神|近鉄|名鉄|西鉄|南海|相鉄)[一-龥ァ-ヴー]{0,8}線/g) || []).forEach((l) => places.add(l));
  (text.match(/[一-龥]{1,4}港/g) || []).forEach((l) => places.add(l));
  const crimes = new Set(CRIME_GROUPS.filter(([, re]) => re.test(text)).map(([k]) => k));
  // 強い事件固有アンカー。同日・同地域・同国籍・同罪種・同手続段階も揃う場合だけ、
  // 見出し表現の違う同一事件（ヤードの高級車保管、那覇の米兵強盗殺人など）を束ねる。
  const incidentAnchors = new Set();
  if (/(?:ヤード|中古車)/.test(text) && /(?:高級車|盗難車)/.test(text) && /保管/.test(text)) incidentAnchors.add('yard_vehicle_storage');
  if (/高級車/.test(text) && /保管/.test(text)) incidentAnchors.add('high_end_car_storage');
  if (/(?:米兵|米海兵隊|海兵隊)/.test(text) && /(?:沖縄|那覇)/.test(text) && /(?:強盗殺人|殺人)/.test(text)) incidentAnchors.add('okinawa_us_military_homicide');
  // 被疑者の性別（「国籍の男」「28歳女」「男（44）」）。被害者の「女性に」は拾わない
  const genders = new Set([...text.matchAll(/(?:国籍|籍|人|歳|代)の?(男|女)(?!性|児)|(男|女)[（(]\d{2}[）)]/g)].map((m) => m[1] || m[2]));
  const t = title.replace(/[\s「」『』【】（）()・、。！？!?：:…“”"'\-‐|｜]/g, '').replace(/\d+/g, '#');
  const grams = new Set();
  for (let i = 0; i < t.length - 1; i++) grams.add(t.slice(i, i + 2));
  // 一般語（逮捕・疑い・国籍名など）を除いた「事件固有の語」だけの2文字組
  const c = t.replace(NAT_RE, '').replace(new RegExp(NAT_LIST.join('|'), 'g'), '')
    .replace(/再逮捕|逮捕|送検|起訴|容疑|疑い|の男|の女|男性|女性|男ら|女ら|自称|無職|会社員|会社役員|現行犯|警察|警視庁|県警|府警|道警|署|事件|だまし取った|だまし取|取った|盗んだ|現金|した|された|して|か$|など|ニュース|NEWS|掲載|日掲載|月|年|#/g, '');
  const content = new Set();
  for (let i = 0; i < c.length - 1; i++) content.add(c.slice(i, i + 2));
  return { nats, ages, genders, places, crimes, grams, content, incidentAnchors, suspectNames: suspectNames(item), location: item.location || '', procedureStage: stage };
}

const intersects = (a, b) => [...a].some((x) => b.has(x));
function dice(a, b) {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const g of a) if (b.has(g)) n++;
  return (2 * n) / (a.size + b.size);
}
function daysApart(a, b) {
  const ta = Date.parse(a || ''); const tb = Date.parse(b || '');
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return Infinity;
  return Math.abs(ta - tb) / 86400000;
}

function suspectNames(item) {
  const text = String(item.audit?.suspectRole?.evidence || item.evidence?.suspect || '')
    .replace(/本文抜粋:\s*/g, '')
    .normalize('NFKC');
  const nationalityEvidence = String(item.audit?.foreignNationality?.evidence || item.evidence?.nationality || '')
    .replace(/本文抜粋:\s*/g, '')
    .normalize('NFKC');
  const names = new Set();
  // Extract a name immediately before the legal-role suffix. Do not include
  // preceding military ranks/affiliations (e.g. "海兵隊上等兵") in the name.
  const addName = (raw) => {
    const parts = raw.split(/[・･ー\s　]+/).map((part) => part.trim()).filter(Boolean);
    const normalized = raw.replace(/[・･ー\s　]/g, '');
    if (normalized.length >= 3) names.add(`full:${normalized}`);
    // Some outlets omit a middle name. Matching the same first and last
    // katakana components is sufficient when the rest of the event evidence
    // (age, crime, date and prefecture) also agrees.
    const katakanaParts = parts.filter((part) => /^[ァ-ヶー]{2,}$/.test(part));
    if (katakanaParts.length >= 2) {
      names.add(`katakana-ends:${katakanaParts[0]}|${katakanaParts[katakanaParts.length - 1]}`);
    }
  };
  // Katakana names (often preceded by a kanji military rank) and Japanese
  // kanji names are handled separately to avoid swallowing role text.
  for (const match of text.matchAll(/([ァ-ヿ]{2,}(?:[・･ー][ァ-ヿ]{2,}){0,3})(?:容疑者|被疑者|被告)/g)) {
    addName(match[1]);
  }
  for (const match of text.matchAll(/([一-龥々]{2,8})(?:容疑者|被疑者|被告)/g)) {
    addName(match[1]);
  }
  // A suspect-role excerpt can end mid-name. The separately verified
  // nationality evidence may preserve the complete katakana name; use it to
  // match outlet-specific short/long name forms without weakening other
  // event signals (age, crime, date, and location still have to agree).
  for (const match of nationalityEvidence.matchAll(/([ァ-ヶー]{2,}(?:[・･ー][ァ-ヶー]{2,}){1,3})/g)) {
    addName(match[1]);
  }
  return names;
}

/** 同一事件なら判定理由（文字列）、別事件なら null */
function sameEventReason(a, b, { maxDays = 5 } = {}) {
  if (daysApart(a.date, b.date) > maxDays) return null;
  const sa = a._sig || signals(a); const sb = b._sig || signals(b);
  // A similar headline alone is not an event identity: repeated crime types
  // often use nearly identical headlines. Require the suspect nationality to
  // agree and reject explicit age, gender, municipality, or prefecture conflicts
  // before considering headline similarity.
  if (!sa.nats.size || !sb.nats.size || !intersects(sa.nats, sb.nats)) return null;
  if (sa.suspectNames?.size && sb.suspectNames?.size && !intersects(sa.suspectNames, sb.suspectNames)) return null;
  const sameAge = intersects(sa.ages, sb.ages);
  const samePlace = intersects(sa.places, sb.places);
  const sameCrime = intersects(sa.crimes, sb.crimes);
  const locationRelation = compareLocations(a, b);
  const sameStoredRegion = Boolean(a.location && b.location && a.location === b.location);
  // Evidence snippets may capture a victim's age in one outlet and the
  // suspect's age in another. A verified matching suspect name can override
  // that age mismatch only when date, crime, and compatible location agree.
  const sameNamedSuspect = intersects(sa.suspectNames || new Set(), sb.suspectNames || new Set())
    && sameCrime
    && a.date === b.date
    // Some excerpts mention the suspect's base/police jurisdiction first,
    // while another outlet names the crime scene. Matching verified full
    // suspect identity plus same crime/date/prefecture is stronger than that
    // incidental locality conflict.
    && (locationRelation === 'compatible' || sameStoredRegion);
  if (locationRelation === 'conflict' && !sameNamedSuspect) return null;
  const agesConflict = sa.ages.size && sb.ages.size && !sameAge && !sameNamedSuspect;
  const placesConflict = locationRelation === 'conflict'
    || (locationRelation === 'unknown' && sa.places.size && sb.places.size && !samePlace);
  if (agesConflict || (placesConflict && !sameNamedSuspect)) return null;
  if (sa.genders.size && sb.genders.size && !intersects(sa.genders, sb.genders)) return null;
  if (sameNamedSuspect) return '本文の容疑者氏名+罪種+同日+地域整合';
  const withinOneDay = daysApart(a.date, b.date) <= 1;
  const sameStage = sa.procedureStage && sa.procedureStage === sb.procedureStage;
  const sharedIncidentAnchor = intersects(sa.incidentAnchors || new Set(), sb.incidentAnchors || new Set());
  if (sharedIncidentAnchor && withinOneDay && sameStage && sameStoredRegion && sameCrime) {
    return '国籍+罪種+地域+近接日同段階+事件固有アンカー';
  }
  const sim = dice(sa.grams, sb.grams);
  if (sim >= 0.6 && sameCrime && (samePlace || sameAge)) return `国籍+罪種+場所/年齢+見出し類似${sim.toFixed(2)}`;
  const csim = dice(sa.content, sb.content);
  if (sameAge && (samePlace || sameCrime)) return '国籍+年齢+場所/罪種';
  if (samePlace && sameCrime) return '国籍+場所+罪種';
  if (sameCrime && csim >= 0.35) return `国籍+罪種+固有語類似${csim.toFixed(2)}`;
  return null;
}

/** 直近 windowDays 日分の公開データ内で同一事件を1件に統合（古い初報を残す）。統合した件数と内訳を返す */
function healRecentDuplicates(items, { auditOf = () => null, windowDays = 5, now = Date.now(), rank = () => 0 } = {}) {
  const cutoff = now - windowDays * 86400000;
  const recent = []; const removed = [];
  for (const item of items) {
    if (!(Date.parse(item.date || '') >= cutoff)) continue;
    const audit = auditOf(item);
    recent.push({ item, sig: signals(audit ? { ...item, audit } : item) });
  }
  const drop = new Set();
  // 古い順に見て、先に掲載された初報を残す
  recent.sort((x, y) => Date.parse(x.item.date) - Date.parse(y.item.date));
  for (let i = 0; i < recent.length; i++) {
    if (drop.has(recent[i].item)) continue;
    for (let j = i + 1; j < recent.length; j++) {
      if (drop.has(recent[j].item)) continue;
      const a = { ...recent[i].item, _sig: recent[i].sig }; const b = { ...recent[j].item, _sig: recent[j].sig };
      const reason = sameEventReason(a, b);
      if (!reason) continue;
      const differentProcedureStage = procedureStage(recent[i].item) !== procedureStage(recent[j].item);
      if (isFollowUp(recent[i].item, recent[j].item) || (recent[j].item.followUp && differentProcedureStage)) continue;
      // 同日なら報道元の格付けが高い方を残す
      const keepJ = recent[i].item.date === recent[j].item.date && rank(recent[j].item.url) > rank(recent[i].item.url);
      const loser = keepJ ? recent[i].item : recent[j].item;
      const winner = keepJ ? recent[j].item : recent[i].item;
      drop.add(loser);
      removed.push({ kept: winner.title, removed: loser.title, reason, keptItem: winner, removedItem: loser });
      if (keepJ) break;
    }
  }
  const kept = items.filter((x) => !drop.has(x));
  const enriched = kept.map((item) => {
    const merged = removed.find((r) => r.keptItem === item && locationHierarchy(r.removedItem).locality);
    if (!merged || locationHierarchy(item).locality) return item;
    const location = moreSpecificLocation(item, merged.removedItem);
    return location && location !== item.location ? { ...item, location } : item;
  });
  return { items: enriched, removed };
}

module.exports = { signals, procedureStage, isFollowUp, compareLocations, locationHierarchy, moreSpecificLocation, sameEventReason, healRecentDuplicates, STAGE_ORDER };
