/**
 * 過去記事再評価（本文再取得＆メモリ上3要素結合判定）スクリプト
 * 
 * 安全方針:
 * 1. data/newsData.json は一切変更しない（完全読み取り専用）。
 * 2. Gemini API は呼び出さない（無料枠消費ゼロ）。
 * 3. 1回の実行で最大5件（指定可）のみ処理し、完全直列＋安全間隔でアクセス。
 * 4. 429検知時は即時中断、403やGoogle解決エラー連続時も安全停止。
 * 5. 進捗は data/re-audit-queue.json にアトミック書き込み。
 */

const fs = require('fs');
const path = require('path');
const {
  resolveGoogleNewsUrl,
  decodeHtml,
  extractArticleText,
  httpRequest,
  createSpacer,
} = require('./lib/article-fetcher.cjs');

const {
  natOccurrences,
  isJapaneseArrestee,
  isOverseas,
  resolvePrefecture,
  loadMunicipalities,
} = require('./lib/ai-gate.cjs');

const NEWS_DATA_PATH = path.resolve(__dirname, '../data/newsData.json');
const QUEUE_PATH = path.resolve(__dirname, '../data/re-audit-queue.json');

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Google News batchexecute 用の HTTP I/O アダプター
const ioAdapter = {
  get: (url, opts = {}) => httpRequest(url, opts),
  post: (url, body, opts = {}) =>
    httpRequest(url, {
      ...opts,
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Content-Length': Buffer.byteLength(body),
        ...(opts.headers || {})
      }
    })
};

// 国内主要空港（密輸・出入国事件などで頻出する現場）
const DOMESTIC_AIRPORTS = {
  '福岡空港': '福岡県', '成田空港': '千葉県', '羽田空港': '東京都',
  '関西空港': '大阪府', '関西国際空港': '大阪府', '中部空港': '愛知県',
  '中部国際空港': '愛知県', '新千歳空港': '北海道', '那覇空港': '沖縄県',
  '伊丹空港': '大阪府', '大阪国際空港': '大阪府', '神戸空港': '兵庫県',
  '仙台空港': '宮城県', '広島空港': '広島県', '北九州空港': '福岡県'
};

// 警察署・捜査機関および居住地・出身地の表記を除去
function cleanPoliceAndResidence(str) {
  return str
    .replace(/[^\s、。]+(?:警察署|地裁|簡裁|高裁|最高裁|捜査本部|検察庁|県警|府警|道警|警視庁)/g, ' ')
    .replace(/[^\s、。]+(?:に住む|在住|出身)/g, ' ');
}

/**
 * 犯罪行為の文脈（suspectSentence または直前文）と直接結びついた国内現場を特定する
 */
