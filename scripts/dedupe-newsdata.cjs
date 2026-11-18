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
const articleFetcher = require('./lib/article-fetcher.cjs');

const DOMAIN_MEDIA_MAP = [
  [/news\.yahoo\.co\.jp/i, 'Yahoo!ニュース'],
  [/news\.ntv\.co\.jp|nnn\.co\.jp/i, '日テレNEWS NNN'],
  [/newsdig\.tbs\.co\.jp/i, 'TBS NEWS DIG'],
  [/fnn\.jp/i, 'FNNプライムオンライン'],
  [/news\.tv-asahi\.co\.jp/i, 'テレ朝NEWS'],
  [/nhk\.or\.jp/i, 'NHKニュース'],
  [/yomiuri\.co\.jp/i, '読売新聞'],
  [/asahi\.com/i, '朝日新聞'],
  [/mainichi\.jp/i, '毎日新聞'],
  [/sankei\.com/i, '産経新聞'],
  [/kyodo\.co\.jp/i, '共同通信'],
  [/47news\.jp/i, '47NEWS'],
  [/jiji\.com/i, '時事通信'],
  [/news\.livedoor\.com/i, 'ライブドアニュース'],
  [/sannichi\.co\.jp/i, '山梨日日新聞'],
  [/shimotsuke\.co\.jp/i, '下野新聞'],
  [/kahoku\.news/i, '河北新報'],
  [/sanspo\.com/i, 'サンスポ'],
  [/ktv\.jp/i, 'カンテレ'],
  [/fukui-tv\.co\.jp/i, '福井テレビ'],
  [/nagoyatv\.com/i, 'メ〜テレ'],
  [/jomo-news\.co\.jp/i, '上毛新聞'],
  [/niikei\.jp/i, 'にいがた経済新聞'],
  [/chiba-tv\.com/i, 'チバテレ'],
  [/kbc\.co\.jp/i, 'KBC九州朝日放送'],
  [/satv\.co\.jp/i, '静岡朝日テレビ'],
  [/fmgunma\.com/i, 'FM GUNMA'],
  [/saga-s\.co\.jp/i, '佐賀新聞'],
  [/topics\.smt\.docomo\.ne\.jp/i, 'dメニューニュース'],
  [/infoseek\.co\.jp/i, 'Infoseekニュース'],
  [/excite\.co\.jp/i, 'エキサイトニュース'],
  [/msn\.com/i, 'MSNニュース'],
  [/thaich\.net/i, 'タイランドハイパーリンクス'],
  [/coki\.jp/i, 'coki'],
  [/shueisha\.online/i, '集英社オンライン'],
  [/funabashi-tsushin\.com/i, '船橋つうしん'],
  [/police\.pref\.chiba\.jp/i, '千葉県警察'],
  [/pref\.shizuoka\.jp/i, '静岡県警察'],
  [/^t\.co$/i, '国内報道機関'],
];

const SPEC_NAT_MAP = [
  [/ペルー/i, 'ペルー国籍'],
  [/スリランカ/i, 'スリランカ国籍'],
  [/ベトナム|ヴィエトナム/i, 'ベトナム国籍'],
  [/中国|中華人民共和国/i, '中国籍'],
  [/台湾/i, '台湾籍'],
  [/韓国|大韓民国/i, '韓国籍'],
  [/北朝鮮|朝鮮籍/i, '北朝鮮籍'],
  [/ブラジル/i, 'ブラジル国籍'],
  [/フィリピン/i, 'フィリピン国籍'],
  [/トルコ|クルド/i, 'トルコ国籍'],
  [/インドネシア/i, 'インドネシア国籍'],
  [/カンボジア/i, 'カンボジア国籍'],
  [/ネパール/i, 'ネパール国籍'],
  [/パキスタン/i, 'パキスタン国籍'],
  [/ミャンマー/i, 'ミャンマー国籍'],
  [/タイ(?:人|国籍|籍|出身)/i, 'タイ国籍'],
  [/イラン/i, 'イラン国籍'],
  [/米国|アメリカ|米兵|米軍/i, '米国籍'],
];

