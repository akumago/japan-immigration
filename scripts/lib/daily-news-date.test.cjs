const test = require('node:test');
const assert = require('node:assert/strict');

let dateUtils;
test('daily news date helper loads', async () => {
  dateUtils = await import('../../lib/dailyNewsDate.js');
});

test('日本時間の日付境界: UTC 15時で翌日に切り替わる', () => {
  assert.equal(dateUtils.japanCalendarDate(new Date('2026-10-01T14:59:59.999Z')), '2026-10-01');
  assert.equal(dateUtils.japanCalendarDate(new Date('2026-10-01T15:00:00.000Z')), '2026-10-02');
});

test('トップ速報: 5日間データから日本時間の当日分だけを返す', () => {
  const items = [
    { id: 'previous-4d', date: '2026-09-28' },
    { id: 'previous-1d', date: '2026-10-01' },
    { id: 'today', date: '2026-10-02' },
    { id: 'tomorrow', date: '2026-10-03' },
    { id: 'undated', date: null },
  ];

  assert.deepEqual(
    dateUtils.filterNewsForJapanDay(items, new Date('2026-10-01T15:00:00.000Z')).map((item) => item.id),
    ['today'],
  );
});

test('トップ速報: 当日0件なら過去5日分を補充表示しない', () => {
  const items = [
    { id: 'yesterday', date: '2026-10-01' },
    { id: 'two-days-ago', date: '2026-09-30' },
  ];
  assert.deepEqual(dateUtils.filterNewsForJapanDay(items, new Date('2026-10-01T15:00:00.000Z')), []);
});
