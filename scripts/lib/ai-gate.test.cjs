'use strict';
// 実行: node --test "scripts/lib/*.test.cjs"
// 目視チェックで見つけた誤判定は、ここにケースとして足していく（CIで毎回流れる）。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const gate = require('./ai-gate.cjs');

const item = (title, description = '', media = '') => ({ title, description, media, url: 'https://example.com/' + encodeURIComponent(title) });
const ai = (extra) => ({ index: 0, isValid: true, reason: 'ok', cleanTitle: '', suspectEvidence: '', locationEvidence: '', ...extra });
const silent = { log() {}, warn() {} };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));

// ── 場所の解決 ──
test('大津市は滋賀県（「津市」=三重に引っ張られない）', () => assert.equal(gate.resolvePrefecture('大津市で外国籍の男を逮捕').pref, '滋賀県'));
test('宮津市は京都府', () => assert.equal(gate.resolvePrefecture('宮津市の民家で').pref, '京都府'));
test('上野原市は山梨県（「上野」=東京に引っ張られない）', () => assert.equal(gate.resolvePrefecture('山梨県上野原市').pref, '山梨県'));
test('茨城県警常陸大宮署は茨城県（大宮区=埼玉ではない）', () => assert.equal(gate.resolvePrefecture('常陸大宮署は').pref, '茨城県'));
test('新宿署は東京都', () => assert.equal(gate.resolvePrefecture('新宿署は男を逮捕').pref, '東京都'));
test('「中央区」だけでは決めない', () => {
  const r = gate.resolvePrefecture('中央区で男を逮捕');
  assert.equal(r.pref, null);
  assert.match(r.reason, /ambiguous/);
});
test('東京都港区は東京都、「港区」だけは決めない', () => {
  assert.equal(gate.resolvePrefecture('東京都港区で').pref, '東京都');
  assert.equal(gate.resolvePrefecture('港区で').pref, null);
});
test('媒体名（北海道新聞）は場所にならない', () => assert.equal(gate.resolvePrefecture('北海道新聞 ベトナム国籍の男を逮捕').pref, null));
test('「新潟・上越」形式', () => assert.equal(gate.resolvePrefecture('男を逮捕 新潟・上越').pref, '新潟県'));
test('「大森町」の「森町」に一致しない', () => assert.equal(gate.resolvePrefecture('大森町で').pref, null));
test('複数県が出たら決めない（県警側があればそちら）', () => {
  assert.equal(gate.resolvePrefecture('茨城県と栃木県で').pref, null);
  assert.equal(gate.resolvePrefecture('埼玉県警は東京都内で').pref, '埼玉県');
});