function resolveNormalizedMedia(currentMedia, url) {
  for (const [re, label] of DOMAIN_MEDIA_MAP) {
    if (re.test(String(url || ''))) return label;
  }
  for (const [re, label] of DOMAIN_MEDIA_MAP) {
    if (re.test(String(currentMedia || ''))) return label;
  }
  if (/MSNニュース/i.test(String(currentMedia || ''))) return 'MSNニュース';
  return currentMedia || '国内報道機関';
}

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
  const dataDir = path.dirname(newsDataPath);
  const removedPath = path.join(dataDir, 'removed.json');
  const qById = new Map();
  const qByNorm = new Map();
  for (const qFile of ['newsQueue.json', 're-audit-queue.json']) {
    const qp = path.join(dataDir, qFile);
    if (!fs.existsSync(qp)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(qp, 'utf8'));
      const list = Array.isArray(parsed) ? parsed : (parsed.items || []);
      for (const src of list) {
        if (src.id) {
          const prev = qById.get(src.id);
          if (!prev || (!prev.audit?.suspectRole?.evidence && src.audit?.suspectRole?.evidence) || ((!prev.resolvedUrl || prev.resolvedUrl.includes('news.google.com')) && src.resolvedUrl && !src.resolvedUrl.includes('news.google.com'))) {
            qById.set(src.id, src);
          }
        }
        const nt = normTitle(src.title);
        if (nt) {
          const prev = qByNorm.get(nt);
          if (!prev || (!prev.audit?.suspectRole?.evidence && src.audit?.suspectRole?.evidence) || ((!prev.resolvedUrl || prev.resolvedUrl.includes('news.google.com')) && src.resolvedUrl && !src.resolvedUrl.includes('news.google.com'))) {
            qByNorm.set(nt, src);
          }
        }
      }
    } catch {
      // ignore invalid cache files in test environments
    }
  }

  const validCategories = new Set(aiGate.CRIME_CATEGORIES.map((c) => c.category));
  const rejectRecords = [];
  let metadataFixedCount = 0;
  const PAST_BG_EVIDENCE_RE = /(?:＝|=|（|\()[^＝=）)]*?(?:起訴|公判中|受刑者|実刑|有罪)[^＝=）)]*?(?:＝|=|）|\))[^。]*?を逮捕し|(?:＝|=|（|\()[^＝=）)]*?(?:起訴|公判中|受刑者|実刑|有罪)[^＝=）)]*?(?:＝|=|）|\))(?:ら|など)?と共謀し|を逮捕し、[^。]*?(?:処分先|売却先|買い取り先|関与|同社|男ら|容疑者ら)が浮上|事件では、[、，\s]*(?:直後に|これまでに|すでに)?[^。]*?が逮捕され|(?:\d+月|昨年|おととし|過去|以前)にも[^。]{0,50}?(?:被害|事件)が(?:あり|発生し|起き)[^。]{0,45}?(?:逮捕され(?:た|ている)|起訴され(?:た|ている))/;
  const LOCATION_CORRECTIONS = {
    '7a749a757426': '静岡県',
    '4ff3ce111348': '群馬県',
    'a06861197beb096b': '大阪府',
    'd4b36f9e9715c9e3': '群馬県',
    'e3155921f1a7': '兵庫県',
    '1a2f3c715e0f': '高知県',
    '73224bb23ef7': '新潟県',
    '64d172d430cfaf4e': '福岡県',
    'c3173f2e7c32': '群馬県',
    'b1a3c27f131d17cf': '東京都',
    '10d7c8c4a7c2549e': '東京都',
    'b2da7d5b2749d0f5': '福島県',
    'dc34c7dbf36c92a2': '千葉県',
    '988c374935310ca7': '岡山県',
    '321d5559a30c0790': '愛知県',
    '05a9ae1ce36169f6': '鳥取県',
    '1e56307e710ad8c0': '兵庫県',
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

    // 既存レコードの見出し・URL・根拠・地域・手続段階・罪種カテゴリ・媒体名・サマリーの自動補正
    let changed = false;
    if (item.id === 'd791f60486b37a74f0d3' && /^事故不申告/.test(String(item.title || ''))) {
      item.title = '道路交通法違反(無免許運転・事故不申告)事件で男を逮捕(我孫子警察署)';
      changed = true;
    }
    const cleanedTitle = String(item.title || '')
      .replace(/」」/g, '」')
      .replace(/(?:\s*[|｜]\s*[^|｜]{1,35})+$/, '')
      .replace(/[:：][一-龥ァ-ヶー]{2,8}ニュース$/, '')
      .replace(/\s*\[[一-龥]{2,4}\]\s*$/, '')
      .replace(/\s*[（(](?!\d{1,3}[）)])(?:[^（）()]|[（(][^（）()]*[）)])*(?:テレビ|新聞|ニュース|放送|通信|新報|日報|タイムス|朝日|毎日|読売|産経|日経|共同|時事|TBS|NHK|FNN|NNN|ANN|JNN|MBS|ABC|KBC|RKB|CBC|HBC|STV|HTB|UHB|TBC|ABS|TUY|TUF|BSN|SBC|UTY|SBS|ＳＢＳ|メ〜テレ|メ～テレ|中京|東海|カンテレ|読売テレビ|日テレ|テレ朝|テレ東|フジ|サンテレビ|KBS|RCC|KRY|RNC|RNB|RKC|TNC|FBS|TVQ|STS|KTN|KKT|TOS|UMK|MBC|KTS|QAB|OTV|RBC|ぎふチャン|KFB|NEWS|デジタル|DIGITAL|オンライン|ONLINE|ちばとぴ|船橋つうしん)[A-Za-z0-9ァ-ヶーぁ-ん一-龥\s（）()系・\-]*[）)]?\s*$/i, '')
      .trim();
    if (cleanedTitle && cleanedTitle !== item.title) {
      item.title = cleanedTitle;
      changed = true;
    }

    const qHit = qById.get(item.id) || qByNorm.get(normTitle(item.title));
    if (item.url && item.url.includes('news.google.com') && qHit?.resolvedUrl && !qHit.resolvedUrl.includes('news.google.com') && !/^https?:\/\/t\.co\//i.test(qHit.resolvedUrl)) {
      item.url = qHit.resolvedUrl;
      changed = true;
    }
    const canonicalPhotoUrl = item.url ? articleFetcher.photoPageToArticleUrl(item.url) : null;
    if (canonicalPhotoUrl && canonicalPhotoUrl !== item.url) {
      item.url = canonicalPhotoUrl;
      changed = true;
    }
    let evidenceRestored = false;
    if (!item.evidence && qHit?.audit?.suspectRole?.evidence) {
      const sus = String(qHit.audit.suspectRole.evidence).replace(/^(?:本文抜粋|見出し根拠|見出し・本文統合根拠|国内捜査・司法機関管轄根拠)\s*[:：]\s*/, '');
      const chk = aiGate.verifyArticleContent(sus, item.title);
      const occs = aiGate.natOccurrences(sus);
      const allNonSus = occs.length > 0 && occs.every((o) => !o.suspect);
      if (!chk.rejected && !allNonSus) {
        item.evidence = {
          suspect: qHit.audit.suspectRole.evidence,
          nationality: qHit.audit.foreignNationality?.evidence || `本文抜粋: ${item.nationality || '外国籍'}`,
        };
        if (!item.locationBasis) {
          item.locationBasis = qHit.audit.japanCrime?.evidence || qHit.audit.suspectRole.evidence;
        }
        evidenceRestored = true;
        changed = true;
      }
    }
    if (item.nationality === '外国籍' && qHit?.audit?.foreignNationality?.evidence) {
      for (const [natRe, natLabel] of SPEC_NAT_MAP) {
        if (natRe.test(qHit.audit.foreignNationality.evidence)) {
          item.nationality = natLabel;
          changed = true;
          break;
        }
      }
    }

    if (LOCATION_CORRECTIONS[item.id] && item.location !== LOCATION_CORRECTIONS[item.id]) {
      item.location = LOCATION_CORRECTIONS[item.id];
      item.prefecture = LOCATION_CORRECTIONS[item.id];
      changed = true;
    }
    if (item.location && item.prefecture !== item.location) {
      item.prefecture = item.location;
      changed = true;
    }
    if (item.id === '730b0a46a562' && (item.nationality !== 'ブラジル国籍' || !String(item.summary || '').includes('ブラジル国籍'))) {
      item.nationality = 'ブラジル国籍';
      item.summary = '無免許運転を命じたなどとして、群馬県警は16日、道交法違反の疑いでブラジル国籍の会社社長ら男2人と、無免許運転の疑いでインド国籍のアルバイトの男（25）の計3人を逮捕した。';
      changed = true;
    }
    if (item.id === 'd791f60486b37a74f0d3' && /^事故不申告/.test(String(item.summary || ''))) {
      item.summary = `${item.title}。（${item.location || '千葉県'}・${item.nationality || 'スリランカ国籍'}被疑者の${item.stage || '逮捕'}報道）`;
      changed = true;
    }
    if (item.id === '55897681b0191297' && String(item.evidence?.suspect || '').includes('・酒酔い運転で男を逮捕')) {
      const fixedEv = '本文抜粋: 酒酔い運転で男を逮捕（高速道路交通警察隊） 9月21日午前1時35分頃、船橋市海神町南';
      item.evidence.suspect = fixedEv;
      item.locationBasis = fixedEv;
      changed = true;
    }
    if (['a5b5d930865b8819', '988c374935310ca7'].includes(item.id) && item.stage !== '再逮捕') {
      item.stage = '再逮捕';
      changed = true;
    }
    const titleStage = aiGate.determineStage(item.title || '');
    if (titleStage && item.stage !== titleStage && (['873f8e180b8a', '95f9a343b9f98c6b', 'f0ee4ce72331', 'ec3635afcc90b465'].includes(item.id) || (titleStage === '起訴' && item.stage === '不起訴'))) {
      item.stage = titleStage;
      changed = true;
    }

    const titleCat = aiGate.extractCrimeCategories(item.title || '')[0];
    const needsRecat = !validCategories.has(item.crimeCategory)
      || item.crimeCategory === 'その他刑事事件'
      || item.crimeCategory === '万引き・ドラッグストア大量窃盗'
      || (item.crimeCategory === '性犯罪・わいせつ' && /(?:問題|試験|学科)/.test(item.title || ''))
      || (titleCat && !['その他刑事事件', '一般窃盗・スリ・車上荒らし', '一般詐欺・無銭飲食'].includes(titleCat)
        && ['一般窃盗・スリ・車上荒らし', '一般詐欺・無銭飲食', '医師法・薬機法・無資格医療・美容', '自動車・バイク盗・ヤード解体', '暴行・傷害・脅迫', '銃刀法・公務執行妨害・犯人蔵匿'].includes(item.crimeCategory)
        && item.crimeCategory !== titleCat);
    if (needsRecat) {
      const combinedCats = aiGate.extractCrimeCategories(`${item.title || ''} ${item.evidence?.suspect || ''} ${item.locationBasis || ''}`);
      const chosenCat = (titleCat && !['その他刑事事件', '一般窃盗・スリ・車上荒らし', '一般詐欺・無銭飲食'].includes(titleCat) && combinedCats.includes(titleCat))
        ? titleCat
        : combinedCats[0];
      if (chosenCat && chosenCat !== item.crimeCategory) {
        item.crimeCategory = chosenCat;
        changed = true;
      }
    }

    if (!item.media || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(item.media) || /Howl\.Link|MSNニュース\s*\/\s*Howl\.Link/i.test(item.media)) {
      const normMedia = resolveNormalizedMedia(item.media, item.url);
      if (normMedia !== item.media) {
        item.media = normMedia;
        if (item.source !== undefined) item.source = normMedia;
        changed = true;
      }
    }
    if (item.description && /<a\s+href=/i.test(item.description)) {
      delete item.description;
      changed = true;
    }

    if (item.id === 'a3239936fc6a' && String(item.summary || '').includes('（加古川市の男が）使っていない') && !String(item.summary || '').includes('「（加古川市の男が）')) {
      item.summary = item.summary.replace('（加古川市の男が）使っていない', '「（加古川市の男が）使っていない');
      changed = true;
    }
    if (item.id === 'd3feb3805c15' && /「身に覚えがない。$/.test(String(item.summary || ''))) {
      item.summary = item.summary.replace(/「身に覚えがない。$/, '「身に覚えがない」と容疑を否認している。');
      changed = true;
    }

    const inlineGarbageRe = /(?:【写真を見る】|【画像】|写真拡大|[▶▷▼▽■◆●]\s*[^。]{10,90}?(?:市|区|町|村)\s+|ハンガー型カメラで盗撮しようと\s*|[一-龥ぁ-んァ-ヴー]{4,35}[＝=]\s*[0-9０-９]{1,2}日(?:午前|午後)?[、，][一-龥]{2,10}$)/g;
    for (const field of ['summary', 'locationBasis']) {
      if (item[field] && inlineGarbageRe.test(item[field])) {
        item[field] = item[field].replace(inlineGarbageRe, '').trim();
        changed = true;
      }
    }
    if (item.evidence?.suspect && inlineGarbageRe.test(item.evidence.suspect)) {
      item.evidence.suspect = item.evidence.suspect.replace(inlineGarbageRe, '').trim();
      changed = true;
    }
    const isTemplateOrBrokenSummary = evidenceRestored
      || /[、・]\s*[一-龥ァ-ヶー]{1,4}。$/.test(String(item.summary || ''))
      || /本文の文脈結合で確認した報道です|ことを本文で確認した報道です|外国人関与の事件・容疑に関する報道速報です|、(?:起訴状|逮捕容疑)/.test(String(item.summary || ''))
      || (/被疑者の[^（）]*報道）$/.test(String(item.summary || '')) && !String(item.summary || '').includes(`（${item.location || '国内'}・${item.nationality || '外国籍'}被疑者の${item.stage || '逮捕'}報道）`));
    if (isTemplateOrBrokenSummary) {
      const prevSummary = item.summary;
      const cleanExc = (s) => String(s || '')
        .replace(/^(?:本文抜粋|見出し根拠|見出し・本文統合根拠|国内捜査・司法機関管轄根拠)\s*[:：]\s*/, '')
        .replace(/^(?:【[^】]{1,20}】\s*|写真拡大\s*|[〉>≫]\s*[^。]{5,70}?ほか\s*|[▶▷▼▽■◆●]\s*[^。]{10,90}?(?:市|区|町|村)\s+|(?:TOP|社会)\s+(?:事件・事故\s*)?)+/, '')
        .replace(/^[^。]*?[（(][^（）()]*(?:テレビ|新聞|ニュース|放送|通信)[^（）()]*[）)]\s*/, '')
        .replace(/^(?:新しい記事が|前の記事が|記事一覧|SNSでシェア|シェアする|ポストする)[^。]*?、/, '')
        .replace(/^[^。]*?、(?=(?:起訴状|逮捕容疑|再逮捕容疑|送検容疑|警察|県警|府警|道警|警視庁)(?:など)?によ(?:ると|りますと))/, '')
        .trim();
      const s1 = cleanExc(item.evidence?.suspect);
      const s2 = cleanExc(item.locationBasis);
      const parts = [];
      if (s1 && s1 !== item.title && /[。！？）」』]$/.test(s1)) parts.push(s1);
      if (s2 && s2 !== s1 && s2 !== item.title && /[。！？）」』]$/.test(s2) && !s1.includes(s2.slice(0, 20))) {
        parts.push(s2);
      }
      if (parts.length > 0 && parts.join('').length >= 30) {
        item.summary = parts.join('');
      } else {
        const cleanSum = cleanExc(item.summary);
        if (!/本文の文脈結合で確認した報道です|ことを本文で確認した報道です|外国人関与の事件・容疑に関する報道速報です|被疑者の[^（）]*報道）$/.test(cleanSum) && !/[、・]\s*[一-龥ァ-ヶー]{1,4}。$/.test(cleanSum) && cleanSum.length >= 35) {
          item.summary = cleanSum;
        } else if (parts.length === 1 && parts[0].length >= 12) {
          const bareTitle = String(item.title || '').replace(/。+$/, '');
          item.summary = `${bareTitle}。${parts[0]}`;
        } else {
          const bareTitle = String(item.title || '').replace(/。+$/, '');
          item.summary = `${bareTitle}。（${item.location || '国内'}・${item.nationality || '外国籍'}被疑者の${item.stage || '逮捕'}報道）`;
        }
      }
      if (item.summary !== prevSummary) changed = true;
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
