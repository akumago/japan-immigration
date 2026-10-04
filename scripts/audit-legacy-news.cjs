'use strict';

const fs = require('fs');
const path = require('path');
const gate = require('./lib/ai-gate.cjs');
const fetcher = require('./lib/article-fetcher.cjs');
const ledger = require('./lib/publication-ledger.cjs');
const { classifyLegacyRisk, compareLegacyAuditPriority } = require('./lib/legacy-risk.cjs');

const dataDir = path.join(__dirname, '../data');
const newsPath = process.env.NEWS_DATA_PATH || path.join(dataDir, 'newsData.json');
const queuePath = process.env.NEWS_QUEUE_PATH || path.join(dataDir, 'newsQueue.json');
const cachePath = process.env.ARTICLE_CACHE_PATH || path.join(dataDir, 'articleCache.json');
const reportPath = process.env.LEGACY_AUDIT_PATH || path.join(dataDir, 'legacyAudit.json');
const GATE_VERSION = 'strict-2026-10-02.2';

function parseArgs(args) {
  const out = { limit: 10, fetch: false, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--fetch') out.fetch = true;
    else if (args[i] === '--dry-run') out.dryRun = true;
    else if (args[i] === '--limit') out.limit = Number(args[++i]);
  }
  if (!Number.isFinite(out.limit) || out.limit < 1) throw new Error('--limit must be a positive integer');
  out.limit = Math.min(Math.floor(out.limit), 10);
  return out;
}

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function getText(value) {
  if (typeof value === 'string') return value;
  return value?.sourceBody || value?.text || value?.body || value?.scanResult?.text || '';
}

function storedTextFor(item, queueItems, cacheEntries) {
  const publicUrl = ledger.normalizeUrl(item.url);
  const queued = queueItems.find((candidate) => [candidate.url, candidate.resolvedUrl, ...(candidate.alternateSources || []).map((source) => source.url)]
    .filter(Boolean).some((url) => ledger.normalizeUrl(url) === publicUrl));
  const possibleUrls = [item.url, queued?.url, queued?.resolvedUrl].filter(Boolean);
  for (const url of possibleUrls) {
    const normalized = ledger.normalizeUrl(url);
    const queueText = getText(queued);
    if (queueText.length >= 100) return queueText;
    const cachedText = getText(cacheEntries[normalized]);
    if (cachedText.length >= 100) return cachedText;
  }
  return '';
}

function evaluate(item, bodyText, risk, attemptedAt, previous = null) {
  const attemptCount = (previous?.attemptCount || 0) + 1;
  if (!bodyText || bodyText.length < 100) {
    return {
      id: item.id, url: item.url, date: item.date, title: item.title,
      riskTier: risk.tier, riskReasons: risk.reasons,
      status: 'unavailable', reason: 'article_body_unavailable_or_short',
      attemptCount, nextAttemptAt: attemptCount < 2
        ? new Date(Date.parse(attemptedAt) + 24 * 60 * 60 * 1000).toISOString() : null,
      gateVersion: GATE_VERSION, attemptedAt,
    };
  }
  const result = gate.verifyArticleContent(bodyText, item.title);
  return {
    id: item.id, url: item.url, date: item.date, title: item.title,
    riskTier: risk.tier, riskReasons: risk.reasons,
    status: result.verified ? 'verified' : result.rejected ? 'rejected' : 'insufficient_evidence',
    reason: result.rejectReason || result.pendingReason || null,
    attemptCount,
    nextAttemptAt: null,
    location: result.location,
    audit: result.audit,
    gateVersion: GATE_VERSION,
    attemptedAt,
  };
}

function atomicJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, file);
}

