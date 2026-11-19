#!/usr/bin/env node
/**
 * 毎日更新・月次まとめ用 SNS(X) & note 原稿自動生成 / オプション投稿スクリプト
 *
 * 使い方:
 *   node scripts/generate-social-digest.cjs --write-draft   # data/social-digest/ へ原稿出力
 *   node scripts/generate-social-digest.cjs --post          # CI用: トラック外で変更検出 & X API設定時のみ投稿(未設定時は安全にskip終了0)
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const NEWS_PATH = path.join(ROOT_DIR, 'data', 'newsData.json');
const HUBS_PATH = path.join(ROOT_DIR, 'data', 'crimeHubs.json');
const DIGEST_DIR = path.join(ROOT_DIR, 'data', 'social-digest');
const SITE_URL = 'https://endearing-blini-b688ce.netlify.app';

const args = new Set(process.argv.slice(2));
const MODE_WRITE_DRAFT = args.has('--write-draft');
const MODE_POST = args.has('--post');
const STRICT = args.has('--strict');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function countBy(items, fn) {
  const map = new Map();
  for (const item of items) {
    const k = fn(item);
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function weightedTweetLength(text) {
  const withTco = text.replace(/https?:\/\/[^\s]+/g, 'x'.repeat(23));
  let units = 0;
  for (const ch of withTco) {
    const code = ch.codePointAt(0);
    units += code <= 0x10ff ? 1 : 2;
  }
  return units;
}

function buildXTweetText(newsItems, newItems = []) {
  const sorted = [...newsItems].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const latestDate = sorted[0]?.date || '';
  const nonProsCount = newsItems.filter(i => i.stage === '不起訴').length;

  const target = (newItems.length > 0 ? newItems : sorted)[0];
  let url = `${SITE_URL}/analysis/crime-news/`;
  if (target?.stage === '不起訴') {
    url = `${SITE_URL}/analysis/non-prosecution/`;
  }

  let headline = target
    ? `【${target.location || '国内'}${target.nationality ? '・' + target.nationality : ''}】${target.title}`
    : `外国人犯罪報道データベース最新更新(${latestDate})`;

  const suffix = `\n📊累計${newsItems.length}件(不起訴${nonProsCount}件)一覧👇\n${url}\n#外国人犯罪統計 #日本の岐路`;
  while (weightedTweetLength(`${headline}${suffix}`) > 274 && headline.length > 16) {
    headline = headline.slice(0, -4) + '…';
  }
  return `${headline}${suffix}`;
}

function buildMonthlyNoteDraft(newsItems, hubsConfig) {
  const sorted = [...newsItems].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const latestDate = sorted[0]?.date || '2026-11-01';
  const targetYm = latestDate.slice(0, 7);
  const monthItems = sorted.filter(i => String(i.date || '').startsWith(targetYm));
  const nonProsItems = sorted.filter(i => i.stage === '不起訴');

  const topCats = countBy(monthItems.length >= 10 ? monthItems : sorted, i => i.crimeCategory || 'その他').slice(0, 8);
  const topNats = countBy(monthItems.length >= 10 ? monthItems : sorted, i => i.nationality || '外国籍（詳細不明）').slice(0, 8);
  const topPrefs = countBy(monthItems.length >= 10 ? monthItems : sorted, i => i.prefecture || i.location || '不明').slice(0, 8);
  const topStages = countBy(sorted, i => i.stage || '逮捕');

  const sampleCases = (monthItems.length >= 8 ? monthItems : sorted).slice(0, 12);
  const [y, m] = targetYm.split('-');
  const ymLabel = y && m ? `${y}年${Number(m)}月` : targetYm;

  const lines = [
    `# 【データ月次まとめ】${ymLabel}の国内外国人事件報道動向と公的統計（累計${sorted.length}件分析）`,
    '',
    `全国紙・地方紙・通信社が報じた日本国内の外国籍容疑者・被告等に関する報道一次情報（全${sorted.length}件・うち${ymLabel}分${monthItems.length}件、最新収録日${latestDate}）の集計レポートです。`,
    '',
    '単発ニュースとして流れて消えがちな地方版・司法ステージ別の報道を横断集計し、検挙実態・罪種の偏在・不起訴処分の件数をデータで確認できるように整理しました。',
    '',
    '## 1. 集計サマリーと主要傾向',
    '',
    `- **全収録件数**: ${sorted.length}件（うち${ymLabel}新規報道: ${monthItems.length}件）`,
    `- **不起訴処分の報道**: ${nonProsItems.length}件（全体の ${((nonProsItems.length / Math.max(sorted.length, 1)) * 100).toFixed(1)}%）`,
    `- **司法ステージ別（全期間）**: ${topStages.map(([k, v]) => `${k} ${v}件`).join(' / ')}`,
    '',
    '## 2. 罪種別内訳（上位）',
    '',
    '| 罪種・事犯カテゴリ | 件数 |',
    '|---|---:|',
    ...topCats.map(([cat, cnt]) => `| ${cat} | ${cnt}件 |`),
    '',
    '## 3. 国籍・発生都道府県別の上位傾向',
    '',
    '### 国籍別（報道の言及ベース上位）',
    ...topNats.map(([nat, cnt]) => `- ${nat}: ${cnt}件`),
    '',
    '### 発生都道府県別（上位）',
    ...topPrefs.map(([pref, cnt]) => `- ${pref}: ${cnt}件`),
    '',
    '## 4. 公的統計（検挙率1.72倍・不起訴構造）との対照',
    '',
    '2025年11月の参議院内閣委員会における警察庁答弁では、短期滞在者（観光客等）を除いた「定住外国人」の刑法犯検挙率は0.323%、日本人は0.188%（約1.72倍）と示されています。年齢構成補正の論点や分母の定義の違いについては、下記の統計検証ページで比較解説しています。',
    '',
    `- 「外国人犯罪率デマ vs 1.72倍」ファクトチェック: ${SITE_URL}/analysis/crime-rate-factcheck/`,
    `- 外国人犯罪「不起訴処分」はなぜ？(${nonProsItems.length}件一覧と刑事手続検証): ${SITE_URL}/analysis/non-prosecution/`,
    `- 全${sorted.length}件・検索可能な犯罪速報アーカイブ: ${SITE_URL}/analysis/crime-news/`,
    '',
    '## 5. 直近の一次報道ピックアップ',
    '',
    ...sampleCases.map(item => `- [${item.date}] 【${item.location}・${item.nationality || '外国籍'}・${item.stage || '逮捕'}】${item.title}（${item.media}）`),
    '',
    '---',
    '',
    `※ トピック別特集ハブ（カテゴリ設定数: ${(hubsConfig.categories || []).length}種類・地域ハブ・クロス集計）はすべて [日本の岐路 データアーカイブ](${SITE_URL}/) にて毎日自動更新されています。`,
    ''
  ];

  return lines.join('\n');
}

function getNewlyAddedSinceParentCommit(currentItems) {
  try {
    const prevRaw = execSync('git show HEAD~1:data/newsData.json', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const prevItems = JSON.parse(prevRaw);
    const prevKeys = new Set();
    for (const p of prevItems) {
      if (p.id) prevKeys.add(String(p.id));
      if (p.url) prevKeys.add(String(p.url));
    }
    return currentItems.filter(
      item => !prevKeys.has(String(item.id || '')) && !prevKeys.has(String(item.url || ''))
    );
  } catch {
    return [];
  }
}

function rfc3986Encode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildOAuthHeader(method, url, consumerKey, consumerSecret, accessToken, accessSecret) {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: accessToken,
    oauth_version: '1.0'
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map(k => `${rfc3986Encode(k)}=${rfc3986Encode(oauthParams[k])}`)
    .join('&');

  const baseString = [method.toUpperCase(), rfc3986Encode(url), rfc3986Encode(paramString)].join('&');
  const signingKey = `${rfc3986Encode(consumerSecret)}&${rfc3986Encode(accessSecret)}`;
  oauthParams.oauth_signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  const headerPairs = Object.keys(oauthParams)
    .sort()
    .map(k => `${rfc3986Encode(k)}="${rfc3986Encode(oauthParams[k])}"`)
    .join(', ');

  return `OAuth ${headerPairs}`;
}

async function postToX(tweetText) {
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessSecret) {
    console.log('[social-digest] X API secrets are not configured; skipping post safely.');
    return { skipped: true };
  }

  const endpoint = 'https://api.twitter.com/2/tweets';
  const authHeader = buildOAuthHeader('POST', endpoint, consumerKey, consumerSecret, accessToken, accessSecret);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: tweetText })
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`X API responded ${res.status}: ${bodyText}`);
  }
  console.log('[social-digest] X post succeeded:', bodyText);
  return { skipped: false, response: bodyText };
}

async function main() {
  const newsItems = loadJson(NEWS_PATH);
  const hubsConfig = loadJson(HUBS_PATH);

  if (MODE_WRITE_DRAFT || (!MODE_POST && !MODE_WRITE_DRAFT)) {
    fs.mkdirSync(DIGEST_DIR, { recursive: true });
    const noteDraft = buildMonthlyNoteDraft(newsItems, hubsConfig);
    const xPostText = buildXTweetText(newsItems, []);
    const notePath = path.join(DIGEST_DIR, 'monthly-note-draft.md');
    const xPath = path.join(DIGEST_DIR, 'latest-x-post.txt');
    fs.writeFileSync(notePath, noteDraft, 'utf-8');
    fs.writeFileSync(xPath, xPostText + '\n', 'utf-8');
    console.log(`[social-digest] Wrote draft files:\n  - ${notePath}\n  - ${xPath} (${weightedTweetLength(xPostText)}/280 weight)`);
  }

  if (MODE_POST) {
    const newItems = getNewlyAddedSinceParentCommit(newsItems);
    console.log(`[social-digest] Newly added articles in HEAD vs HEAD~1: ${newItems.length}`);
    if (newItems.length === 0) {
      console.log('[social-digest] No new articles detected in this commit; skipping X post.');
      return;
    }
    const tweetText = buildXTweetText(newsItems, newItems);
    console.log(`[social-digest] Prepared post (${weightedTweetLength(tweetText)}/280 weight):\n${tweetText}`);
    try {
      await postToX(tweetText);
    } catch (err) {
      console.warn('[social-digest] Non-fatal post error:', err.message);
      if (STRICT) process.exitCode = 1;
    }
  }
}

main().catch(err => {
  console.error('[social-digest] Fatal error:', err);
  if (STRICT) process.exit(1);
});
