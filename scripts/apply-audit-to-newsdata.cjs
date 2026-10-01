'use strict';
const fs = require('fs');
const path = require('path');

const NEWS_DATA_PATH = path.resolve(__dirname, '../data/newsData.json');
const QUEUE_PATH = path.resolve(__dirname, '../data/re-audit-queue.json');

const newsData = JSON.parse(fs.readFileSync(NEWS_DATA_PATH, 'utf-8'));
const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));
const queueMap = new Map(queue.items.map((i) => [i.id, i]));

const updatedNewsData = newsData.map((item) => {
  const qItem = queueMap.get(item.id);
  if (!qItem) return item;

  if (qItem.status === 'verified') {
    return {
      ...item,
      auditStatus: 'verified',
      resolvedUrl: qItem.resolvedUrl || item.url,
      evidence: {
        japanCrime: qItem.audit.japanCrime.evidence,
        suspectRole: qItem.audit.suspectRole.evidence,
        foreignNationality: qItem.audit.foreignNationality.evidence
      }
    };
  } else if (qItem.status === 'gave_up') {
    return {
      ...item,
      auditStatus: 'archived_gone',
      auditReason: qItem.pendingReason || 'article_deleted',
      resolvedUrl: qItem.resolvedUrl || null
    };
  } else {
    return {
      ...item,
      auditStatus: 'insufficient_evidence',
      auditReason: qItem.pendingReason || 'evidence_unclear_in_body',
      resolvedUrl: qItem.resolvedUrl || null
    };
  }
});

// アトミック書き込み
const tmpPath = `${NEWS_DATA_PATH}.tmp`;
fs.writeFileSync(tmpPath, JSON.stringify(updatedNewsData, null, 2), 'utf-8');
fs.renameSync(tmpPath, NEWS_DATA_PATH);

console.log(`全${updatedNewsData.length}件を保持したまま、監査メタデータの反映が完了しました。`);
