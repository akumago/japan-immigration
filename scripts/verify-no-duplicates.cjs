'use strict';
/**
 * verify-no-duplicates.cjs — 公開直前の重複ゲート
 *
 * data/newsData.json に重複が1件でも残っていれば異常終了(exit 1)し、ビルド・デプロイを止める。
 *   - 同一URL かつ 同一見出し（同じ警察ページに別事件を載せる公式発表は見出しが違うので対象外）
 *   - 同日・同一正規化見出し
 *   - 同一事件・同一手続段階（event-dedupe.sameEventReason、続報は除く）
 *
 * 使い方: node scripts/verify-no-duplicates.cjs
 * 環境変数: NEWS_DATA_PATH
 */
const fs = require('fs');
const path = require('path');
const eventDedupe = require('./lib/event-dedupe.cjs');
const { normalizeArticleUrl } = require('./fetch-news.cjs');
const { normTitle } = require('./dedupe-newsdata.cjs');

function findDuplicates(items) {
  const problems = [];
  const byUrlTitle = new Map();
  const byDateTitle = new Map();
  for (const item of items) {
    const t = normTitle(item.title);
    if (item.url && t) {
      const k = `${normalizeArticleUrl(item.url)}|${t}`;
      if (byUrlTitle.has(k)) problems.push({ type: 'same_url_and_title', a: byUrlTitle.get(k), b: item });
      else byUrlTitle.set(k, item);
    }
    if (t.length >= 8 && item.date) {
      const k = `${item.date}|${t}`;
      if (byDateTitle.has(k)) problems.push({ type: 'same_date_and_title', a: byDateTitle.get(k), b: item });
      else byDateTitle.set(k, item);
    }
  }
  const sigs = items.map((item) => ({ item, sig: eventDedupe.signals(item) }));
  for (let i = 0; i < sigs.length; i++) {
    for (let j = i + 1; j < sigs.length; j++) {
      const a = { ...sigs[i].item, _sig: sigs[i].sig };
      const b = { ...sigs[j].item, _sig: sigs[j].sig };
      const reason = eventDedupe.sameEventReason(a, b);
      if (!reason) continue;
      const sameStage = eventDedupe.procedureStage(sigs[i].item) === eventDedupe.procedureStage(sigs[j].item);
      const followUp = eventDedupe.isFollowUp(sigs[i].item, sigs[j].item) || eventDedupe.isFollowUp(sigs[j].item, sigs[i].item);
      if (!followUp) problems.push({ type: `same_event(${reason})`, a: sigs[i].item, b: sigs[j].item });
    }
  }
  // 【独立チェック】統合ロジック（罪種辞書・国籍辞書）とは別の物差しで再検査する。
  // 同じロジックで自己採点すると、辞書漏れの重複を「重複なし」と誤合格させてしまうため。
  // 見出しの文字2-gram類似度が非常に高く（0.75以上）、3日以内・国籍が矛盾しないものは重複とみなす。
  const bigrams = (s) => { const g = new Set(); for (let k = 0; k < s.length - 1; k++) g.add(s.slice(k, k + 2)); return g; };
  const titles = items.map((item) => { const t = normTitle(item.title); return { t, g: bigrams(t) }; });
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (titles[i].t.length < 12 || titles[j].t.length < 12) continue;
      if (Math.abs(Date.parse(items[i].date) - Date.parse(items[j].date)) / 86400000 > 3) continue;
      const A = titles[i].g; const B = titles[j].g;
      let n = 0; for (const x of A) if (B.has(x)) n++;
      const sim = (2 * n) / (A.size + B.size);
      if (sim < 0.75) continue;
      const na = sigs[i].sig.nats; const nb = sigs[j].sig.nats;
      if (na.size && nb.size && ![...na].some((x) => nb.has(x))) continue;
      if (eventDedupe.isFollowUp(items[i], items[j]) || eventDedupe.isFollowUp(items[j], items[i])) continue;
      if (problems.some((p) => (p.a === items[i] && p.b === items[j]) || (p.a === items[j] && p.b === items[i]))) continue;
      problems.push({ type: `independent_title_similarity(${sim.toFixed(2)})`, a: items[i], b: items[j] });
    }
  }
  return problems;
}

if (require.main === module) {
  const newsDataPath = process.env.NEWS_DATA_PATH || path.join(__dirname, '../data/newsData.json');
  const items = JSON.parse(fs.readFileSync(newsDataPath, 'utf8'));
  const problems = findDuplicates(items);
  if (problems.length) {
    console.error(`::error::重複記事が ${problems.length} 組残っています。公開を中止します。`);
    problems.forEach((p) => console.error(`  [${p.type}]\n    A: ${p.a.date} ${p.a.title}\n    B: ${p.b.date} ${p.b.title}`));
    process.exit(1);
  }
  console.log(`✅ 重複なし（${items.length} 件を検査）`);
}

module.exports = { findDuplicates };