function resolveCrimeSceneInContext(targetSentence, dict) {
  const cleanSent = cleanPoliceAndResidence(targetSentence);

  // 現場表現のキーワード（商業施設・アウトレット・駐車場等を追加）
  const SCENE_RE = /(?:都内|道内|府内|県内|市内|町内|村内|路上|アパート|マンション|住宅|店舗|敷地|車内|山林|ホテル|自宅|港|空港|現場|店|駅|ヤード|倉庫|工場|ビル|施設|部屋|アウトレット|モール|商業施設|スーパー|コンビニ|駐車場|パーキング)/;
  if (!SCENE_RE.test(cleanSent)) return null;

  // 1. 空港辞書の照合
  for (const [ap, pref] of Object.entries(DOMESTIC_AIRPORTS)) {
    if (cleanSent.includes(ap)) {
      return { pref, evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
    }
  }

  // 2. 都道府県名の照合
  for (const p of PREFECTURES) {
    if (cleanSent.includes(p)) {
      return { pref: p, evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
    }
  }

  // 3. 市区町村辞書の照合（「御殿場アウトレット」の「御殿場」等の語幹も含む）
  for (const key of dict.keys) {
    if (cleanSent.includes(key)) {
      const prefs = dict.map[key];
      if (prefs && prefs.length === 1) return { pref: prefs[0], evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
    }
    const stem = key.replace(/(?:市|区|町|村)$/, '');
    if (stem.length >= 3 && cleanSent.includes(stem)) {
      const prefs = dict.map[key];
      if (prefs && prefs.length === 1) return { pref: prefs[0], evidence: `本文抜粋: ${targetSentence.slice(0, 80)}` };
    }
  }

  return null;
}

/**
 * 本文（メモリ上）の3要素結合検証
 * ※見出し title は合格根拠には一切使わず、回遊リンク汚染を検出・除外するトピック照合ガードとしてのみ使用
 */
function verifyArticleContent(text, title = '') {
  const result = {
    verified: false,
    rejected: false,
    insufficientEvidence: false,
    rejectReason: null,
    pendingReason: null,
    audit: {
      japanCrime: { verified: false, evidence: null },
      suspectRole: { verified: false, evidence: null },
      foreignNationality: { verified: false, evidence: null }
    }
  };

  // 1. 海外事件の積極的除外（本文 text のみ）
  if (isOverseas(text)) {
    result.rejected = true;
    result.rejectReason = 'crime_outside_japan';
    return result;
  }

  // 2. 日本人被疑者の積極的除外（本文 text のみ）
  if (isJapaneseArrestee(text)) {
    result.rejected = true;
    result.rejectReason = 'suspect_is_japanese';
    return result;
  }

  // 3. 文脈結合による外国籍被疑者の検証（本文 sentences のみ）
  // 被疑者文には逮捕・容疑・送検・起訴・有罪などの犯罪述語が同一文内に存在することを必須化
  const CRIME_PREDICATE_RE = /(?:逮捕|容疑|疑い|送検|送致|起訴|判決|求刑|摘発|指名手配|検挙|立件|有罪|被告|被疑者|現行犯|身柄|拘束|書類送検|再逮捕|罰金)/;
  const sentences = text.split(/(?<=[。！？\n])/).map((s) => s.trim()).filter(Boolean);
  let suspectIndex = -1;
  let matchedOcc = null;

  for (let i = 0; i < sentences.length; i++) {
    const occs = natOccurrences(sentences[i]);
    const suspectOcc = occs.find((o) => o.suspect && !o.victim && !o.nonSuspect);
    if (suspectOcc && CRIME_PREDICATE_RE.test(sentences[i])) {
      suspectIndex = i;
      matchedOcc = suspectOcc;
      break;
    }
  }

  if (suspectIndex === -1) {
    result.insufficientEvidence = true;
    result.pendingReason = 'suspect_or_nationality_unclear_in_body';
    return result;
  }

  const suspectSentence = sentences[suspectIndex];

  // 【トピック整合性ガード】見出しの事件話題と本文被疑者文が完全に乖離している場合は回遊リンク汚染と判定
  // ※見出しは合格根拠には一切使わず、別事件の混入を検出・拒否するネガティブガードとしてのみ使用
  if (title) {
    const CRIME_TOPIC_WORDS = [
      '詐欺', '強盗', '窃盗', '盗み', '密輸', '密入国', '覚醒剤', '麻薬', 'コカイン',
      '大麻', '殺人', '暴行', '傷害', '客引き', '白タク', '不法滞在', '不法就労',
      '横領', '密猟', '侵入', '車庫', '空き家', 'タイヤ', 'オカヤドカリ'
    ];
    const titleTopics = CRIME_TOPIC_WORDS.filter((w) => title.includes(w));
    if (titleTopics.length > 0) {
      // 照合対象は被疑者文および直前文（直結する犯行文脈）のみに限定し、本文先頭の一致によるすり抜けを完全排除
      const prevSentence = suspectIndex > 0 ? sentences[suspectIndex - 1] : '';
      const suspectContext = `${prevSentence} ${suspectSentence}`;
      const hasMatchingTopic = titleTopics.some((w) => suspectContext.includes(w));
      if (!hasMatchingTopic) {
        result.insufficientEvidence = true;
        result.pendingReason = 'topic_mismatch_contamination';
        return result;
      }
    }
  }

  result.audit.foreignNationality = { verified: true, evidence: `本文抜粋: ${matchedOcc.text}` };
  result.audit.suspectRole = { verified: true, evidence: `本文抜粋: ${suspectSentence.slice(0, 80)}` };

  // 4. 犯罪行為と同一文脈での国内現場検証（被疑者文、または直前文のみ）
  const dict = loadMunicipalities();
  // まず被疑者・犯罪行為の文そのものから探索
  let scene = resolveCrimeSceneInContext(suspectSentence, dict);
  // 直前文に現場が提示されている密接文脈（例: 「〜の路上で事件があり」→「〜の男を逮捕」）
  if (!scene && suspectIndex > 0) {
    scene = resolveCrimeSceneInContext(sentences[suspectIndex - 1], dict);
  }

  if (!scene) {
    result.insufficientEvidence = true;
    result.pendingReason = 'crime_location_unclear_in_context';
    return result;
  }

  result.audit.japanCrime = { verified: true, evidence: scene.evidence };

  // 3要素すべてが本文の同一犯行文脈で客観的に確認できた場合のみ合格候補
  result.verified = true;
  return result;
}

/**
 * キューの読み込みまたは初期化
 */
function loadOrCreateQueue() {
  if (fs.existsSync(QUEUE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));
    } catch (e) {
      console.error(`キュー読み込み失敗: ${e.message}`);
    }
  }

  const newsData = JSON.parse(fs.readFileSync(NEWS_DATA_PATH, 'utf-8'));
  const queue = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: newsData.map((item) => ({
      id: item.id,
      url: item.url,
      title: item.title,
      currentLocation: item.location,
      status: 'pending', // pending | verified | rejected | insufficient_evidence | gave_up
      isTruncated: false,
      audit: null,
      rejectReason: null,
      pendingReason: null,
      attempts: 0,
      lastAttemptAt: null,
      resolvedUrl: null
    }))
  };

  saveQueue(queue);
  return queue;
}

