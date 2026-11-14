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

  // 0. 社説・解説・オピニオン・ワイドショー私見および背景外国人誤爆記事の自動排除（ai-gate reject安全網）
  const removedPath = path.join(path.dirname(newsDataPath), 'removed.json');
  const rejectRecords = [];
  let metadataFixedCount = 0;
  const PAST_BG_EVIDENCE_RE = /(?:＝|=|（|\()[^＝=）)]*?(?:起訴|公判中|受刑者|実刑|有罪)[^＝=）)]*?(?:＝|=|）|\))[^。]*?を逮捕し|(?:＝|=|（|\()[^＝=）)]*?(?:起訴|公判中|受刑者|実刑|有罪)[^＝=）)]*?(?:＝|=|）|\))(?:ら|など)?と共謀し|を逮捕し、[^。]*?(?:処分先|売却先|買い取り先|関与|同社|男ら|容疑者ら)が浮上|(?:\d+月|昨年|おととし|過去|以前)にも[^。]{0,50}?(?:被害|事件)が(?:あり|発生し|起き)[^。]{0,45}?(?:逮捕され(?:た|ている)|起訴され(?:た|ている))/;
  const LOCATION_CORRECTIONS = {
    '7a749a757426': '静岡県',
    '4ff3ce111348': '群馬県',
    'a06861197beb096b': '大阪府',
    'd4b36f9e9715c9e3': '群馬県',
    'e3155921f1a7': '兵庫県',
  };
  for (const item of raw) {
    const text = [item.locationBasis, item.evidence && item.evidence.suspect ? item.evidence.suspect : '', item.summary || '']
      .filter(Boolean)
      .join(' ')
      .replace(/^(?:本文抜粋|見出し根拠|見出し・本文統合根拠|国内捜査・司法機関管轄根拠)\s*[:：]\s*/g, '');
    const suspectOnly = String(item.evidence && item.evidence.suspect ? item.evidence.suspect : '')
      .replace(/^(?:本文抜粋|見出し根拠|見出し・本文統合根拠|国内捜査・司法機関管轄根拠)\s*[:：]\s*/g, '');
    const check = aiGate.verifyArticleContent(text, item.title);
    const suspectCheck = suspectOnly ? aiGate.verifyArticleContent(suspectOnly, item.title) : { rejected: false };
    const suspectOccs = suspectOnly ? aiGate.natOccurrences(suspectOnly) : [];
    const allVictimOrNonSuspect = suspectOccs.length > 0 && suspectOccs.every((o) => !o.suspect);
    const isPastBgOnly = Boolean(suspectOnly && PAST_BG_EVIDENCE_RE.test(suspectOnly) && !aiGate.NAT_RE.test(String(item.title || '')));
    const isGossipNonCrimeTitle = /^《[^》]+》/.test(String(item.title || '')) && !aiGate.CRIME_RE.test(String(item.title || ''));
    if (check.rejected || suspectCheck.rejected || allVictimOrNonSuspect || isPastBgOnly || isGossipNonCrimeTitle || (!check.verified && /(?:偽造依頼|家宅捜索した際)/.test(text))) {
      const reason = check.rejectReason || suspectCheck.rejectReason || (isGossipNonCrimeTitle ? 'editorial_or_opinion' : allVictimOrNonSuspect ? 'victim_or_non_suspect_foreigner' : 'suspect_is_japanese_or_background_foreigner');
      logger.log(`🚫 オピニオン・非対象記事を除外 [${reason}]: ${item.title}`);
      drop.add(item);
      rejectRecords.push({ kind: 'automatic_reject', url: item.url || null, item: ref(item), reason });
      continue;
    }

    // 既存レコードの見出し・地域・手続段階・罪種カテゴリ・インラインタグ・定型文サマリーの自動補正
    let changed = false;
    const cleanedTitle = String(item.title || '').replace(/(?:\s*[|｜]\s*[^|｜]{1,35})+$/, '').replace(/[:：]地域ニュース$/, '').trim();
    if (cleanedTitle && cleanedTitle !== item.title) {
      item.title = cleanedTitle;
      changed = true;
    }
    if (LOCATION_CORRECTIONS[item.id] && item.location !== LOCATION_CORRECTIONS[item.id]) {
      item.location = LOCATION_CORRECTIONS[item.id];
      item.prefecture = LOCATION_CORRECTIONS[item.id];
      changed = true;
    }
    const titleStage = aiGate.determineStage(item.title || '');
    if (titleStage && item.stage !== titleStage && ['873f8e180b8a', '95f9a343b9f98c6b', 'f0ee4ce72331'].includes(item.id)) {
      item.stage = titleStage;
      changed = true;
    }
    if (item.crimeCategory === 'その他刑事事件' || item.crimeCategory === '万引き・ドラッグストア大量窃盗' || (item.crimeCategory === '性犯罪・わいせつ' && /(?:問題|試験|学科)/.test(item.title || ''))) {
      const reCat = aiGate.extractCrimeCategories(`${item.title || ''} ${item.evidence?.suspect || ''} ${item.locationBasis || ''}`)[0];
      if (reCat && reCat !== item.crimeCategory) {
        item.crimeCategory = reCat;
        changed = true;
      }
    }
    if (item.locationBasis && /【写真を見る】|【画像】|写真拡大/.test(item.locationBasis)) {
      item.locationBasis = item.locationBasis.replace(/(?:【写真を見る】|【画像】|写真拡大)\s*/g, '');
      changed = true;
    }
    if (/本文の文脈結合で確認した報道です|、(?:起訴状|逮捕容疑)/.test(String(item.summary || ''))) {
      const cleanExc = (s) => String(s || '')
        .replace(/^(?:本文抜粋|見出し根拠|見出し・本文統合根拠|国内捜査・司法機関管轄根拠)\s*[:：]\s*/, '')
        .replace(/^(?:【[^】]{1,20}】\s*|写真拡大\s*|[〉>≫]\s*[^。]{5,70}?ほか\s*)+/, '')
        .replace(/^[^。]*?、(?=(?:起訴状|逮捕容疑|再逮捕容疑|送検容疑|警察|県警|府警|道警|警視庁)(?:など)?によ(?:ると|りますと))/, '')
        .trim();
      const s1 = cleanExc(item.evidence?.suspect);
      const s2 = cleanExc(item.locationBasis);
      const parts = [];
      if (s1 && s1 !== item.title && /[。！？）」』]$/.test(s1)) parts.push(s1);
      if (s2 && s2 !== s1 && s2 !== item.title && /[。！？）」』]$/.test(s2)) parts.push(s2);
      if (parts.length > 0 && parts.join('').length >= 35) {
        item.summary = parts.join('');
      } else {
        const cleanSum = cleanExc(item.summary);
        if (!/本文の文脈結合で確認した報道です/.test(cleanSum) && cleanSum.length >= 35) {
          item.summary = cleanSum;
        } else {
          const bareTitle = String(item.title || '').replace(/。+$/, '');
          item.summary = `${bareTitle}。（${item.location || '国内'}・${item.nationality || '外国籍'}被疑者の${item.stage || '逮捕'}報道）`;
        }
      }
      changed = true;
    }
    if (changed) metadataFixedCount++;
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
  logger.log(`🔎 重複検査: ${raw.length} 件 → ${result.length} 件（統合 ${removedCount} 件 / 品質補正 ${metadataFixedCount} 件）`);
  if ((removedCount === 0 && metadataFixedCount === 0) || dryRun) return { before: raw.length, after: result.length, removed: removedCount, written: false };

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
