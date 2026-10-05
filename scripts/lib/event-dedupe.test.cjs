'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const dedupe = require('./event-dedupe.cjs');

test('地域階層: 愛知県と愛知県名古屋市中区は包含で矛盾しない', () => {
  assert.equal(dedupe.compareLocations('愛知県', '愛知県名古屋市中区'), 'compatible');
});
test('地域階層: 名古屋市中区と名古屋市中村区は矛盾', () => {
  assert.equal(dedupe.compareLocations('名古屋市中区', '名古屋市中村区'), 'conflict');
});
test('地域階層: 愛知県と岐阜県は矛盾', () => {
  assert.equal(dedupe.compareLocations('愛知県', '岐阜県'), 'conflict');
});
test('地域階層: 一方の場所が不明なら不明', () => {
  assert.equal(dedupe.compareLocations('名古屋市中区', '全国'), 'unknown');
});
test('地域階層: 横浜市中区と名古屋市中区は矛盾', () => {
  assert.equal(dedupe.compareLocations('横浜市中区', '名古屋市中区'), 'conflict');
});
test('地域表示: 自治体辞書にない「沖縄県高市」は沖縄県へ正規化し、那覇市は保持する', () => {
  assert.equal(dedupe.normalizeStoredLocation('沖縄県高市'), '沖縄県');
  assert.equal(dedupe.normalizeStoredLocation('沖縄県那覇市'), '沖縄県那覇市');
  assert.equal(dedupe.locationHierarchy({ location: '沖縄県高市' }).locality, null);
});
test('地域階層: 同じ事件の県表示と市区表示は重複候補になり詳細な地域を残す', () => {
  const broad = { id: 'broad', title: '愛知県で住宅窃盗、中国籍の男（30）を逮捕', date: '2026-10-01', location: '愛知県' };
  const specific = { id: 'specific', title: '名古屋市中区の住宅窃盗、中国籍の男（30）を逮捕', date: '2026-10-01', location: '愛知県', audit: { japanCrime: { evidence: '名古屋市中区の住宅で窃盗をしたとして' } } };
  assert.equal(dedupe.compareLocations(broad, specific), 'compatible');
  const healed = dedupe.healRecentDuplicates([broad, specific], { now: Date.parse('2026-10-02T00:00:00Z') });
  assert.equal(healed.items.length, 1);
  assert.equal(healed.items[0].location, '愛知県名古屋市中区');
});
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

