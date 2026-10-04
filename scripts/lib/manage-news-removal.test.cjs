'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { findRelatedArticles } = require('../manage-news-removal.cjs');

test('manual removal: initial report includes linked follow-ups and same-event coverage', () => {
  const initial = {
    id: 'initial', sourceRecordId: 'source-initial', date: '2026-10-01', location: '東京都',
    title: '新宿区の住宅窃盗 ブラジル国籍の男を逮捕',
    audit: {
      suspectRole: { evidence: '東京都新宿区の住宅で窃盗をしたとして、ブラジル国籍の男を逮捕しました。' },
      foreignNationality: { evidence: 'ブラジル国籍' },
    },
  };
  const followup = {
    id: 'followup', sourceRecordId: 'source-followup', date: '2026-10-03', location: '東京都',
    title: '新宿区の住宅窃盗 ブラジル国籍の男を起訴', followUp: true, followUpOf: 'source-initial',
    audit: initial.audit,
  };
  const unrelated = {
    id: 'unrelated', date: '2026-10-02', location: '東京都',
    title: '新宿区の別の住宅窃盗 ブラジル国籍の男を逮捕',
  };

  const related = findRelatedArticles([initial, followup, unrelated], initial);
  assert.deepEqual(related.map((item) => item.id), ['initial', 'followup']);
});