// ── 検証 ──
const T = '警察官を装う詐欺の疑い 台湾籍の男を逮捕 鳥取・米子';
test('正常系', () => {
  const v = gate.verifyItem(item(T), ai({ suspectEvidence: '台湾籍の男を逮捕', locationEvidence: '鳥取・米子' }));
  assert.equal(v.status, 'accepted');
  assert.equal(v.pref, '鳥取県');
});
test('isVictimSide は例外を投げない（NAT_REのgフラグ）', () => assert.doesNotThrow(() => gate.isVictimSide('台湾籍の男を逮捕')));
test('傷害容疑（けがをさせた）は被害者側にしない', () => {
  const t = '中国籍の男 けがをさせた疑いで逮捕 神奈川県警';
  const v = gate.verifyItem(item(t), ai({ suspectEvidence: '中国籍の男 けがをさせた疑いで逮捕', locationEvidence: '神奈川県警' }));
  assert.equal(v.status, 'accepted');
});
test('死亡事故で逮捕された側は容疑者', () => {
  const t = 'ブラジル国籍の男を過失運転致死の疑いで逮捕 死亡事故 静岡県警';
  const v = gate.verifyItem(item(t), ai({ suspectEvidence: 'ブラジル国籍の男を過失運転致死の疑いで逮捕', locationEvidence: '静岡県警' }));
  assert.equal(v.status, 'accepted');
});
test('国籍表現が被害の受け身に続く → 却下', () => {
  const t = 'ベトナム人男性が刺され死亡 日本人の男を殺人容疑で逮捕 茨城県警';
  const v = gate.verifyItem(item(t), ai({ suspectEvidence: 'ベトナム人男性が刺され', locationEvidence: '茨城県警' }));
  assert.equal(v.code, 'victim_side');
});
test('AIの引用が「男を逮捕」だけでも、原文に被疑者側の国籍表現があれば救済して採用', () => {
  const v = gate.verifyItem(item(T), ai({ suspectEvidence: '男を逮捕', locationEvidence: '鳥取・米子' }));
  assert.equal(v.status, 'accepted');
  assert.equal(v.susFallback, true);
});
test('原文のどこにも国籍表現が無ければ、引用が「男を逮捕」だけのとき却下', () => {
  const v = gate.verifyItem(item('警察官を装う詐欺の疑い 男を逮捕 鳥取・米子'), ai({ suspectEvidence: '男を逮捕', locationEvidence: '鳥取・米子' }));
  assert.equal(v.code, 'no_nationality');
});
test('教育実習生は国籍表現にならない', () => {
  const t = '教育実習生の男を逮捕 東京都内の中学校';
  const v = gate.verifyItem(item(t), ai({ suspectEvidence: '教育実習生の男を逮捕', locationEvidence: '東京都内' }));
  assert.equal(v.code, 'no_nationality');
});
test('「タイヤ」は「タイ」ではない', () => {
  const t = 'タイヤ窃盗の疑い 東京都内で男を逮捕';
  const v = gate.verifyItem(item(t), ai({ suspectEvidence: 'タイヤ窃盗の疑い', locationEvidence: '東京都内' }));
  assert.equal(v.code, 'no_nationality');
});
test('AIが原文にない引用を返しても、原文に被疑者側の国籍表現があれば救済（国籍はAIの引用でなく原文で確認）', () => {
  const v = gate.verifyItem(item(T), ai({ suspectEvidence: 'ベトナム国籍の男を逮捕', locationEvidence: '鳥取・米子' }));
  assert.equal(v.status, 'accepted');
  assert.equal(v.susFallback, true);
});
test('AIが原文にない引用を返し、原文にも国籍表現が無ければ却下', () => {
  const v = gate.verifyItem(item('窃盗容疑で男を逮捕 鳥取・米子'), ai({ suspectEvidence: 'ベトナム国籍の男を逮捕', locationEvidence: '鳥取・米子' }));
  assert.equal(v.code, 'evidence_not_in_source');
});
test('媒体名を場所の証拠にしても通らない', () => {
  const v = gate.verifyItem(item('ブラジル国籍の男を窃盗容疑で逮捕', '', '京都新聞'), ai({ suspectEvidence: 'ブラジル国籍の男を窃盗容疑で逮捕', locationEvidence: '京都新聞' }));
  assert.equal(v.status, 'accepted'); // 場所が決まらなくても公開する（取りこぼさない）
  assert.equal(v.locationUnknown, true);
  const s = gate.verifyItem(item('ブラジル国籍の男を窃盗容疑で逮捕', '', '京都新聞'), ai({ suspectEvidence: 'ブラジル国籍の男を窃盗容疑で逮捕', locationEvidence: '京都新聞' }), { strictLocation: true });
  assert.equal(s.status, 'review');
  assert.equal(s.code, 'location_unresolved');
});
test('曖昧な区名は review', () => {
  const t = '中央区で外国籍の男を窃盗容疑で逮捕';
  const v = gate.verifyItem(item(t), ai({ suspectEvidence: '外国籍の男を窃盗容疑で逮捕', locationEvidence: '中央区' }));
  assert.equal(v.status, 'accepted');
  assert.equal(v.locationUnknown, true);
  const s = gate.verifyItem(item(t), ai({ suspectEvidence: '外国籍の男を窃盗容疑で逮捕', locationEvidence: '中央区' }), { strictLocation: true });
  assert.equal(s.code, 'location_ambiguous');
});
test('見出しの数字が捏造なら元の見出しを使う（記事は落とさない）', () => {
  const t = 'ベトナム国籍の男を窃盗容疑で逮捕 埼玉県警';
  const v = gate.verifyItem(item(t), ai({ suspectEvidence: 'ベトナム国籍の男を窃盗容疑で逮捕', locationEvidence: '埼玉県警', cleanTitle: 'ベトナム国籍の男(42)を窃盗容疑で逮捕 埼玉・川口' }));
  assert.equal(v.status, 'accepted');
  assert.equal(v.cleanTitleOk, false);
});
test('整形見出しの県が食い違えば不採用扱い', () => {
  const t = 'ベトナム国籍の男を窃盗容疑で逮捕 埼玉県警';
  const v = gate.verifyItem(item(t), ai({ suspectEvidence: 'ベトナム国籍の男を窃盗容疑で逮捕', locationEvidence: '埼玉県警', cleanTitle: 'ベトナム国籍の男を窃盗容疑で逮捕 千葉県内で' }));
  assert.equal(v.cleanTitleOk, false);
});
test('米兵（国内）は採用できる', () => {
  const t = '米兵の男を暴行容疑で逮捕 沖縄県警';
  const v = gate.verifyItem(item(t), ai({ suspectEvidence: '米兵の男を暴行容疑で逮捕', locationEvidence: '沖縄県警' }));
  assert.equal(v.status, 'accepted');
  assert.equal(v.pref, '沖縄県');
});
test('AIが不採用なら却下', () => assert.equal(gate.verifyItem(item(T), ai({ isValid: false, reason: '海外' })).code, 'ai_rejected'));