async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (!options.fetch && !options.dryRun) {
    throw new Error('Choose --dry-run (risk counts only) or --fetch (fetch up to --limit articles).');
  }
  const news = loadJson(newsPath, []);
  const queue = loadJson(queuePath, { items: [] });
  const cache = loadJson(cachePath, { entries: {} });
  const prior = loadJson(reportPath, { version: 1, gateVersion: GATE_VERSION, updatedAt: null, items: [] });
  const priorById = new Map((prior.items || []).map((record) => [record.id, record]));
  const pending = news.map((item) => ({ item, risk: classifyLegacyRisk(item), record: priorById.get(item.id) }))
    .filter((entry) => {
      if (!entry.record || entry.record.gateVersion !== GATE_VERSION) return true;
      return entry.record.status === 'unavailable' && (entry.record.attemptCount || 0) < 2
        && Date.parse(entry.record.nextAttemptAt || '') <= Date.now();
    })
    .sort(compareLegacyAuditPriority);
  const counts = pending.reduce((acc, entry) => (acc[entry.risk.tier]++, acc), { high: 0, medium: 0, low: 0 });
  const headlineEligible = pending.filter(({ item }) => gate.verifyHeadlineOnly(item.title).verified).length;
  console.log(`旧記事: ${news.length} 件 / 未監査: ${pending.length} 件 / 見出し合格=${headlineEligible}, 見出し不合格=${pending.length - headlineEligible} / 優先度 high=${counts.high}, medium=${counts.medium}, low=${counts.low}`);
  if (options.dryRun) {
    pending.slice(0, options.limit).forEach(({ item, risk }, index) => {
      const headlineStatus = gate.verifyHeadlineOnly(item.title).verified ? 'headline-pass' : 'headline-fail';
      console.log(`${index + 1}. [${headlineStatus}/${risk.tier}] ${item.date} ${item.title} (${risk.reasons.join(', ')})`);
    });
    return { pending: pending.length, riskCounts: counts };
  }

  const batch = pending.slice(0, options.limit);
  const direct = batch.map(({ item }) => ({ item, body: storedTextFor(item, queue.items || [], cache.entries || {}) }))
    .filter((entry) => entry.body.length < 100);
  const scanner = fetcher.createScanner({
    cachePath,
    concurrency: 1,
    maxPerRun: options.limit,
    googleSpacingMs: 2500,
    domainSpacingMs: 2500,
    verifyArticle: gate.verifyArticleContent,
  });
  if (direct.length) {
    const scanItems = direct.map(({ item }) => ({ url: item.url, title: item.title, forceRefresh: true }));
    const scanSummary = await scanner.scan(scanItems);
    console.log(`本文取得: ${scanSummary.fetched} 件、失敗/保留 ${scanSummary.pending + scanSummary.gaveUp + scanSummary.gone + scanSummary.unavailable} 件`);
    for (let i = 0; i < direct.length; i++) direct[i].body = scanItems[i]._scanResult?.text || '';
    scanner.flush();
  }
  const fetchedByUrl = new Map(direct.map(({ item, body }) => [ledger.normalizeUrl(item.url), body]));
  const now = new Date().toISOString();
  const updated = new Map(priorById);
  for (const { item, risk } of batch) {
    const body = storedTextFor(item, queue.items || [], cache.entries || {}) || fetchedByUrl.get(ledger.normalizeUrl(item.url)) || '';
    updated.set(item.id, evaluate(item, body, risk, now, priorById.get(item.id)));
  }
  const report = {
    version: 1,
    gateVersion: GATE_VERSION,
    updatedAt: now,
    policy: 'audit-only; does not remove, hide, or edit published news',
    items: [...updated.values()].sort((a, b) => String(b.date).localeCompare(String(a.date))),
  };
  atomicJson(reportPath, report);
  const batchCounts = batch.reduce((acc, { item }) => {
    const status = updated.get(item.id)?.status || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  console.log(`監査結果（今回）: ${JSON.stringify(batchCounts)} / 永続記録: ${report.items.length} 件`);
  return report;
}

if (require.main === module) {
  main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { main, parseArgs, storedTextFor, evaluate };
