'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const dedupe = require('./event-dedupe.cjs');

// ── 同一事件判定のテスト（統合すべき組） ──

test('福山港の不法上陸・残留（見出し違いの媒体重複）が同一事件と判定される', () => {
  const a = {
    title: '広島・福山港に不法に上陸し、残留した疑い　埼玉県川口市の無職で中国籍の男（４４）を逮捕　容疑を認める',
    date: '2026-10-02',
    location: '広島県',
    audit: { foreignNationality: { evidence: '本文抜粋: 中国籍' } }
  };
  const b = {
    title: '福山港から不法上陸疑い、中国籍の男を逮捕(中国新聞デジタル)',
    date: '2026-10-03',
    location: '広島県',
    audit: { foreignNationality: { evidence: '本文抜粋: 中国籍の埼玉県川口市の無職男（44）' } }
  };
  const reason = dedupe.sameEventReason(a, b);
  assert.ok(reason, '同一事件と判定されるべき');
});

test('長野・上田市の追跡逃走・横転事故（媒体違い）が同一事件と判定される', () => {
  const a = {
    title: 'パトカーが近づくと急に車の進路を変更…停止の求めに応じず赤信号を無視して逃走 派遣社員の男を逮捕 長野・上田市',
    date: '2026-10-03',
    location: '長野県',
    audit: { foreignNationality: { evidence: '本文抜粋: ブラジル国籍で上田市に住む37歳' } }
  };
  const b = {
    title: '車を停止させようとした警官に従わず逃走 赤信号を続けて無視もカーブを曲がり切れず横転 ブラジル国籍の男を道交法違反の疑いで現行犯逮捕【長野・上田市】 (NBS長野放送)',
    date: '2026-10-03',
    location: '長野県'
  };
  const reason = dedupe.sameEventReason(a, b);
  assert.ok(reason, '同一事件と判定されるべき');
});

test('東急東横線の電車内財布スリ（媒体違い）が同一事件と判定される', () => {
  const a = {
    title: '東急東横線の電車内で女性のバッグから財布盗んだ疑い、中国籍の男逮捕　短期滞在ビザで来日し犯行か',
    date: '2026-10-02',
    location: '全国'
  };
  const b = {
    title: '電車内で女性のバッグから財布盗んだ疑い 中国籍の男逮捕 短期滞在ビザで複数回来日',
    date: '2026-10-02',
    location: '全国'
  };
  const reason = dedupe.sameEventReason(a, b);
  assert.ok(reason, '同一事件と判定されるべき');
});

test('雪印メグミルクの偽サプリ販売（媒体違い）が同一事件と判定される', () => {
  const a = {
    title: '「雪印メグミルク」健康サプリ偽物を中国から輸入・販売か　商標法違反の疑いで中国籍の女を逮捕　約150万円売上か　警視庁',
    date: '2026-10-02',
    location: '全国'
  };
  const b = {
    title: '雪印 メグミルクの偽サプリを販売か 38歳女を逮捕',
    date: '2026-10-02',
    location: '全国',
    audit: { foreignNationality: { evidence: '本文抜粋: 中国籍の女' } }
  };
  const reason = dedupe.sameEventReason(a, b);
  assert.ok(reason, '同一事件と判定されるべき');
});

test('沖縄・那覇市の米兵・米海兵隊員強盗殺人事件（媒体違い・肩書違い）が同一事件と判定される', () => {
  const a = {
    title: '那覇遺体 強殺疑いで米兵を逮捕',
    date: '2026-10-04',
    location: '沖縄県',
    audit: {
      japanCrime: { evidence: '本文抜粋: 【速報】米兵を強盗殺人容疑で緊急逮捕 那覇市のホテルでの女性遺体発見で' },
      suspectRole: { evidence: '本文抜粋: 【速報】米兵を強盗殺人容疑で緊急逮捕 那覇市のホテルでの女性遺体発見で' },
      foreignNationality: { evidence: '本文抜粋: 米兵' }
    }
  };
  const b = {
    title: '【速報】沖縄・那覇市 ホテルに女性遺体 強盗殺人の疑いで米海兵隊員の男逮捕 2026 年 10 月 4 日 07:15',
    date: '2026-10-04',
    location: '沖縄県',
    audit: {
      japanCrime: { evidence: '本文抜粋: 米軍普天間基地所属のアメリカ海兵隊、デビン・ジェイコブ・バラード容疑者（20）は、3日午前2時すぎから午前4時ごろまでの間に、那覇市若狭にあるホテルで屋宜杏奈さ' },
      suspectRole: { evidence: '本文抜粋: 米軍普天間基地所属のアメリカ海兵隊、デビン・ジェイコブ・バラード容疑者（20）は、3日午前2時すぎから午前4時ごろまでの間に、那覇市若狭にあるホテルで屋宜杏奈さ' },
      foreignNationality: { evidence: '本文抜粋: デビン・ジェイコブ・バラード' }
    }
  };
  const reason = dedupe.sameEventReason(a, b);
  assert.ok(reason, '米兵とアメリカ海兵隊員はアメリカ国籍として同一事件と判定されるべき');
});