// ── run(): ローカル審査 → 採用/却下/保留 → 記録 ──
const runOpts = (o) => ({ shadow: false, log: silent, ...o });
const stateOf = (sp, it) => JSON.parse(fs.readFileSync(sp, 'utf-8')).decisions[gate.articleKey(it)];

test('ローカル審査: 3要素が揃った正当記事は採用される', async () => {
  const sp = path.join(tmp(), 's.json');
  const it = item(T);
  const out = await gate.run(runOpts({ candidates: [it], statePath: sp }));
  assert.equal(out.accepted.length, 1);
  assert.equal(out.accepted[0].location, '鳥取県');
  assert.equal(stateOf(sp, it).status, 'accepted');
});

test('ローカル審査: 国籍表現のない記事は却下される', async () => {
  const sp = path.join(tmp(), 's.json');
  const it = item('窃盗容疑で男を逮捕 鳥取・米子');
  const out = await gate.run(runOpts({ candidates: [it], statePath: sp }));
  assert.equal(out.accepted.length, 0);
  assert.equal(out.summary.rejected, 1);
  assert.equal(stateOf(sp, it).status, 'rejected');
});

test('ローカル審査: 採用済み記事は次回スキップされる', async () => {
  const sp = path.join(tmp(), 's.json');
  const it = item(T);
  const a = await gate.run(runOpts({ candidates: [it], statePath: sp }));
  const b = await gate.run(runOpts({ candidates: [it], statePath: sp }));
  assert.equal(a.accepted.length, 1);
  assert.equal(b.accepted.length, 0);
  assert.equal(b.summary.skipped, 1);
});

test('ローカル審査: シャドー運転は比較ログを正しく書き出す', async () => {
  const d = tmp();
  const out = await gate.run(runOpts({
    candidates: [item(T)], shadow: true, legacyAccepted: [],
    statePath: path.join(d, 's.json'), shadowLogPath: path.join(d, 'c.jsonl')
  }));
  assert.equal(out.accepted.length, 1);
  const rec = JSON.parse(fs.readFileSync(path.join(d, 'c.jsonl'), 'utf-8').trim());
  assert.equal(rec.gate, 'accepted');
});