test('重複判定: 報道日が4日離れた同一事件も5日窓内で統合候補になる', () => {
  const a = {
    title: '広島県福山市の特殊詐欺事件、中国籍の男（37）を逮捕',
    date: '2026-10-01',
    location: '広島県',
  };
  const b = {
    title: '福山市で特殊詐欺に関与した疑い、中国籍の37歳男を逮捕',
    date: '2026-10-05',
    location: '広島県',
  };

  assert.ok(dedupe.sameEventReason(a, b), '5日窓内の同一事件を媒体違いとして検出する');
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

test('公開中の那覇ホテル強盗殺人: 所属基地の宜野湾市と犯行現場の那覇市が混在しても本文の同一容疑者で統合する', () => {
  const a = {
    title: '強盗殺人容疑で普天間基地の米兵を緊急逮捕 ホテルで女性殺害疑い',
    date: '2026-10-04',
    location: '沖縄県',
    audit: {
      suspectRole: { evidence: '本文抜粋: 沖縄県警は4日、ホテルで女性を殺害し財布を奪ったとして、アメリカ軍普天間基地（宜野湾市）所属の海兵隊上等兵、デビン・ジェイコブ・バラード容疑者（20）を強盗殺人' },
      japanCrime: { evidence: '本文抜粋: 沖縄県警は4日、ホテルで女性を殺害し財布を奪ったとして、アメリカ軍普天間基地（宜野湾市）所属の海兵隊上等兵、デビン・ジェイコブ・バラード容疑者（20）を強盗殺人' },
      foreignNationality: { evidence: '本文抜粋: デビン・ジェイコブ・バラード' },
    },
  };
  const b = {
    title: '【速報】沖縄・那覇市 ホテルに女性遺体 強盗殺人の疑いで米海兵隊員の男逮捕 2026 年 10 月 4 日 07:15',
    date: '2026-10-04',
    location: '沖縄県',
    audit: {
      suspectRole: { evidence: '本文抜粋: 米軍普天間基地所属のアメリカ海兵隊、デビン・ジェイコブ・バラード容疑者（20）は、3日午前2時すぎから午前4時ごろまでの間に、那覇市若狭にあるホテルで屋宜杏奈さ' },
      japanCrime: { evidence: '本文抜粋: 米軍普天間基地所属のアメリカ海兵隊、デビン・ジェイコブ・バラード容疑者（20）は、3日午前2時すぎから午前4時ごろまでの間に、那覇市若狭にあるホテルで屋宜杏奈さ' },
      foreignNationality: { evidence: '本文抜粋: デビン・ジェイコブ・バラード' },
    },
  };
  assert.match(dedupe.sameEventReason(a, b) || '', /容疑者氏名/);
});

test('公開中の実データ: SmartNewsの省略名「デビン・バラード」とテレ朝のフルネームを同一事件として統合する', () => {
  const smartnews = {
    id: 'smartnews-naha',
    title: '那覇のホテル女性殺害、強盗殺人容疑で米兵を逮捕',
    date: '2026-10-04', location: '沖縄県',
    url: 'https://www.smartnews.com/news/article/example',
    audit: {
      suspectRole: { evidence: '本文抜粋: 那覇市のホテルで3日に女性の遺体が見つかった事件で、沖縄県警は4日、強盗殺人の疑いで米軍普天間飛行場（宜野湾市）所属の海兵隊上等兵デビン・バラード容疑者（20）' },
      japanCrime: { evidence: '本文抜粋: 那覇市のホテルで3日に女性の遺体が見つかった事件で、沖縄県警は4日、強盗殺人の疑いで米軍普天間飛行場（宜野湾市）所属の海兵隊上等兵デビン・バラード容疑者（20）' },
      foreignNationality: { evidence: '本文抜粋: デビン・バラード' },
    },
  };
  const tvAsahi = {
    id: 'tv-asahi-naha',
    title: '沖縄・那覇市 ホテルに女性遺体 強盗殺人の疑いで米海兵隊員の男逮捕',
    date: '2026-10-04', location: '沖縄県',
    url: 'https://news.tv-asahi.co.jp/news_society/articles/example.html',
    audit: {
      suspectRole: { evidence: '本文抜粋: 米軍普天間基地所属のアメリカ海兵隊、デビン・ジェイコブ・バラード容疑者（20）は、那覇市若狭にあるホテルで女性を強盗殺人' },
      japanCrime: { evidence: '本文抜粋: 米軍普天間基地所属のアメリカ海兵隊、デビン・ジェイコブ・バラード容疑者（20）は、那覇市若狭にあるホテルで女性を強盗殺人' },
      foreignNationality: { evidence: '本文抜粋: デビン・ジェイコブ・バラード' },
    },
  };

  const result = dedupe.healRecentDuplicates([smartnews, tvAsahi], {
    windowDays: 5,
    now: Date.parse('2026-10-04T12:00:00+09:00'),
    auditOf: (item) => item.audit,
    rank: (url) => url.includes('smartnews.com') ? 1 : 2,
  });

  assert.equal(result.removed.length, 1, '同一容疑者・年齢・罪種・日付・都道府県の重複は一件にまとまる');
  assert.deepEqual(result.items.map((item) => item.id), ['tv-asahi-naha'], '一次報道元を残し、SmartNewsの転載を除く');
});

test('那覇ホテル事件: 被疑者文の名前が途中で切れても国籍根拠の完全名で同一事件を統合する', () => {
  const yomiuri = {
    id: 'naha-yomiuri-truncated-role-name',
    title: '那覇ホテルの女性強盗殺人、米軍普天間飛行場所属の海兵隊員を緊急逮捕',
    date: '2026-10-04', location: '沖縄県',
    audit: {
      suspectRole: { evidence: '本文抜粋: 那覇市のホテルで女性（39）の遺体が見つかった強盗殺人事件で、沖縄県警は4日、米軍普天間飛行場所属の米海兵隊上等兵、デビン・ジェイ' },
      foreignNationality: { evidence: '本文抜粋: デビン・ジェイコブ・バラード' },
    },
  };
  const nnn = {
    id: 'naha-nnn-short-name',
    title: '強盗殺人容疑で米兵逮捕、那覇 ホテルに女性遺体',
    date: '2026-10-04', location: '沖縄県',
    audit: {
      suspectRole: { evidence: '本文抜粋: 那覇市のホテルで女性の遺体が見つかった事件で、沖縄県警は4日、海兵隊上等兵デビン・バラード容疑者（20）を逮捕' },
      foreignNationality: { evidence: '本文抜粋: デビン・バラード' },
    },
  };

  assert.ok(dedupe.sameEventReason(yomiuri, nnn), '名前が省略・途中切れでも他の事件属性が一致すれば重複とする');
  const healed = dedupe.healRecentDuplicates([yomiuri, nnn], {
    now: Date.parse('2026-10-04T12:00:00+09:00'),
  });
  assert.equal(healed.items.length, 1, '同日の同一逮捕報道を一件に統合する');
  assert.equal(healed.removed.length, 1);
});

test('公開レコード形式の那覇ホテル重複: victim ageと容疑者ageの混同・基地所在地の不一致があっても同一人物で統合', () => {
  const yomiuri = {
    id: 'a8c62fc9fced73c5', title: '那覇ホテルの女性強盗殺人、米軍普天間飛行場所属の海兵隊員の男を容疑で緊急逮捕',
    date: '2026-10-04', location: '沖縄県', url: 'https://www.yomiuri.co.jp/national/example',
    evidence: {
      suspect: '本文抜粋: 那覇市のホテルの一室で同市の女性（３９）の遺体が見つかった強盗殺人事件で、沖縄県警は４日、米軍普天間飛行場（沖縄県宜野湾市）所属の米海兵隊上等兵、デビン・ジェイ',
      nationality: '本文抜粋: デビン・ジェイコブ・バラード',
    },
    locationBasis: '本文抜粋: 那覇市のホテルの一室で同市の女性（３９）の遺体が見つかった強盗殺人事件で',
  };
  const nnn = {
    id: 'fe33e0f26444633e', title: '強盗殺人容疑で米兵逮捕、那覇 ホテルに女性遺体',
    date: '2026-10-04', location: '沖縄県', url: 'https://www.nnn.co.jp/articles/example',
    evidence: {
      suspect: '本文抜粋: 那覇市のホテルで３日に女性の遺体が見つかった事件で、沖縄県警は４日、強盗殺人の疑いで米軍普天間飛行場（宜野湾市）所属の海兵隊上等兵デビン・バラード容疑者（２０）',
      nationality: '本文抜粋: デビン・バラード',
    },
    locationBasis: '本文抜粋: 那覇市のホテルで３日に女性の遺体が見つかった事件で',
  };
  assert.match(dedupe.sameEventReason(yomiuri, nnn) || '', /容疑者氏名/);
  const healed = dedupe.healRecentDuplicates([nnn, yomiuri], {
    now: Date.parse('2026-10-05T00:00:00Z'),
    rank: (url) => String(url || '').includes('yomiuri') ? 1 : 0,
  });
  assert.equal(healed.removed.length, 1);
  assert.deepEqual(healed.items.map((item) => item.id), ['a8c62fc9fced73c5']);
});

test('誤統合防止: 別人の同日同県・同じ罪種の事件は容疑者年齢が同じでも統合しない', () => {
  const base = {
    date: '2026-10-04', location: '沖縄県',
    title: '那覇市のホテルで女性を強盗殺人、米海兵隊員の男を逮捕',
    audit: {
      suspectRole: { evidence: '本文抜粋: デビン・ジェイコブ・バラード容疑者（20）は那覇市のホテルで女性を強盗殺人' },
      foreignNationality: { evidence: '本文抜粋: アメリカ海兵隊員' },
    },
  };
  const other = {
    ...base,
    title: '那覇市のホテルで女性を強盗殺人、米海兵隊員の別の男を逮捕',
    audit: {
      suspectRole: { evidence: '本文抜粋: アレックス・ジョン・スミス容疑者（20）は那覇市のホテルで女性を強盗殺人' },
      foreignNationality: { evidence: '本文抜粋: アメリカ海兵隊員' },
    },
  };
  assert.equal(dedupe.sameEventReason(base, other), null);
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

test('誤統合防止: 高類似見出しでも国籍が異なる事件は統合しない', () => {
  const a = {
    title: '東京都新宿区のコンビニで菓子を万引きした疑い、中国籍の男（30）を逮捕',
    date: '2026-10-03',
    location: '東京都',
  };
  const b = {
    title: '東京都新宿区のコンビニで菓子を万引きした疑い、ベトナム国籍の男（30）を逮捕',
    date: '2026-10-03',
    location: '東京都',
  };

  assert.equal(dedupe.sameEventReason(a, b), null,
    '同じ定型見出しでも被疑者の国籍が異なれば別事件として保持する');
});

test('誤統合防止: 高類似見出しでも事件発生市区町村が異なる事件は統合しない', () => {
  const a = {
    title: '東京都新宿区のコンビニで菓子を万引きした疑い、中国籍の男（30）を逮捕',
    date: '2026-10-03',
    location: '東京都',
  };
  const b = {
    title: '東京都足立区のコンビニで菓子を万引きした疑い、中国籍の男（30）を逮捕',
    date: '2026-10-03',
    location: '東京都',
  };

  assert.equal(dedupe.sameEventReason(a, b), null,
    '同一都道府県・同一罪種でも市区町村が異なる事件は統合しない');
});

test('続報方針: 再逮捕・送検・起訴は同一事件として紐付け、別記事として残す', () => {
  const base = {
    title: '東京都新宿区の住宅窃盗でブラジル国籍の男を逮捕',
    date: '2026-10-01', location: '東京都',
    audit: { suspectRole: { evidence: '新宿区の住宅で窃盗をしたとして、ブラジル国籍の山田太郎容疑者を逮捕。' } },
  };
  for (const followupTitle of [
    '東京都新宿区の住宅窃盗でブラジル国籍の男を再逮捕',
    '東京都新宿区の住宅窃盗でブラジル国籍の男を書類送検',
    '東京都新宿区の住宅窃盗でブラジル国籍の男を起訴',
  ]) {
    const followup = { ...base, title: followupTitle, date: '2026-10-02' };
    assert.ok(dedupe.sameEventReason(base, followup), `${followupTitle} は同じ事件と識別する`);
    assert.equal(dedupe.isFollowUp(base, followup), true, `${followupTitle} は初報に続報として紐付ける`);
  }
  const sameDaySyndication = { ...base, title: '東京都新宿区で窃盗容疑、ブラジル国籍の男を逮捕', date: base.date };
  assert.ok(dedupe.sameEventReason(base, sameDaySyndication));
  assert.equal(dedupe.isFollowUp(base, sameDaySyndication), false, '同日配信の見出し差は続報扱いにしない');
});

test('続報照合窓: 30日以内は続報として紐付け、通常の重複窓5日とは分離する', () => {
  const initial = {
    title: '東京都新宿区の住宅窃盗でブラジル国籍の男を逮捕',
    date: '2026-09-01', location: '東京都',
    audit: { suspectRole: { evidence: '東京都新宿区の住宅で窃盗をしたとして、ブラジル国籍の男を逮捕。' } },
  };
  const followup = {
    ...initial,
    title: '東京都新宿区の住宅窃盗でブラジル国籍の男を起訴',
    date: '2026-09-30',
  };
  assert.equal(dedupe.sameEventReason(initial, followup), null, '既定5日間の重複判定では統合しない');
  assert.ok(dedupe.sameEventReason(initial, followup, { maxDays: 30 }), '30日窓では同じ事件と照合する');
  assert.equal(dedupe.isFollowUp(initial, followup), true, '手続き段階が進んだ記事は続報として残せる');
});

test('healRecentDuplicates: 手続段階が進んだ記事を重複統合で消さない', () => {
  const first = { id: 'first', title: '新宿区の窃盗、ブラジル国籍の男を逮捕', date: '2026-10-01', location: '東京都' };
  const followup = { id: 'followup', title: '新宿区の窃盗、ブラジル国籍の男を起訴', date: '2026-10-03', location: '東京都' };
  const result = dedupe.healRecentDuplicates([first, followup]);
  assert.equal(result.items.length, 2);
  assert.equal(result.removed.length, 0);
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

test('同一事件の段階進展: 逮捕から公判・判決へ進んだ記事は統合されず残る', () => {
  const arrest = { id: 'arr', title: '新宿区の空き巣事件、中国籍の男を逮捕', date: '2026-10-01', location: '東京都' };
  const trial = { id: 'tri', title: '新宿区の空き巣事件、中国籍の男の初公判 東京地裁', date: '2026-10-03', location: '東京都' };
  const verdict = { id: 'ver', title: '新宿区の空き巣事件、中国籍の被告に懲役2年の判決 東京地裁', date: '2026-10-05', location: '東京都' };

  assert.equal(dedupe.procedureStage(arrest), '逮捕');
  assert.equal(dedupe.procedureStage(trial), '公判');
  assert.equal(dedupe.procedureStage(verdict), '判決');

  assert.equal(dedupe.isFollowUp(arrest, trial), true, '逮捕→公判は段階進展');
  assert.equal(dedupe.isFollowUp(trial, verdict), true, '公判→判決は段階進展');
  assert.equal(dedupe.isFollowUp(arrest, verdict), true, '逮捕→判決は段階進展');

  const result = dedupe.healRecentDuplicates([arrest, trial, verdict]);
  assert.equal(result.items.length, 3, '段階が進んだ記事はすべて保持される');
  assert.equal(result.removed.length, 0);
});

test('同一事件の同段階・同日重複: 同じ段階の記事は1件に統合される', () => {
  const trial1 = {
    id: 't1', title: '鹿児島 オカヤドカリ密猟 中国籍の男2人の初公判、起訴内容認める 鹿児島地裁',
    date: '2026-10-03', location: '鹿児島県',
    audit: {
      suspectRole: { evidence: '本文抜粋: 種の保存法違反の罪に問われた中国籍の男（32）の初公判が鹿児島地裁で開かれた' },
      foreignNationality: { evidence: '本文抜粋: 中国籍' },
    },
  };
  const trial2 = {
    id: 't2', title: '奄美のオカヤドカリ密猟事件、中国籍の男2人の初公判 鹿児島地裁 検察側が求刑',
    date: '2026-10-03', location: '鹿児島県',
    audit: {
      suspectRole: { evidence: '本文抜粋: 種の保存法違反の罪に問われた中国籍の男（32）に対し、検察は懲役1年を求刑' },
      foreignNationality: { evidence: '本文抜粋: 中国籍' },
    },
  };

  assert.equal(dedupe.procedureStage(trial1), '公判');
  assert.equal(dedupe.procedureStage(trial2), '公判');
  assert.equal(dedupe.isFollowUp(trial1, trial2), false, '同段階は進展ではない');

  const result = dedupe.healRecentDuplicates([trial1, trial2], {
    windowDays: 5,
    now: Date.parse('2026-10-03T12:00:00Z'),
    auditOf: (item) => item.audit,
  });
  assert.equal(result.removed.length, 1, '同段階・同一事件は1件に統合される');
  assert.equal(result.items.length, 1);
});

test('5日窓超えの事件: 窓を超える場合は同一事件理由がnullになり単独記事として扱われる', () => {
  const arrest = { id: 'arr', title: '新宿区の空き巣事件、中国籍の男を逮捕', date: '2026-09-20', location: '東京都' };
  const trial = { id: 'tri', title: '新宿区の空き巣事件、中国籍の男の初公判 東京地裁', date: '2026-10-03', location: '東京都' };

  assert.equal(dedupe.sameEventReason(arrest, trial, { maxDays: 5 }), null, '5日を超えた同一事件は統合理由なし（単独掲載）');
});

test('公開中の茨城ヤード盗品保管報道: 産経とライブドアの同日転載を同一事件と判定', () => {
  const sankei = {
    id: 'e5dbd60280ee4d43', title: 'ヤードで盗難車保管、パキスタン人社長逮捕 中古販売、時価600万円相当 茨城',
    date: '2026-10-05', location: '茨城県',
    evidence: {
      suspect: '本文抜粋: 茨城県警と警視庁など10都府県警の合同捜査班は、車解体の作業場「ヤード」で、盗品と知りながら高級車1台を保管したとして盗品等保管の疑いで、パキスタン国籍の中古車',
      nationality: '本文抜粋: パキスタン国籍',
    },
  };
  const livedoor = {
    id: '78060a82d1ef3a73', title: '盗難車保管疑い社長逮捕、茨城 中古販売のヤード',
    date: '2026-10-05', location: '茨城県',
    evidence: {
      suspect: '本文抜粋: 茨城県警と警視庁など10都府県警の合同捜査班は5日までに、車解体の作業場「ヤード」で、盗品と知りながら高級車1台を保管したとして盗品等保管の疑いで、パキスタン国',
      nationality: '本文抜粋: パキスタン国籍',
    },
  };
  assert.match(dedupe.sameEventReason(sankei, livedoor) || '', /罪種/);
});

test('同一段階の別媒体記事: 茨城ヤード高級車保管事件は見出し表現が違っても同一事件と判定', () => {
  const sankei = {
    id: 'sankei', title: 'ヤードで盗難車保管、パキスタン人社長逮捕 中古販売、時価600万円相当 茨城',
    date: '2026-10-05', location: '茨城県', stage: '逮捕',
    evidence: {
      suspect: '本文抜粋: 茨城県警と警視庁など10都府県警の合同捜査班は、ヤードで盗品と知りながら高級車1台を保管したとして盗品等保管の疑いで、パキスタン国籍の中古車販売会社社長を逮捕',
      nationality: '本文抜粋: パキスタン国籍',
    },
  };
  const localPaper = {
    id: 'local', title: '盗品と知りながら高級車保管 容疑で古河のヤード従業員3人逮捕 茨城県警',
    date: '2026-10-05', location: '茨城県', stage: '逮捕',
    evidence: {
      suspect: '本文抜粋: 茨城県古河市内のヤードで盗品と知りながら高級車を保管したとして、合同捜査班は盗品等保管の疑いでパキスタン国籍の男らを逮捕',
      nationality: '本文抜粋: パキスタン国籍',
    },
  };
  assert.match(dedupe.sameEventReason(sankei, localPaper) || '', /事件固有アンカー/);
  const nextDay = {
    id: 'next-day', title: '盗難高級車保管疑い、逮捕 パキスタン国籍3人、茨城',
    date: '2026-10-04', location: '茨城県', stage: '逮捕',
  };
  assert.match(dedupe.sameEventReason(nextDay, localPaper) || '', /事件固有アンカー/,
    '日付が1日ずれた同一の高級車保管事件も同段階の媒体違いとして照合する');
  const healed = dedupe.healRecentDuplicates([sankei, { ...localPaper, followUp: true }], {
    now: Date.parse('2026-10-05T12:00:00Z'),
  });
  assert.equal(healed.items.length, 1, '同段階のfollowUpフラグがある転載も重複統合する');
});

test('沖縄米兵事件: 同日の送検記事は同段階の媒体重複として統合する', () => {
  const mainichi = {
    id: 'mainichi', title: '強盗殺人容疑で逮捕の米兵を送検 那覇のホテルに女性遺体',
    date: '2026-10-05', location: '沖縄県', stage: '送検',
  };
  const asahi = {
    id: 'asahi', title: '沖縄米兵を強盗殺人容疑で送検 女性の首にひも状の物で絞められた痕',
    date: '2026-10-05', location: '沖縄県', stage: '送検', verificationMode: 'headline_only',
  };
  assert.match(dedupe.sameEventReason(mainichi, asahi) || '', /事件固有アンカー/);
  const healed = dedupe.healRecentDuplicates([mainichi, { ...asahi, followUp: true }], {
    now: Date.parse('2026-10-05T12:00:00Z'),
  });
  assert.equal(healed.items.length, 1);
  const arrest = { ...mainichi, title: '那覇ホテルで女性死亡、米兵を強盗殺人容疑で逮捕', stage: '逮捕' };
  assert.ok(dedupe.sameEventReason(arrest, mainichi), '逮捕から送検の記事は同一事件に紐づく');
  assert.equal(dedupe.isFollowUp(arrest, mainichi), true, '逮捕から送検への段階進展と判定する');
  assert.equal(dedupe.healRecentDuplicates([arrest, mainichi]).items.length, 2,
    '逮捕から送検への段階進展はどちらも残す');
});

test('手続段階: 本文根拠に含まれる過去の公判・逮捕語で見出し段階を誤分類しない', () => {
  const arrest = {
    title: '中国籍の男を窃盗容疑で逮捕', date: '2026-10-01',
    audit: { suspectRole: { evidence: '男は過去の公判で有罪判決を受けていた。今回、窃盗容疑で逮捕された。' } },
  };
  const trial = {
    title: '中国籍の男の初公判、起訴内容を認める', date: '2026-10-03',
    audit: { suspectRole: { evidence: '以前、窃盗容疑で逮捕された男の初公判が開かれた。' } },
  };
  assert.equal(dedupe.procedureStage(arrest), '逮捕');
  assert.equal(dedupe.procedureStage(trial), '公判');
  assert.equal(dedupe.isFollowUp(arrest, trial), true);
  assert.equal(dedupe.procedureStage({ title: '外国籍被告の事件報道' }), null,
    '手続段階語がない見出しに逮捕段階を推測付与しない');
});
