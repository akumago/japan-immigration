'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { appendRun, sourceHealthTrend, sumCountMaps, markdownTrend } = require('./pipeline-observability.cjs');

test('observability: source-level outcomes and queue counts are retained for 30 days', () => {
  const now = Date.parse('2026-10-02T12:00:00.000Z');
  const result = appendRun({ runs: [] }, {
    startedAt: new Date(now - 60_000).toISOString(),
    completedAt: new Date(now).toISOString(),
    sources: [{ id: 'local-rss', ok: false, candidates: 3, error: 'http_503\nretry' }],
    counts: { scanned: 20, pending: 100, published: 2 },
    candidatesByMedia: { 'Local paper': 3 },
    publishedByPrefecture: { '東京都': 2 },
  }, now);
  assert.equal(result.runs.length, 1);
  assert.deepEqual(result.runs[0].counts, { scanned: 20, pending: 100, published: 2 });
  assert.equal(result.runs[0].sources[0].error, 'http_503 retry');
  assert.deepEqual(result.runs[0].candidatesByMedia, { 'Local paper': 3 });
  assert.deepEqual(sumCountMaps(result.runs, 'publishedByPrefecture', now), [['東京都', 2]]);
});

test('observability: 24-hour source trend reports success rate, last success, and candidates', () => {
  const now = Date.parse('2026-10-02T12:00:00.000Z');
  const runs = [
    { completedAt: new Date(now - 60 * 60_000).toISOString(), sources: [{ id: 'nhk', ok: true, candidates: 4 }] },
    { completedAt: new Date(now - 30 * 60_000).toISOString(), sources: [{ id: 'nhk', ok: false, candidates: 0, error: 'http_503' }] },
    { completedAt: new Date(now - 30 * 60 * 60_000).toISOString(), sources: [{ id: 'old', ok: true, candidates: 99 }] },
  ];
  const trend = sourceHealthTrend(runs, now, 24);
  assert.equal(trend.length, 1);
  assert.equal(trend[0].id, 'nhk');
  assert.equal(trend[0].attempts, 2);
  assert.equal(trend[0].successRate, 0.5);
  assert.equal(trend[0].candidates, 4);
  assert.match(markdownTrend(trend, runs, now), /nhk \| 1\/2 \(50%\)/);
});

test('observability: history is bounded to 30 days and 1000 records', () => {
  const now = Date.parse('2026-10-02T12:00:00.000Z');
  const old = { completedAt: new Date(now - 31 * 24 * 60 * 60_000).toISOString(), sources: [], counts: {} };
  const fresh = { completedAt: new Date(now - 1000).toISOString(), sources: [], counts: {} };
  const result = appendRun({ runs: [old, ...Array(1000).fill(fresh)] }, { sources: [], counts: {} }, now);
  assert.equal(result.runs.length, 1000);
  assert.equal(result.runs.at(-1).completedAt, new Date(now).toISOString());
});