// ── 強制排除: 海外・日本人被疑者・被害者のみ（AIの構造化フィールドとコード） ──
const S = (o) => gate.verifyItem(item(T), ai({ suspectEvidence: '台湾籍の男を逮捕', locationEvidence: '鳥取・米子', ...o }));
test('AIが suspectNationality=japanese なら却下（日本国内の日本人の犯罪は出さない）', () => assert.equal(S({ suspectNationality: 'japanese' }).code, 'japanese_suspect'));
test('AIが suspectNationality=victim_only なら却下', () => assert.equal(S({ suspectNationality: 'victim_only' }).code, 'victim_side'));
test('AIが crimeInJapan=no なら却下（海外の事件は出さない）', () => assert.equal(S({ crimeInJapan: 'no' }).code, 'overseas'));
test('crimeInJapan=unknown で日本の地名も警察の語も無ければ review（海外事件を場所不明で通さない）', () => {
  const v = gate.verifyItem(item('ベトナム国籍の男を詐欺容疑で逮捕'), ai({ suspectEvidence: 'ベトナム国籍の男を詐欺容疑で逮捕', locationEvidence: '', crimeInJapan: 'unknown', suspectNationality: 'foreign' }));
  assert.equal(v.status, 'review');
  assert.equal(v.code, 'domestic_unconfirmed');
});
test('crimeInJapan=unknown でも、日本の警察の語があれば通す', () => {
  const v = gate.verifyItem(item('ベトナム国籍の男を詐欺容疑で逮捕 県警'), ai({ suspectEvidence: 'ベトナム国籍の男を詐欺容疑で逮捕', locationEvidence: '', crimeInJapan: 'unknown', suspectNationality: 'foreign' }));
  assert.equal(v.status, 'accepted');
});
test('日本国籍・帰化と明記された被疑者は、外国出身でも却下', () => {
  assert.equal(verdict('ブラジル出身の日本国籍の男を逮捕 愛知県警', 'ブラジル出身の日本国籍の男を逮捕', '愛知県警').code, 'japanese_suspect');
});
test('日本人被疑者だけで国籍表現が無い記事は、国籍なしで却下（日本人の犯罪は構造的に通らない）', () => {
  assert.equal(verdict('日本人の男(30)を窃盗容疑で逮捕 愛知県警', '男(30)を窃盗容疑で逮捕', '愛知県警').code, 'no_nationality');
});

// ── 被疑者側/被害者側の判別（v3.1 追加）──
const verdict = (title, sus, loc) => gate.verifyItem(item(title), ai({ suspectEvidence: sus, locationEvidence: loc }));
const REJECT = [
  ['能動態の被害者＋日本人被疑者', '中国人女性を暴行した疑い 日本人の男を逮捕 大阪府警', '中国人女性を暴行した疑い', '大阪府警', 'victim_side'],
  ['「が被害」', 'タイ人女性が被害 詐欺容疑で男逮捕 東京都', 'タイ人女性が被害', '東京都', 'victim_side'],
  ['スペースの後ろに述語（車にはねられ）', 'ベトナム人男性 車にはねられ死亡 運転の日本人男を逮捕 京都府警', 'ベトナム人男性 車にはねられ死亡', '京都府警', 'victim_side'],
  ['外国人被害者', '外国人被害者の相談窓口 容疑で逮捕 東京都', '外国人被害者', '東京都', 'victim_side'],
  ['雇用主側（不法就労させた）', 'ベトナム人に不法就労させた疑い 日本人の社長を逮捕 群馬県警', 'ベトナム人に不法就労させた疑い', '群馬県警', 'victim_side'],
  ['不法就労助長は国籍表現ではない', '不法就労助長 日本人経営者を逮捕 愛知県警', '不法就労助長', '愛知県警', 'no_nationality'],
  ['外国人を装った日本人', '外国人を装い 日本人の男を詐欺容疑で逮捕 東京都', '外国人を装い', '東京都', 'victim_side'],
  ['外国人経営の店で日本人を逮捕', 'トルコ人が経営する店で 日本人従業員を逮捕 東京都', 'トルコ人が経営する店', '東京都', 'japanese_suspect'],
  ['海外の捜査機関が主体', '韓国警察が中国籍の男を逮捕 詐欺容疑', '中国籍の男を逮捕', 'ソウル', 'overseas'],
];
for (const [name, t, s, l, code] of REJECT) test(`却下: ${name}`, () => assert.equal(verdict(t, s, l).code, code));

