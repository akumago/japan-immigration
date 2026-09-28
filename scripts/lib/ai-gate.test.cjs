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
const resp = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
const gem = (arr) => resp(200, { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(arr) }] } }] });
const promptCount = (init) => (JSON.parse(init.body).contents[0].parts[0].text.match(/\[記事番号:/g) || []).length;

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
test('証拠が「男を逮捕」だけ → 国籍なしで却下', () => {
  const v = gate.verifyItem(item(T), ai({ suspectEvidence: '男を逮捕', locationEvidence: '鳥取・米子' }));
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
test('AIが原文にない引用を返したら却下', () => {
  const v = gate.verifyItem(item(T), ai({ suspectEvidence: 'ベトナム国籍の男を逮捕', locationEvidence: '鳥取・米子' }));
  assert.equal(v.code, 'evidence_not_in_source');
});
test('媒体名を場所の証拠にしても通らない', () => {
  const v = gate.verifyItem(item('ブラジル国籍の男を窃盗容疑で逮捕', '', '京都新聞'), ai({ suspectEvidence: 'ブラジル国籍の男を窃盗容疑で逮捕', locationEvidence: '京都新聞' }));
  assert.equal(v.status, 'review');
  assert.equal(v.code, 'location_unresolved');
});
test('曖昧な区名は review', () => {
  const t = '中央区で外国籍の男を窃盗容疑で逮捕';
  const v = gate.verifyItem(item(t), ai({ suspectEvidence: '外国籍の男を窃盗容疑で逮捕', locationEvidence: '中央区' }));
  assert.equal(v.code, 'location_ambiguous');
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

// ── run(): 障害時の挙動 ──
const good = ai({ suspectEvidence: '台湾籍の男を逮捕', locationEvidence: '鳥取・米子' });

test('429は中断して次回へ（記録せず、回数も数えない）', async () => {
  const d = tmp();
  const out = await gate.run({ candidates: [item(T)], shadow: false, apiKey: 'k', log: silent, minIntervalMs: 0, statePath: path.join(d, 's.json'), fetchImpl: async () => resp(429, {}) });
  assert.equal(out.summary.aborted.kind, 'transient');
  assert.equal(out.accepted.length, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(d, 's.json'), 'utf-8')).decisions, {});
});
test('APIキーなしは fail-closed（何も採用せず、記録もしない）', async () => {
  const out = await gate.run({ candidates: [item(T)], shadow: false, apiKey: '', log: silent, statePath: path.join(tmp(), 's.json') });
  assert.equal(out.accepted.length, 0);
  assert.equal(out.summary.aborted.kind, 'no_api_key');
});
test('解析失敗は分割して再試行し、正しい件だけ採用', async () => {
  const items = [item(T), item('別の記事 台湾籍の男を逮捕 鳥取・米子')];
  const fetchImpl = async (_u, init) => (promptCount(init) > 1 ? resp(200, { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'not json' }] } }] }) : gem([good]));
  const out = await gate.run({ candidates: items, shadow: false, apiKey: 'k', log: silent, minIntervalMs: 0, statePath: path.join(tmp(), 's.json'), fetchImpl });
  // 2件目の見出しには good の引用「台湾籍の男を逮捕」「鳥取・米子」が含まれるので採用される
  assert.equal(out.accepted.length, 2);
});
test('AIが返さない記事は5回で review になり、以後は再送されない', async () => {
  const sp = path.join(tmp(), 's.json');
  const it = item(T);
  let calls = 0;
  const fetchImpl = async () => { calls++; return gem([]); };
  for (let i = 0; i < 5; i++) await gate.run({ candidates: [it], shadow: false, apiKey: 'k', log: silent, minIntervalMs: 0, statePath: sp, fetchImpl });
  const st = JSON.parse(fs.readFileSync(sp, 'utf-8')).decisions[gate.articleKey(it)];
  assert.equal(st.status, 'review');
  assert.equal(st.code, 'attempts_exceeded');
  const before = calls;
  await gate.run({ candidates: [it], shadow: false, apiKey: 'k', log: silent, minIntervalMs: 0, statePath: sp, fetchImpl });
  assert.equal(calls, before);
});
test('採用済みは二度と審査しない', async () => {
  const sp = path.join(tmp(), 's.json');
  const it = item(T);
  const fetchImpl = async () => gem([good]);
  const a = await gate.run({ candidates: [it], shadow: false, apiKey: 'k', log: silent, minIntervalMs: 0, statePath: sp, fetchImpl });
  const b = await gate.run({ candidates: [it], shadow: false, apiKey: 'k', log: silent, minIntervalMs: 0, statePath: sp, fetchImpl });
  assert.equal(a.accepted.length, 1);
  assert.equal(b.accepted.length, 0);
  assert.equal(b.summary.skipped, 1);
});
test('シャドー運転は比較ログを書き、旧の採否と突き合わせる', async () => {
  const d = tmp();
  const it = item(T);
  const out = await gate.run({ candidates: [it], shadow: true, legacyAccepted: [], apiKey: 'k', log: silent, minIntervalMs: 0, statePath: path.join(d, 's.json'), shadowLogPath: path.join(d, 'c.jsonl'), fetchImpl: async () => gem([good]) });
  assert.equal(out.accepted.length, 1);
  const rec = JSON.parse(fs.readFileSync(path.join(d, 'c.jsonl'), 'utf-8').trim());
  assert.equal(rec.legacy, 'rejected');
  assert.equal(rec.gate, 'accepted');
  assert.equal(rec.agree, false);
});
