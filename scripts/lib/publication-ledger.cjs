'use strict';

const fs = require('fs');
const crypto = require('crypto');

function normalizeUrl(value) {
  if (!value || typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|ref|oc|hl|gl|ceid|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/+$/, '');
  } catch (_) {
    return value.trim();
  }
}

function loadLedger(filePath, kind) {
  const fallback = { version: 1, updatedAt: null, items: [] };
  if (!fs.existsSync(filePath)) return fallback;
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(items)) throw new Error(`${kind} ledger must contain an items array: ${filePath}`);
  return { version: Number(parsed.version) || 1, updatedAt: parsed.updatedAt || null, items };
}

function recordKey(record) {
  const identity = [
    record.kind,
    record.id,
    record.sourceRecordId,
    normalizeUrl(record.url || record.removedUrl || record.removed?.url || ''),
    normalizeUrl(record.keptUrl || record.kept?.url || ''),
    record.eventKey,
    record.reason,
  ].filter(Boolean).join('|');
  const stableRecord = { ...record };
  delete stableRecord.recordedAt;
  return crypto.createHash('sha256').update(identity || JSON.stringify(stableRecord)).digest('hex');
}

function appendRecords(ledger, records, now = new Date().toISOString()) {
  const items = ledger.items.slice();
  const keys = new Set(items.map(recordKey));
  let added = 0;
  for (const record of records) {
    const key = recordKey(record);
    if (keys.has(key)) continue;
    items.push({ ...record, recordedAt: record.recordedAt || now });
    keys.add(key);
    added++;
  }
  return { ledger: { version: 1, updatedAt: now, items }, added };
}

function writeLedger(filePath, ledger) {
  fs.mkdirSync(require('path').dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function isSuppressed(item, ledger) {
  const urls = new Set([item.url, item.resolvedUrl, ...(item.alternateSources || []).map((source) => source.url)]
    .filter(Boolean).map(normalizeUrl));
  return ledger.items.find((entry) =>
    (entry.id && (entry.id === item.id || entry.id === item.sourceRecordId))
    || (entry.sourceRecordId && entry.sourceRecordId === item.sourceRecordId)
    || (entry.url && urls.has(normalizeUrl(entry.url)))
    || (entry.eventKey && entry.eventKey === item.eventKey));
}

module.exports = { normalizeUrl, loadLedger, recordKey, appendRecords, writeLedger, isSuppressed };
