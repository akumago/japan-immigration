'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ledger = require('./publication-ledger.cjs');

test('publication ledger: URL parameters and fragments normalize for suppression', () => {
  const record = { url: 'https://example.jp/story?id=4&utm_source=rss#section' };
  const item = { url: 'https://example.jp/story?id=4&ref=portal' };
  assert.ok(ledger.isSuppressed(item, { items: [record] }));
});

test('publication ledger: suppression recognizes IDs and event keys', () => {
  assert.ok(ledger.isSuppressed({ sourceRecordId: 'source-1' }, { items: [{ sourceRecordId: 'source-1' }] }));
  assert.ok(ledger.isSuppressed({ eventKey: 'event-1' }, { items: [{ eventKey: 'event-1' }] }));
});

test('publication ledger: previously merged article is blocked by its exact ID/URL but not a later follow-up sharing eventKey', () => {
  const ledgerData = { items: [{ kind: 'automatic_merge', kept: { id: 'kept-1' }, removed: {
    id: 'removed-1', url: 'https://example.jp/duplicate?utm_source=rss', eventKey: 'event-1',
  } }] };
  assert.ok(ledger.isMergedAway({ id: 'removed-1', url: 'https://example.jp/other' }, ledgerData));
  assert.ok(ledger.isMergedAway({ id: 'other', url: 'https://example.jp/duplicate' }, ledgerData));
  assert.equal(ledger.isMergedAway({ id: 'follow-up', url: 'https://example.jp/follow-up', eventKey: 'event-1' }, ledgerData), undefined,
    '事件キーだけの一致では続報を抑止しない');
});

test('publication ledger: removed event also terminates already-queued candidates', () => {
  const fetchNews = require('../fetch-news.cjs');
  const item = { id: 'q-1', url: 'https://example.test/story', title: '東京都新宿区で窃盗、ブラジル国籍の男を逮捕', status: 'pending', attempts: 0 };
  const queue = [item];
  const removedLedger = { items: [{ eventKey: fetchNews.eventFingerprint(item), reason: 'manual correction' }] };
  const changed = fetchNews.suppressRemovedQueueItems(queue, removedLedger, Date.parse('2026-10-04T00:00:00Z'));
  assert.equal(changed, 1);
  assert.equal(item.status, 'rejected');
  assert.equal(item.rejectReason, 'manual_removal_tombstone');
  assert.equal(item.nextAttemptAt, null);
});

test('merged ledger: RSS source query variant and resolved publisher URL are both suppressed', () => {
  const merged = { items: [{ kind: 'automatic_merge', removed: {
    id: 'old-copy', url: 'https://news.yahoo.co.jp/articles/abc?source=rss',
    resolvedUrl: 'https://publisher.example.jp/story/123',
  } }] };
  assert.ok(ledger.isMergedAway({ id: 'new-id', url: 'https://news.yahoo.co.jp/articles/abc' }, merged));
  assert.ok(ledger.isMergedAway({ id: 'new-id', url: 'https://publisher.example.jp/story/123?source=feed' }, merged));
});

test('publication ledger: appends idempotently and writes atomically readable JSON', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publication-ledger-'));
  const file = path.join(dir, 'merged.json');
  try {
    const one = { removedUrl: 'https://example.jp/a', keptUrl: 'https://example.jp/b', reason: 'test' };
    let result = ledger.appendRecords({ version: 1, items: [] }, [one], '2026-10-04T00:00:00Z');
    assert.equal(result.added, 1);
    result = ledger.appendRecords(result.ledger, [one], '2026-10-04T01:00:00Z');
    assert.equal(result.added, 0);
    ledger.writeLedger(file, result.ledger);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).items, result.ledger.items);
    assert.equal(fs.existsSync(`${file}.tmp`), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
