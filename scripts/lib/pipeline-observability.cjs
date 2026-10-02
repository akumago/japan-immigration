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

function appendRun(history, run, now = Date.now()) {
  const runs = Array.isArray(history?.runs) ? history.runs.slice() : [];
  const record = {
    startedAt: run.startedAt || new Date(now).toISOString(),
    completedAt: run.completedAt || new Date(now).toISOString(),
    sources: (run.sources || []).map(normalizeSource),
    counts: Object.fromEntries(Object.entries(run.counts || {}).map(([key, value]) => [key, Number(value) || 0])),
  };
  runs.push(record);
  const cutoff = now - HISTORY_DAYS * 24 * 60 * 60 * 1000;
  const retained = runs.filter((item) => {
    const time = Date.parse(item.completedAt || '');
    return Number.isFinite(time) && time >= cutoff && time <= now + 10 * 60 * 1000;
  }).slice(-MAX_RUNS);
  return { version: 1, updatedAt: new Date(now).toISOString(), runs: retained };
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

function markdownTrend(trend) {
  if (!trend.length) return '\n## 24時間の取得元健全性\n\n直近24時間の履歴はまだありません。\n';
  const rows = trend.map((row) => `| ${row.id} | ${row.successes}/${row.attempts} (${Math.round(row.successRate * 100)}%) | ${row.candidates} | ${row.lastSuccessAt || 'なし'} | ${row.lastError || ''} |`).join('\n');
  return `\n## 24時間の取得元健全性\n\n| 取得元 | 成功/巡回 | 候補数 | 最終成功 | 直近エラー |\n|---|---:|---:|---|---|\n${rows}\n`;
}

module.exports = { appendRun, sourceHealthTrend, markdownTrend, HISTORY_DAYS, MAX_RUNS };
