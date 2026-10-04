'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyLegacyRisk, compareLegacyAuditPriority } = require('./legacy-risk.cjs');

test('旧記事リスク分類は優先順位だけを返し、公開可否の結論を持たない', () => {
  const high = classifyLegacyRisk({
    title: '日本人の男と中国籍の女を逮捕、東京都新宿区で詐欺事件', location: '東京都',
  });
  const low = classifyLegacyRisk({
    title: '東京都新宿区で中国籍の男を窃盗容疑で逮捕', location: '東京都',
  });
  assert.equal(high.tier, 'high');
  assert.equal(low.tier, 'low');
  assert.equal(Object.hasOwn(high, 'publishable'), false);
});

test('旧記事監査は見出しゲートに落ちる記事を通る記事より先に処理する', () => {
  const fail = { item: { title: 'カメ密輸疑い 京都市の夫婦を逮捕', date: '2026-08-01' }, risk: { tier: 'low' } };
  const pass = { item: { title: '群馬県大泉町で住宅侵入、ブラジル国籍の男を逮捕', date: '2026-08-01' }, risk: { tier: 'high' } };
  assert.ok(compareLegacyAuditPriority(fail, pass) < 0);
});

test('日本人への言及が被疑者と断定できない場合は、根拠として区別して優先確認に回す', () => {
  const result = classifyLegacyRisk({
    title: '中国籍の男を逮捕、日本人被害者に金を要求か', location: '東京都',
  });
  assert.equal(result.tier, 'medium');
  assert.ok(result.reasons.includes('japanese_and_foreign_people_both_mentioned_role_unclear'));
});
