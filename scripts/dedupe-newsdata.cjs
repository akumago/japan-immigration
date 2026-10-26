'use strict';
/**
 * dedupe-newsdata.cjs — 公開直前の重複統合（安全網）
 *
 * data/newsData.json に対して次を実行する。
 *   1. 同一URL かつ 同一見出し の完全重複
 *   2. 同日・同一正規化見出し（短い見出しも対象）
 *   3. 同一事件の媒体違い転載（event-dedupe.healRecentDuplicates、続報は残す）
 * 統合した記事は data/merged.json に記録し、次回以降の再掲載を抑止する。
 * 変更が無ければ newsData.json を書き換えない（差分ゼロ保護）。
 *
 * 使い方: node scripts/dedupe-newsdata.cjs [--dry-run]
 * 環境変数: NEWS_DATA_PATH / MERGED_PATH
 */
const fs = require('fs');
const path = require('path');
const eventDedupe = require('./lib/event-dedupe.cjs');
const publicationLedger = require('./lib/publication-ledger.cjs');
const fetchNews = require('./fetch-news.cjs');
const aiGate = require('./lib/ai-gate.cjs');

// 対象は全期間（同一事件判定のペア距離は event-dedupe 側で5日以内に限られるため誤統合は増えない）。
// verify-no-duplicates.cjs が全件を検査するので、統合側も同じ範囲を対象にして取りこぼしを防ぐ。
const WINDOW_DAYS = 3650;

function normTitle(title) {
  return String(title || '').normalize('NFKC')
    .replace(/\s*\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日\s*\d{1,2}:\d{2}\s*$/, '')
    .replace(/\s*\d+\s*(?:分|時間|日)前\s*$/, '')
    // 末尾の媒体名「(テレビ愛知)」「（神戸新聞NEXT）」や途切れた「(」（年齢「（37）」は残す）
    .replace(/\s*[（(](?!\d{1,3}[）)])[^（）()]{0,30}[）)]?\s*$/, '')
    .replace(/[\s「」『』【】・、。！？!?：:＝=～〜\-‐…“”"']/g, '');
}

function ref(item) {
  return { id: item.id || null, sourceRecordId: item.sourceRecordId || null, title: item.title || null,
    date: item.date || null, url: item.url || null };
}

function run({ newsDataPath, mergedPath, dryRun = false, now = Date.now(), logger = console } = {}) {
  const raw = JSON.parse(fs.readFileSync(newsDataPath, 'utf8'));
  const records = [];
  const drop = new Set();
  const rank = (url) => fetchNews.publicationSourceRank(url);
  const better = (x, y) => rank(x.url) > rank(y.url)
    || (rank(x.url) === rank(y.url) && String(x.date) > String(y.date));

  // 0. 社説・解説・オピニオンおよび非対象記事の自動排除（ai-gate reject安全網）
  const removedPath = path.join(path.dirname(newsDataPath), 'removed.json');
  const rejectRecords = [];
  for (const item of raw) {
    const text = (item.evidence && item.evidence.suspect ? item.evidence.suspect : '') + ' ' + (item.summary || '');
    const check = aiGate.verifyArticleContent(text, item.title);
    if (check.rejected) {
      logger.log(`🚫 オピニオン・非対象記事を除外 [${check.rejectReason}]: ${item.title}`);
      drop.add(item);
      rejectRecords.push({ kind: 'automatic_reject', item: ref(item), reason: check.rejectReason });
    }
  }
  if (rejectRecords.length > 0 && !dryRun && fs.existsSync(removedPath)) {
    const remLedger = publicationLedger.loadLedger(removedPath, 'removed');
    const app = publicationLedger.appendRecords(remLedger, rejectRecords);
    if (app.added) publicationLedger.writeLedger(removedPath, app.ledger);
  }

  // 1-2. 完全重複（同一URL+同一見出し／同一見出しが±3日以内に再掲）
  // 媒体が日付をまたいで同じ見出しを転載するケース（10/15と10/16に同一見出し）を確実に1件へ。
  // 警察発表の定型見出し（「窃盗事件で男を逮捕（○○署）」）の誤統合を防ぐため15文字以上に限定。
  const seen = new Map();
  const byTitle = new Map();
  const dayDiff = (x, y) => Math.abs(Date.parse(x.date) - Date.parse(y.date)) / 86400000;
  for (const item of raw) {
    if (drop.has(item)) continue;
    const keys = [];
    const t = normTitle(item.title);
    if (item.url && t) keys.push(`u|${fetchNews.normalizeArticleUrl(item.url)}|${t}`);
    if (t.length >= 8 && item.date) keys.push(`h|${item.date}|${t}`);
    let kept = null;
    for (const k of keys) if (seen.has(k)) { kept = seen.get(k); break; }
    if (!kept && t.length >= 15) kept = (byTitle.get(t) || []).find((x) => !drop.has(x) && dayDiff(x, item) <= 14) || null;
    if (!kept) {
      keys.forEach((k) => seen.set(k, item));
      if (t.length >= 15) byTitle.set(t, [...(byTitle.get(t) || []), item]);
      continue;
    }
    const winner = better(item, kept) ? item : kept;
    const loser = winner === item ? kept : item;
    drop.add(loser);
    keys.forEach((k) => seen.set(k, winner));
    if (t.length >= 15) byTitle.set(t, [...(byTitle.get(t) || []).filter((x) => x !== loser), winner]);
    records.push({ kind: 'automatic_merge', kept: ref(winner), removed: ref(loser), reason: 'exact_duplicate_headline_or_url' });
  }
  const afterExact = raw.filter((x) => !drop.has(x));

  // 3. 同一事件の媒体違い転載
  const healed = eventDedupe.healRecentDuplicates(afterExact, { windowDays: WINDOW_DAYS, now, rank });
  healed.removed.forEach((r) => {
    logger.log(`🧹 同一事件を統合 [${r.reason}] 残: ${r.kept} / 消: ${r.removed}`);
    records.push({ kind: 'automatic_merge', kept: ref(r.keptItem), removed: ref(r.removedItem), reason: r.reason });
  });

  const result = healed.items;
  const removedCount = raw.length - result.length;
  logger.log(`🔎 重複検査: ${raw.length} 件 → ${result.length} 件（統合 ${removedCount} 件）`);
  if (removedCount === 0 || dryRun) return { before: raw.length, after: result.length, removed: removedCount, written: false };

  fs.writeFileSync(newsDataPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  if (mergedPath) {
    const ledger = publicationLedger.loadLedger(mergedPath, 'merged');
    const appended = publicationLedger.appendRecords(ledger, records);
    if (appended.added) publicationLedger.writeLedger(mergedPath, appended.ledger);
  }
  return { before: raw.length, after: result.length, removed: removedCount, written: true };
}

if (require.main === module) {
  const newsDataPath = process.env.NEWS_DATA_PATH || path.join(__dirname, '../data/newsData.json');
  const mergedPath = process.env.MERGED_PATH || path.join(__dirname, '../data/merged.json');
  run({ newsDataPath, mergedPath, dryRun: process.argv.includes('--dry-run') });
}

module.exports = { run, normTitle };
