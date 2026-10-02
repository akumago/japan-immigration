'use strict';

const HISTORY_DAYS = 30;
const MAX_RUNS = 1000;

function normalizeSource(source) {
  return {
    id: String(source?.id || 'unknown').slice(0, 120),
    ok: source?.ok === true,
    successes: Number.isFinite(Number(source?.successes)) ? Number(source.successes) : null,
    total: Number.isFinite(Number(source?.total)) ? Number(source.total) : null,
    candidates: Number.isFinite(Number(source?.candidates)) ? Number(source.candidates) : 0,
    error: source?.error ? String(source.error).replace(/[\r\n|]/g, ' ').slice(0, 240) : null,
  };
}

function normalizeCountMap(input, maxKeys = 60) {
  const entries = Object.entries(input || {})
    .map(([key, value]) => [String(key).replace(/[\r\n|]/g, ' ').slice(0, 100), Math.max(0, Number(value) || 0)])
    .filter(([key, value]) => key && value > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const kept = entries.slice(0, maxKeys);
  const rest = entries.slice(maxKeys).reduce((sum, [, count]) => sum + count, 0);
  if (rest) kept.push(['その他', rest]);
  return Object.fromEntries(kept);
}

function appendRun(history, run, now = Date.now()) {
  const runs = Array.isArray(history?.runs) ? history.runs.slice() : [];
  const record = {
    startedAt: run.startedAt || new Date(now).toISOString(),
    completedAt: run.completedAt || new Date(now).toISOString(),
    sources: (run.sources || []).map(normalizeSource),
    counts: Object.fromEntries(Object.entries(run.counts || {}).map(([key, value]) => [key, Number(value) || 0])),
    candidatesByMedia: normalizeCountMap(run.candidatesByMedia, 40),
    publishedByPrefecture: normalizeCountMap(run.publishedByPrefecture, 50),
  };
  runs.push(record);
  const cutoff = now - HISTORY_DAYS * 24 * 60 * 60 * 1000;
  const retained = runs.filter((item) => {
    const time = Date.parse(item.completedAt || '');
    return Number.isFinite(time) && time >= cutoff && time <= now + 10 * 60 * 1000;
  }).slice(-MAX_RUNS);
  return { version: 1, updatedAt: new Date(now).toISOString(), runs: retained };
}

function sumCountMaps(runs, key, now = Date.now(), windowHours = 24) {
  const cutoff = now - windowHours * 60 * 60 * 1000;
  const totals = {};
  for (const run of Array.isArray(runs) ? runs : []) {
    const completed = Date.parse(run.completedAt || '');
    if (!Number.isFinite(completed) || completed < cutoff || completed > now + 10 * 60 * 1000) continue;
    for (const [label, count] of Object.entries(run[key] || {})) totals[label] = (totals[label] || 0) + (Number(count) || 0);
  }
  return Object.entries(totals).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function sourceHealthTrend(runs, now = Date.now(), windowHours = 24) {
  const cutoff = now - windowHours * 60 * 60 * 1000;
  const byId = new Map();
  for (const run of Array.isArray(runs) ? runs : []) {
    const completed = Date.parse(run.completedAt || '');
    if (!Number.isFinite(completed) || completed < cutoff || completed > now + 10 * 60 * 1000) continue;
    for (const source of run.sources || []) {
      const row = byId.get(source.id) || { id: source.id, attempts: 0, successes: 0, candidates: 0, lastSuccessAt: null, lastError: null };
      row.attempts++;
      if (source.ok) {
        row.successes++;
        row.lastSuccessAt = run.completedAt;
      } else if (source.error) {
        row.lastError = source.error;
      }
      row.candidates += Number(source.candidates) || 0;
      byId.set(source.id, row);
    }
  }
  return [...byId.values()].map((row) => ({
    ...row,
    successRate: row.attempts ? Number((row.successes / row.attempts).toFixed(3)) : null,
  })).sort((a, b) => a.id.localeCompare(b.id));
}

function markdownTrend(trend, runs = [], now = Date.now()) {
  const sourceRows = trend.map((row) => `| ${row.id} | ${row.successes}/${row.attempts} (${Math.round(row.successRate * 100)}%) | ${row.candidates} | ${row.lastSuccessAt || 'なし'} | ${row.lastError || ''} |`).join('\n');
  const mediaRows = sumCountMaps(runs, 'candidatesByMedia', now).slice(0, 15).map(([media, count]) => `| ${media} | ${count} |`).join('\n');
  const prefectureRows = sumCountMaps(runs, 'publishedByPrefecture', now).map(([prefecture, count]) => `| ${prefecture} | ${count} |`).join('\n');
  return [
    '\n## 24時間の取得元健全性',
    '',
    '| 取得元 | 成功/巡回 | 候補数 | 最終成功 | 直近エラー |',
    '|---|---:|---:|---|---|',
    sourceRows || '| 履歴なし | - | - | - | - |',
    '',
    '## 24時間の候補報道元（重複込みの候補件数）',
    '',
    '| 報道元 | 候補数 |',
    '|---|---:|',
    mediaRows || '| 候補なし | 0 |',
    '',
    '## 24時間の掲載地域（都道府県）',
    '',
    '| 地域 | 掲載数 |',
    '|---|---:|',
    prefectureRows || '| 掲載なし | 0 |',
    '',
  ].join('\n');
}

module.exports = { appendRun, sourceHealthTrend, sumCountMaps, normalizeCountMap, markdownTrend, HISTORY_DAYS, MAX_RUNS };
