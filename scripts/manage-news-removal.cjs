'use strict';

const fs = require('fs');
const path = require('path');
const ledger = require('./lib/publication-ledger.cjs');
const { eventFingerprint } = require('./fetch-news.cjs');

function findRelatedArticles(news, article) {
  if (!article) return [];
  const articleEventKey = article.eventKey || eventFingerprint(article);
  return news.filter((item) => item.id === article.id
    || item.followUpOf === article.id || (article.sourceRecordId && item.followUpOf === article.sourceRecordId)
    || (articleEventKey && item.eventKey === articleEventKey));
}

function parseArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id' || args[i] === '--url' || args[i] === '--reason') out[args[i].slice(2)] = args[++i];
  }
  return out;
}

function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (!options.reason || (!options.id && !options.url)) {
    throw new Error('Usage: node scripts/manage-news-removal.cjs --id <article-id> [--url <url>] --reason "why it is removed"');
  }
  const dataDir = path.join(__dirname, '../data');
  const newsPath = path.join(dataDir, 'newsData.json');
  const removedPath = path.join(dataDir, 'removed.json');
  const news = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
  const article = news.find((item) => (options.id && item.id === options.id) || (options.url && ledger.normalizeUrl(item.url) === ledger.normalizeUrl(options.url)));
  if (options.id && !article) throw new Error(`No published article found for id: ${options.id}`);
  const current = ledger.loadLedger(removedPath, 'removed');
  const eventKey = article?.eventKey || (article && eventFingerprint(article)) || null;
  const related = findRelatedArticles(news, article);
  const records = (related.length ? related : [article]).map((item) => ({
    id: item?.id || options.id || null,
    sourceRecordId: item?.sourceRecordId || null,
    url: item?.url || options.url || null,
    title: item?.title || null,
    date: item?.date || null,
    eventKey: item?.eventKey || (item && eventFingerprint(item)) || eventKey,
    reason: options.reason,
    actor: 'manual',
  }));
  const appended = ledger.appendRecords(current, records);
  if (!appended.added) throw new Error('An equivalent removal record already exists; no files changed.');
  ledger.writeLedger(removedPath, appended.ledger);
  if (related.length) {
    const relatedIds = new Set(related.map((item) => item.id));
    const retained = news.filter((item) => !relatedIds.has(item.id));
    const temp = `${newsPath}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(retained, null, 2)}\n`, 'utf8');
    fs.renameSync(temp, newsPath);
  }
  console.log(`Removal tombstone recorded${related.length ? ` and ${related.length} related article(s) removed from newsData.json` : ''}.`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { main, parseArgs, findRelatedArticles };