const ACCEPT = [
  ['通常の傷害', 'ブラジル人の男(30)を傷害容疑で逮捕 愛知県警', 'ブラジル人の男(30)を傷害容疑で逮捕', '愛知県警', '愛知県'],
  ['技能実習生', 'ベトナム人実習生が窃盗容疑で逮捕 群馬県警', 'ベトナム人実習生が窃盗容疑で逮捕', '群馬県警', '群馬県'],
  ['「に襲われ」は国籍側が加害者', 'インド人の男に襲われ 会社員けが 容疑で逮捕 千葉県警', 'インド人の男に襲われ', '千葉県警', '千葉県'],
  ['被害者が日本人と書かれていても被疑者は外国籍', 'ネパール人の男 殺人容疑で逮捕 被害者は日本人 神奈川県警', 'ネパール人の男 殺人容疑で逮捕', '神奈川県警', '神奈川県'],
  ['日本人と外国人の混成', '日本人と外国人の男女を逮捕 東京都', '外国人の男女を逮捕', '東京都', '東京都'],
  ['外国籍と日本人の共犯（外国籍が先）', '中国籍の男(30)と日本人の男(25)を詐欺容疑で逮捕 警視庁', '中国籍の男(30)と日本人の男(25)を詐欺容疑で逮捕', '警視庁', '東京都'],
  ['被害者も外国人だが被疑者も外国人', 'ベトナム人男性が刺され重傷 中国籍の男を殺人未遂容疑で逮捕 埼玉県警', '中国籍の男を殺人未遂容疑で逮捕', '埼玉県警', '埼玉県'],
  ['日本の警察が外国籍を逮捕（国名＋警察の語が無関係）', '中国籍の男を逮捕 中国当局と連携 京都府警', '中国籍の男を逮捕', '京都府警', '京都府'],
];
for (const [name, t, s, l, pref] of ACCEPT) test(`採用: ${name}`, () => { const v = verdict(t, s, l); assert.equal(v.status, 'accepted', `${v.code}: ${v.reason}`); assert.equal(v.pref, pref); });

test('単独の「中央署」「城東署」は管轄を決めない（東京/大阪の両方にある）', () => {
  assert.equal(gate.resolvePrefecture('中央署は男を逮捕').pref, null);
  assert.equal(gate.resolvePrefecture('城東署は男を逮捕').pref, null);
});
test('神戸中央署は兵庫県（接頭の市名で決まる）', () => assert.equal(gate.resolvePrefecture('神戸中央署は').pref, '兵庫県'));
test('池袋署は東京都', () => assert.equal(gate.resolvePrefecture('池袋署は').pref, '東京都'));

// ── 取りこぼし防止（v3.2）: 日本国内・外国人被疑者の記事は採用される ──
const MUST_ACCEPT = [
  ['カタカナのフルネーム＋容疑者', 'グエン・ヴァン・ナム容疑者を窃盗容疑で逮捕 愛知県警', 'グエン・ヴァン・ナム容疑者を窃盗容疑で逮捕', '愛知県警', '愛知県'],
  ['辞書にない国名（○○人の男）', 'アルメニア人の男を窃盗容疑で逮捕 神奈川県警', 'アルメニア人の男を窃盗容疑で逮捕', '神奈川県警', '神奈川県'],
  ['外国人グループ＋捜査（逮捕語なし）', '外国人グループ 車両窃盗か 男ら捜査 千葉県警', '外国人グループ', '千葉県警', '千葉県'],
  ['米軍関係者（国内）', 'アメリカ軍関係者の男を逮捕 沖縄県警', 'アメリカ軍関係者の男を逮捕', '沖縄県警', '沖縄県'],
  ['中国当局と連携した国内逮捕', '中国当局の要請で中国籍の男を逮捕 詐欺容疑 大阪府警', '中国籍の男を逮捕', '大阪府警', '大阪府'],
  ['被害者に暴行（被害者は日本人）', 'ネパール人の男 被害者に暴行の疑い 逮捕 東京都', 'ネパール人の男 被害者に暴行の疑い', '東京都', '東京都'],
  ['「中国人男を殴った」の「男」は被疑者', '中国人男を殴った疑いで逮捕 大阪府警', '中国人男を殴った疑いで逮捕', '大阪府警', '大阪府'],
  ['「被害総額」は被害者側ではない', 'ベトナム人の男が被害総額3億円の詐欺容疑で逮捕 愛知県警', 'ベトナム人の男が被害総額3億円', '愛知県警', '愛知県'],
  ['中国系', '中国系の男を逮捕 万引き容疑 福岡県警', '中国系の男', '福岡県警', '福岡県'],
  ['「死亡ひき逃げ」の容疑者', 'ブラジル人の男 死亡ひき逃げの疑いで逮捕 静岡県警', 'ブラジル人の男', '静岡県警', '静岡県'],
  ['被害者も外国人（被疑者も外国人）', 'ネパール人女性を暴行した疑い ベトナム人の男を逮捕 警視庁', 'ベトナム人の男を逮捕', '警視庁', '東京都'],
  ['ウクライナ人（国名リスト既存）でも国内なら採用', 'ウクライナ人の男を窃盗容疑で逮捕 兵庫県警', 'ウクライナ人の男を窃盗容疑で逮捕', '兵庫県警', '兵庫県'],
];
for (const [name, t, s, l, pref] of MUST_ACCEPT) test(`取りこぼさない: ${name}`, () => { const v = verdict(t, s, l); assert.equal(v.status, 'accepted', `${v.code}: ${v.reason}`); assert.equal(v.pref, pref); });