function saveQueue(queue) {
  queue.updatedAt = new Date().toISOString();
  const tmpPath = `${QUEUE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(queue, null, 2), 'utf-8');
  fs.renameSync(tmpPath, QUEUE_PATH);
}

/**
 * メイン処理（バッチ実行・安全中断対応）
 */
async function runBatch(batchSize = 5) {
  console.log(`=== 過去記事再評価バッチ（最大 ${batchSize} 件・完全直列・読み取り専用）開始 ===`);
  const queue = loadOrCreateQueue();
  const pendingItems = queue.items.filter((it) => it.status === 'pending');

  console.log(`未判定アイテム数: ${pendingItems.length} / ${queue.items.length}`);
  if (pendingItems.length === 0) {
    console.log('すべてのアイテムの再評価が完了しています。');
    return;
  }

  const workItems = pendingItems.slice(0, batchSize);
  const googleSpacer = createSpacer(2500);

  let googleFailCount = 0;
  let forbiddenCount = 0;
  let stopRequested = false;

  for (const item of workItems) {
    if (stopRequested) break;

    console.log(`\n[ID: ${item.id}] 処理開始: ${item.title.slice(0, 35)}...`);
    item.attempts += 1;
    item.lastAttemptAt = new Date().toISOString();

    // 1. Google News URL解決（POSTアダプター経由）
    let resolved;
    try {
      resolved = await resolveGoogleNewsUrl(item.url, ioAdapter, googleSpacer);
    } catch (e) {
      resolved = { ok: false, reason: `resolve_err_${e.message}`, google: true };
    }

    if (!resolved.ok) {
      console.warn(`  → URL解決失敗: ${resolved.reason}`);
      if (resolved.google) {
        googleFailCount++;
        if (googleFailCount >= 2) {
          console.error('【安全ブレーカー発動】Google解決エラーが連続2回発生したため即時中断します。');
          stopRequested = true;
        }
      }
      item.pendingReason = resolved.reason;
      if (item.attempts >= 3) item.status = 'gave_up';
      saveQueue(queue);
      continue;
    }

    googleFailCount = 0;
    item.resolvedUrl = resolved.url;
    console.log(`  → 解決URL: ${resolved.url.slice(0, 60)}...`);

    // 2. 元記事アクセス（2.5秒〜3.5秒の間隔待機）
    await sleep(2500 + Math.floor(Math.random() * 1000));

    let page;
    try {
      page = await httpRequest(resolved.url, {
        timeoutMs: 10000,
        maxBytes: 1500000,
        headers: {
          'Accept-Language': 'ja,en;q=0.8',
          'Accept': 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
    } catch (e) {
      console.warn(`  → 記事取得ネットワークエラー: ${e.message}`);
      item.pendingReason = `fetch_${e.message}`;
      if (item.attempts >= 3) item.status = 'gave_up';
      saveQueue(queue);
      continue;
    }

    // 429 即時停止
    if (page.status === 429) {
      console.error('【安全ブレーカー発動】HTTP 429 (Too Many Requests) を検知しました。直ちに中断します。');
      item.pendingReason = 'http_429';
      saveQueue(queue);
      break;
    }

    // 403 監視
    if (page.status === 403) {
      console.warn('  → HTTP 403 Forbidden 検知');
      forbiddenCount++;
      item.pendingReason = 'http_403';
      if (forbiddenCount >= 2) {
        console.error('【安全ブレーカー発動】403が連続発生したため安全停止します。');
        stopRequested = true;
      }
      if (item.attempts >= 3) item.status = 'gave_up';
      saveQueue(queue);
      continue;
    }
    forbiddenCount = 0;

    if (page.status === 404 || page.status === 410) {
      console.log('  → 記事削除済み (404/410)');
      item.status = 'gave_up';
      item.pendingReason = `http_${page.status}`;
      saveQueue(queue);
      continue;
    }

    if (page.status !== 200) {
      console.warn(`  → HTTPエラー: ${page.status}`);
      item.pendingReason = `http_${page.status}`;
      if (item.attempts >= 3) item.status = 'gave_up';
      saveQueue(queue);
      continue;
    }

    // 3. 本文抽出と完全性（8,000字切り詰め）チェック
    const rawHtml = decodeHtml(page.body, page.headers['content-type']);
    const text = extractArticleText(rawHtml, 8000);

    if (text.length < 100) {
      console.log('  → 本文読解不能（PaywallまたはJS描画必須の可能性）');
      item.pendingReason = 'unreadable';
      if (item.attempts >= 3) item.status = 'gave_up';
      saveQueue(queue);
      continue;
    }

    item.isTruncated = (text.length >= 8000);

    // 4. メモリ上3要素結合検証（見出しはトピック照合ガードとしてのみ使用）
    const audit = verifyArticleContent(text, item.title);
    item.audit = audit.audit;

    if (audit.verified) {
      item.status = 'verified';
      console.log(`  ★【合格候補 (verified)】国内現場: ${audit.audit.japanCrime.evidence}`);
      console.log(`    容疑者役割: ${audit.audit.suspectRole.evidence} / 国籍: ${audit.audit.foreignNationality.evidence}`);
    } else if (audit.rejected) {
      item.status = 'rejected';
      item.rejectReason = audit.rejectReason;
      console.log(`  ×【除外 (rejected)】理由: ${audit.rejectReason}`);
    } else {
      // 8,000字切り詰めがあった場合は理由に注記
      item.status = 'insufficient_evidence';
      item.pendingReason = item.isTruncated ? `truncated_${audit.pendingReason}` : audit.pendingReason;
      console.log(`  △【根拠不足 (insufficient_evidence)】理由: ${item.pendingReason}`);
    }

    saveQueue(queue);
  }

  console.log('\n=== バッチ処理終了（キュー保存完了） ===');
}

// 実行（引数でバッチサイズ指定可能、既定5件）
if (require.main === module) {
  const batchSize = parseInt(process.argv[2], 10) || 5;
  runBatch(batchSize).catch((e) => {
    console.error('予期せぬエラー:', e);
    process.exit(1);
  });
}

module.exports = {
  verifyArticleContent,
  resolveCrimeSceneInContext,
  runBatch
};
