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
const US_MILITARY_RE = /米(?:兵|軍|海兵隊|海軍|空軍|陸軍|軍属)|アメリカ(?:海兵隊|陸軍|海軍|空軍|軍)/g;

const CRIME_GROUPS = [
  ['薬物', /覚醒剤|覚せい剤|麻薬|大麻|コカイン|MDMA|薬物/],
  ['詐欺', /詐欺|だまし取|特殊詐欺|受け子|出し子|架け子/],
  ['強盗', /強盗|強殺/],
  ['窃盗', /窃盗|盗ん|盗み|万引|スリ|空き巣|侵入盗/],
  ['殺人', /殺人|殺害|強殺/],
  ['暴行傷害', /暴行|傷害|切り付け|殴|刺し/],
  ['性犯罪', /不同意性交|不同意わいせつ|強制性交|強制わいせつ|性的姿態|盗撮|痴漢/],
  ['交通', /道交法|道路交通法|信号無視|赤信号|ひき逃げ|酒気帯び|酒酔い|無免許|危険運転|過失運転|逃走.{0,10}(?:車|パトカー)|パトカー.{0,10}逃走/],
  ['入管', /入管|難民法|不法(?:に)?(?:上陸|入国|滞在|在留|残留|就労)|オーバーステイ|偽造在留カード/],
  ['商標', /商標法|偽(?:ブランド|物|ユニホ|ユニフォ|サプリ)|模倣品/],
  ['野生動物', /種の保存法|絶滅危惧/],
  ['風営', /風営法|売春/],
];

const nfkc = (s) => String(s || '').normalize('NFKC');

function signals(item) {
  const evidence = [item.audit?.suspectRole?.evidence, item.audit?.japanCrime?.evidence, item.audit?.foreignNationality?.evidence]
    .filter(Boolean).join(' ').replace(/本文抜粋:\s*/g, '');
  const title = nfkc(item.title).replace(/\s*\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日\s*\d{1,2}:\d{2}\s*$/, '').replace(/\s*\d+(?:分|時間)前\s*$/, '');
  const text = `${nfkc(evidence)} ${title}`;
  const nats = new Set([...text.matchAll(NAT_RE)].map((m) => NAT_ALIAS[m[1]] || m[1]));
  if (US_MILITARY_RE.test(text)) nats.add('アメリカ');
  const ages = new Set([...text.matchAll(/(?:[（(](\d{2})[）)]|(\d{2})歳)/g)].map((m) => m[1] || m[2]));
  const places = new Set((text.match(/[一-龥ァ-ヴー]{1,6}(?:市|区|町|村)(?![役長民議])/g) || [])
    .map((p) => p.replace(/^.*?(?:都|道|府|県)/, ''))
    .filter((p) => p.length >= 2 && !/^(?:同市|同町|同区|都市|市区|地区)$/.test(p)));
  (text.match(/(?:東急|京王|小田急|JR|東京メトロ|都営|西武|東武|京急|京成|阪急|阪神|近鉄|名鉄|西鉄|南海|相鉄)[一-龥ァ-ヴー]{0,8}線/g) || []).forEach((l) => places.add(l));
  (text.match(/[一-龥]{1,4}港/g) || []).forEach((l) => places.add(l));
  const crimes = new Set(CRIME_GROUPS.filter(([, re]) => re.test(text)).map(([k]) => k));
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
  return { nats, ages, genders, places, crimes, grams, content, location: item.location || '' };
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

/** 同一事件なら判定理由（文字列）、別事件なら null */
function sameEventReason(a, b, { maxDays = 5 } = {}) {
  if (daysApart(a.date, b.date) > maxDays) return null;
  const sa = a._sig || signals(a); const sb = b._sig || signals(b);
  // A similar headline alone is not an event identity: repeated crime types
  // often use nearly identical headlines. Require the suspect nationality to
  // agree and reject explicit age, gender, municipality, or prefecture conflicts
  // before considering headline similarity.
  if (!sa.nats.size || !sb.nats.size || !intersects(sa.nats, sb.nats)) return null;
  const sameAge = intersects(sa.ages, sb.ages);
  const samePlace = intersects(sa.places, sb.places);
  const sameCrime = intersects(sa.crimes, sb.crimes);
  const locConflict = sa.location && sb.location && sa.location !== '全国' && sb.location !== '全国' && sa.location !== sb.location;
  if (locConflict && !samePlace) return null;
  const agesConflict = sa.ages.size && sb.ages.size && !sameAge;
  const placesConflict = sa.places.size && sb.places.size && !samePlace;
  if (agesConflict || placesConflict) return null;
  if (sa.genders.size && sb.genders.size && !intersects(sa.genders, sb.genders)) return null;
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
      // 同日なら報道元の格付けが高い方を残す
      const keepJ = recent[i].item.date === recent[j].item.date && rank(recent[j].item.url) > rank(recent[i].item.url);
      const loser = keepJ ? recent[i].item : recent[j].item;
      const winner = keepJ ? recent[j].item : recent[i].item;
      drop.add(loser);
      removed.push({ kept: winner.title, removed: loser.title, reason });
      if (keepJ) break;
    }
  }
  return { items: items.filter((x) => !drop.has(x)), removed };
}

module.exports = { signals, sameEventReason, healRecentDuplicates };