test('要約に場所があれば、見出しに無くても県が決まる', () => {
  const v = gate.verifyItem(item('ベトナム人の男を窃盗容疑で逮捕', '茨城県警は28日、…'), ai({ suspectEvidence: 'ベトナム人の男を窃盗容疑で逮捕', locationEvidence: '' }));
  assert.equal(v.pref, '茨城県');
});
test('AIが不採用でもルール上は通る記事に ruleAgrees が付く（取りこぼし候補の監視用）', () => {
  const v = gate.verifyItem(item(T), ai({ isValid: false, reason: '不明' }));
  assert.equal(v.code, 'ai_rejected');
  assert.equal(v.ruleAgrees, true);
  assert.equal(gate.verifyItem(item('窃盗容疑で男を逮捕 鳥取・米子'), ai({ isValid: false })).ruleAgrees, false);
});

test('海外の地名だけで日本の地名・警察が無い記事は海外扱い（場所不明で通さない）', () => {
  assert.equal(verdict('米国籍の男を逮捕 ニューヨーク市警は…', '米国籍の男を逮捕', '').code, 'overseas');
  assert.equal(verdict('中国人の男 ロサンゼルスで逮捕', '中国人の男', '').code, 'overseas');
});
test('明示された海外犯行は、別箇所に日本の地名があっても海外扱い', () => {
  assert.equal(verdict('韓国籍の男を逮捕 ソウルで詐欺 東京都', '韓国籍の男を逮捕', '東京都').code, 'overseas');
});

test('場所がゲートで決まらなくても、取得側が決めた場所（全国以外）は残す', async () => {
  const it2 = { ...item('フィリピン国籍の女を詐欺容疑で逮捕'), location: '愛知県' };
  const out = await gate.run(runOpts({ candidates: [it2], statePath: path.join(tmp(), 's.json') }));
  assert.equal(out.accepted[0].location, '愛知県');
  assert.match(out.accepted[0].summary, /愛知県で発生した/);
});
test('rulesPass: 場所の解決を必須にしない指定（前段フィルタ用）', () => {
  const it2 = item('フィリピン国籍の女を逮捕 詐欺容疑');
  assert.equal(gate.rulesPass(it2), false);
  assert.equal(gate.rulesPass(it2, { requireLocation: false }), true);
  assert.equal(gate.rulesPass(item('日本人の男を窃盗容疑で逮捕 愛知県警'), { requireLocation: false }), false);
  assert.equal(gate.rulesPass(item('中国人女性を暴行した疑い 日本人の男を逮捕 大阪府警'), { requireLocation: false }), false);
});