// ── 別事件判定のテスト（誤統合してはならない組） ──

test('別事件: 福岡のギター値札付け替え詐欺 と 愛知の資金洗浄詐欺 は統合されない', () => {
  const a = {
    title: '11万円のギターに安い値札を付け替えてだまし取った疑い　ベトナム国籍の男を逮捕　すでに売却したか「ローンの支払い苦しかった」福岡',
    date: '2026-09-29',
    location: '福岡県'
  };
  const b = {
    title: 'だまし取った現金を資金洗浄の疑い ベトナム国籍の男を逮捕',
    date: '2026-09-29',
    location: '愛知県'
  };
  const reason = dedupe.sameEventReason(a, b);
  assert.equal(reason, null, '別事件として統合されてはならない');
});

test('別事件: ネパール国籍23歳女の不法残留 と ネパール国籍男らの不法残留 は性別相違で統合されない', () => {
  const a = {
    title: '「お金がなく帰れませんでした」23歳ネパール国籍の女を不法残留の疑いで逮捕 在留期限を1か月近く超過',
    date: '2026-09-29',
    location: '福岡県'
  };
  const b = {
    title: '「日本でお金を稼ぐためにネパールに帰りませんでした」不法残留の疑いなどでネパール国籍の男らを逮捕 福岡・南区',
    date: '2026-09-30',
    location: '福岡県'
  };
  const reason = dedupe.sameEventReason(a, b);
  assert.equal(reason, null, '性別が食い違う別事件は統合されてはならない');
});

test('別事件: 広島市安佐南区の会社役員詐欺 と 福山市の37歳男特殊詐欺 は場所・年齢で統合されない', () => {
  const a = {
    title: '詐欺容疑で中国籍の会社役員の男を逮捕 広島',
    date: '2026-09-28',
    location: '広島県'
  };
  const b = {
    title: '特殊詐欺事件に関与した疑い 中国籍の男（37）を逮捕 広島・福山市',
    date: '2026-09-30',
    location: '広島県'
  };
  const reason = dedupe.sameEventReason(a, b);
  assert.equal(reason, null, '別事件として統合されてはならない');
});

test('別事件: 群馬・大泉町の32歳ブラジル国籍男窃盗 と 群馬・前橋市の32歳ブラジル国籍男窃盗 は市区町村相違で統合されない', () => {
  const a = {
    title: '群馬県大泉町の住宅侵入・窃盗容疑、ブラジル国籍の男（32）を現行犯逮捕',
    date: '2026-10-02',
    location: '群馬県'
  };
  const b = {
    title: '前橋市で住宅侵入 ブラジル国籍の男逮捕 100文字記事',
    date: '2026-10-02',
    location: '群馬県',
    audit: { suspectRole: { evidence: '本文抜粋: 前橋署は28日、前橋市の住宅に侵入して金品を盗んだとして、ブラジル国籍の男（32）を' } }
  };
  const reason = dedupe.sameEventReason(a, b);
  assert.equal(reason, null, '同県・同国籍・同年齢・同罪種でも別市町村なら統合されてはならない');
});

// ── healRecentDuplicates（自動修復）のテスト ──

test('healRecentDuplicates: 直近ウィンドウ内の重複を初報に統合し、ウィンドウ外には触れない', () => {
  const items = [
    { id: '1', title: '福山港から不法上陸疑い、中国籍の男を逮捕(中国新聞デジタル)', date: '2026-10-03', url: 'https://example.com/b' },
    { id: '2', title: '広島・福山港に不法に上陸し、残留した疑い　埼玉県川口市の無職で中国籍の男（４４）を逮捕　容疑を認める', date: '2026-10-02', url: 'https://example.com/a' },
    { id: '3', title: '過去の別事件 A', date: '2026-09-20', url: 'https://example.com/old' },
  ];
  const res = dedupe.healRecentDuplicates(items, {
    windowDays: 5,
    now: Date.parse('2026-10-04T00:00:00Z'),
    auditOf: (it) => it.id === '1' ? { foreignNationality: { evidence: '本文抜粋: 中国籍の埼玉県川口市の無職男（44）' } }
                  : it.id === '2' ? { foreignNationality: { evidence: '本文抜粋: 中国籍' } } : null
  });
  assert.equal(res.removed.length, 1);
  assert.equal(res.items.length, 2);
  // 初報（2026-10-02）が残り、後発（2026-10-03）が削除される
  assert.ok(res.items.some((x) => x.id === '2'));
  assert.ok(!res.items.some((x) => x.id === '1'));
  // ウィンドウ外の過去記事は保持される
  assert.ok(res.items.some((x) => x.id === '3'));
});