// ── 本文スキャン（v3.4）: 本文の言い回しと、被害者の国籍を拾わない ──
test('本文の言い回し（国籍は韓国／特別永住者）も国籍表現として拾う', () => {
  assert.ok(gate.ruleSuspect('捜査関係者によると、男の国籍は韓国で', ''));
  assert.ok(gate.ruleSuspect('男は特別永住者で、', ''));
});
test('被害者の国籍を示す文は、被疑者側の国籍表現として拾わない', () => {
  assert.equal(gate.ruleSuspect('被害に遭ったのは韓国籍の女性で、', ''), null);
  assert.equal(gate.ruleSuspect('刺されたのはベトナム国籍の男性(30)で、', ''), null);
  assert.ok(gate.ruleSuspect('逮捕されたのはベトナム国籍の男(30)で、', ''));
});
test('bodyContext は見出しに国籍が無い記事の国籍の根拠になり、公開する項目（description）には入らない', () => {
  const it2 = { ...item('タイヤとホイールを盗んだ疑い 男を逮捕 兵庫県警'), bodyContext: '調べに対し、男は韓国籍の会社員(40)で、容疑を認めている。' };
  const v = gate.verifyItem(it2, ai({ suspectEvidence: '男は韓国籍の会社員(40)', locationEvidence: '兵庫県警' }));
  assert.equal(v.status, 'accepted');
  assert.equal(v.pref, '兵庫県');
  assert.equal(it2.description, '');
});
test('bodyContext が無く見出しにも国籍が無い記事は、従来どおり却下', () => {
  assert.equal(gate.verifyItem(item('タイヤとホイールを盗んだ疑い 男を逮捕 兵庫県警'), ai({ suspectEvidence: '男を逮捕', locationEvidence: '兵庫県警' })).code, 'no_nationality');
});
test('bodyContext の国籍が被害者のものだけなら却下', () => {
  const it2 = { ...item('傷害容疑で男を逮捕 兵庫県警'), bodyContext: '被害に遭ったのはベトナム国籍の女性(25)で、' };
  assert.equal(gate.verifyItem(it2, ai({ suspectEvidence: 'ベトナム国籍の女性(25)', locationEvidence: '兵庫県警' })).status, 'rejected');
});

test('見出し限定ゲート: 明示国籍・被疑者・犯罪・国内地名が揃うと本文未取得の限定判定を許可', () => {
  const result = gate.verifyHeadlineOnly('群馬県大泉町で住宅侵入、ブラジル国籍の男を逮捕');
  assert.equal(result.verified, true);
  assert.equal(result.location, '群馬県');
  assert.match(result.audit.foreignNationality.evidence, /^見出し根拠:/);
  assert.match(result.audit.japanCrime.evidence, /^見出し根拠:/);
});

test('見出し限定ゲート: 国内地名が無い事件、被害者側、海外事件は本文なしでは通さない', () => {
  assert.equal(gate.verifyHeadlineOnly('中国籍の男を窃盗容疑で逮捕').verified, false);
  assert.equal(gate.verifyHeadlineOnly('ベトナム国籍の女性が路上で刺され死亡').verified, false);
  assert.equal(gate.verifyHeadlineOnly('タイ国内でタイ国籍の男を窃盗容疑で逮捕').verified, false);
});

test('見出し限定ゲート: 夫婦のカメ密輸見出しは国籍・被疑者側の明示がなく仮掲載しない', () => {
  const result = gate.verifyHeadlineOnly('国際希少野生動植物種を密輸しようとした疑いで京都市の夫婦を逮捕 関西国際空港');
  assert.equal(result.verified, false);
});

test('本文ゲート: 外国籍被疑者が確認できず日本人被疑者と明示されたら明確に却下する', () => {
  const text = '東京都新宿区の路上で暴行事件がありました。警視庁は日本人の男を傷害容疑で逮捕し、詳しい経緯を調べています。現場では目撃者への聞き取りも行われました。';
  const result = gate.verifyArticleContent(text, '東京都新宿区の暴行事件');
  assert.equal(result.rejected, true);
  assert.equal(result.rejectReason, 'suspect_is_japanese');
});
