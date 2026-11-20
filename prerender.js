import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import https from 'https';
import { execSync } from 'child_process';
import { getAllEligibleHubs } from './lib/crimeHubs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toAbsolute = (p) => path.resolve(__dirname, p);

// URLからテキストを取得するヘルパー関数（タイムアウト付き堅牢設計・文字化け完全防止）
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      timeout: 8000
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout for ${url}`));
    });
  });
}

// noteのRSSを解析し、各記事のOGP画像をスクレイピングしてJSONファイルに保存
async function updateNoteArticles() {
  try {
    console.log('Fetching note RSS feed...');
    const xml = await fetchText('https://note.com/ideal_kudu9256/rss');
    
    // 記事要素を抽出するための簡易正規表現パース
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/;
    const linkRegex = /<link>([\s\S]*?)<\/link>/;
    const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/;
    const descRegex = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/;

    const articles = [];
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null && articles.length < 5) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(titleRegex);
      const title = (titleMatch ? (titleMatch[1] || titleMatch[2]) : '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      
      const linkMatch = itemXml.match(linkRegex);
      const link = linkMatch ? linkMatch[1].trim() : '';
      
      const pubDateMatch = itemXml.match(pubDateRegex);
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';

      const descMatch = itemXml.match(descRegex);
      let description = descMatch ? (descMatch[1] || descMatch[2]) : '';
      description = description.replace(/<[^>]*>/g, '').replace(/続きをみる/g, '').replace(/\n/g, ' ').trim();
      if (description.length > 90) {
        description = description.substring(0, 90) + '...';
      }

      if (title && link) {
        articles.push({ title, link, pubDate, description });
      }
    }

    console.log(`Found ${articles.length} articles. Scraping OGP images...`);

    for (let i = 0; i < articles.length; i++) {
      const art = articles[i];
      try {
        const html = await fetchText(art.link);
        // OGP画像（og:image）を確実に2段階で抽出
        let thumbnail = null;
        const metaTagMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i);
        if (metaTagMatch) {
          const metaTag = metaTagMatch[0];
          const contentMatch = metaTag.match(/content=["'](.*?)["']/i);
          if (contentMatch && contentMatch[1]) {
            thumbnail = contentMatch[1].replace(/&amp;/g, '&');
          }
        }
        
        if (thumbnail) {
          art.thumbnail = thumbnail;
        } else {
          art.thumbnail = "https://assets.st-note.com/production/uploads/images/282104689/profile_bdbe816059e6f0af49ce402d21b308fe.png";
        }

        // 日付の成形
        try {
          const date = new Date(art.pubDate);
          if (!isNaN(date.getTime())) {
            art.pubDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
          }
        } catch (e) {}

        const categories = ["ANALYSIS", "ECONOMY", "POLITICS", "SOCIETY"];
        art.category = categories[i % categories.length];

        console.log(`Processed article [${i+1}]: ${art.title} (Image found: ${!!thumbnail})`);
      } catch (e) {
        console.error(`Failed to scrape OGP for ${art.link}:`, e);
        art.thumbnail = "https://assets.st-note.com/production/uploads/images/282104689/profile_bdbe816059e6f0af49ce402d21b308fe.png";
      }
    }

    // 保存先ディレクトリ（public/とdist/client/）
    // note.com側の一時障害等で0件だった場合は既存のnote-articles.jsonを保護し空配列で上書きしない
    const publicDir = toAbsolute('public');
    const clientDir = toAbsolute('dist/client');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
    if (!fs.existsSync(clientDir)) fs.mkdirSync(clientDir, { recursive: true });
    const publicNotePath = path.join(publicDir, 'note-articles.json');
    const clientNotePath = path.join(clientDir, 'note-articles.json');

    if (articles.length > 0) {
      fs.writeFileSync(publicNotePath, JSON.stringify(articles, null, 2), 'utf-8');
      fs.writeFileSync(clientNotePath, JSON.stringify(articles, null, 2), 'utf-8');
      console.log('Saved note-articles.json successfully!');
    } else if (fs.existsSync(publicNotePath)) {
      fs.copyFileSync(publicNotePath, clientNotePath);
      console.warn('note RSS returned 0 items; preserved existing note-articles.json.');
    }
  } catch (error) {
    console.error('Failed to scrape note feed:', error);
  }
}

async function prerender() {
  // プリレンダリング前にJSONを更新
  await updateNoteArticles();

  const template = fs.readFileSync(toAbsolute('dist/client/index.html'), 'utf-8');
  const entryServerPath = pathToFileURL(toAbsolute('dist/server/entry-server.js')).href;
  const { render } = await import(entryServerPath);

  const routesToPrerender = [
    '/',
    '/analysis-archive',
    '/privacy-policy',
    '/disclaimer',
    '/contact',
    '/about',
    '/references',
    '/faq',
    '/glossary',
    '/operator-info',
    '/analysis/crime-statistics',
    '/analysis/economic-impact',
    '/analysis/social-security',
    '/analysis/naturalization-paradox',
    '/analysis/burial-controversy',
    '/analysis/land-acquisition',
    '/analysis/uk-immigration-lesson',
    '/analysis/borderless-welfare-state',
    '/analysis/national-security',
    '/analysis/nigeria-case',
    '/analysis/simulation-model',
    '/analysis/labor-dilemma',
    '/analysis/video-guide',
    '/analysis/statistical-evidence',
    '/analysis/risk-analysis',
    '/analysis/labor-mismatch',
    '/analysis/summary-statistics',
    '/analysis/policy-recommendations',
    '/analysis/conclusion',
    '/analysis/strategic-recommendations',
    '/analysis/symbiosis',
    '/analysis/ai-simulation',
    '/analysis/crime-news',
    '/analysis/non-prosecution',
    '/analysis/crime-rate-factcheck',
    ...Array.from({ length: 15 }, (_, i) => `/analysis/image/${i + 1}`)
  ];

  const uploadDir = toAbsolute('NETLIFY_UPLOAD');
  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  }
  fs.mkdirSync(uploadDir, { recursive: true });

  // 最新ニュースデータの読み込み（リアルタイム件数・最新日付・国籍別統計をSEOメタ＆構造化データへ反映）
  const SITE_URL = 'https://endearing-blini-b688ce.netlify.app';
  let newsItems = [];
  try {
    newsItems = JSON.parse(fs.readFileSync(toAbsolute('data/newsData.json'), 'utf-8'));
  } catch (e) {
    console.warn('Could not load data/newsData.json for SEO enrichment:', e.message);
  }
  let crimeSegments = { prefectures: {}, nationalities: {} };
  try {
    crimeSegments = JSON.parse(fs.readFileSync(toAbsolute('data/crimeSegments.json'), 'utf-8'));
  } catch (e) {
    console.warn('Could not load data/crimeSegments.json:', e.message);
  }
  let notionAddendumFaqs = {};
  try {
    notionAddendumFaqs = JSON.parse(fs.readFileSync(toAbsolute('data/notionAddendumFaqs.json'), 'utf-8'));
  } catch (e) {
    console.warn('Could not load data/notionAddendumFaqs.json:', e.message);
  }
  const totalNewsCount = newsItems.length || 450;
  const nowJst = new Date(Date.now() + 9 * 3600 * 1000);
  const todayDateStr = nowJst.toISOString().slice(0, 10);
  const latestNewsDate = (newsItems[0] && newsItems[0].date) ? newsItems[0].date : todayDateStr;
  const latestNewsIso = (() => {
    const rawPub = newsItems[0] && newsItems[0].pubDate;
    if (rawPub) {
      const t = Date.parse(rawPub);
      if (Number.isFinite(t)) {
        const d = new Date(t + 9 * 3600 * 1000);
        return `${d.toISOString().slice(0, 19)}+09:00`;
      }
    }
    return `${latestNewsDate}T08:00:00+09:00`;
  })();
  const modifiedIso = latestNewsIso;

  // 各ページファイルの本来の最終コミット日時を取得し、未更新ページへの誤った毎時lastmod付与を防ぐ
  const gitLastmodByFile = {};
  try {
    const rawGit = execSync('git log --name-only --format="DATE:%cI" -n 500 -- pages/', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    let currentIso = '';
    for (const line of rawGit.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('DATE:')) {
        currentIso = trimmed.slice(5).trim();
      } else if (currentIso && !gitLastmodByFile[trimmed]) {
        gitLastmodByFile[trimmed] = currentIso;
      }
    }
  } catch (e) {
    console.warn('Could not inspect git commit dates for pages:', e.message);
  }

  const ROUTE_SOURCE_FILES = {
    '/analysis-archive/': 'pages/AnalysisArchive.tsx',
    '/privacy-policy/': 'pages/PrivacyPolicy.tsx',
    '/disclaimer/': 'pages/Disclaimer.tsx',
    '/contact/': 'pages/Contact.tsx',
    '/about/': 'pages/About.tsx',
    '/references/': 'pages/References.tsx',
    '/faq/': 'pages/FAQ.tsx',
    '/glossary/': 'pages/Glossary.tsx',
    '/operator-info/': 'pages/OperatorInfo.tsx',
    '/analysis/crime-statistics/': 'pages/CrimeStatistics.tsx',
    '/analysis/economic-impact/': 'pages/EconomicImpact.tsx',
    '/analysis/social-security/': 'pages/SocialSecurity.tsx',
    '/analysis/naturalization-paradox/': 'pages/NaturalizationParadox.tsx',
    '/analysis/burial-controversy/': 'pages/BurialControversy.tsx',
    '/analysis/land-acquisition/': 'pages/LandAcquisition.tsx',
    '/analysis/uk-immigration-lesson/': 'pages/UKImmigrationLesson.tsx',
    '/analysis/borderless-welfare-state/': 'pages/BorderlessWelfarePage.tsx',
    '/analysis/national-security/': 'pages/NationalSecurity.tsx',
    '/analysis/nigeria-case/': 'pages/NigeriaCase.tsx',
    '/analysis/simulation-model/': 'pages/MathematicalSimulation.tsx',
    '/analysis/labor-dilemma/': 'pages/LaborDilemma.tsx',
    '/analysis/video-guide/': 'pages/VideoGuide.tsx',
    '/analysis/statistical-evidence/': 'pages/StatisticalEvidence.tsx',
    '/analysis/risk-analysis/': 'pages/RiskAnalysis.tsx',
    '/analysis/labor-mismatch/': 'pages/LaborMismatch.tsx',
    '/analysis/summary-statistics/': 'pages/SummaryStatistics.tsx',
    '/analysis/policy-recommendations/': 'pages/PolicyRecommendations.tsx',
    '/analysis/conclusion/': 'pages/Conclusion.tsx',
    '/analysis/strategic-recommendations/': 'pages/StrategicRecommendations.tsx',
    '/analysis/symbiosis/': 'pages/SymbiosisPage.tsx',
    '/analysis/ai-simulation/': 'pages/AISimulation.tsx',
    '/analysis/non-prosecution/': 'pages/NonProsecutionAnalysis.tsx',
    '/analysis/crime-rate-factcheck/': 'pages/CrimeRateFactCheck.tsx'
  };

  // トピック別・罪種別・ステージ別・エリア別・月別・クロス特集ハブのメタ構築
  const hubRouteMeta = {};
  for (const hub of getAllEligibleHubs(newsItems)) {
    const route = hub.path.replace(/\/$/, '');
    routesToPrerender.push(route);
    hubRouteMeta[hub.path] = hub;
  }

  // 都道府県別・国籍別ページ（記事数5件以上のみ）のメタ・最新日付マップを構築
  const segmentRouteMeta = {};
  for (const [slug, prefName] of Object.entries(crimeSegments.prefectures || {})) {
    const matched = newsItems.filter((i) => i.location === prefName);
    if (matched.length < 5) continue;
    const route = `/analysis/crime-news/pref/${slug}`;
    const norm = `${route}/`;
    const latest = matched.map((x) => x.date).filter(Boolean).sort().slice(-1)[0] || latestNewsDate;
    routesToPrerender.push(route);
    segmentRouteMeta[norm] = { mode: 'pref', slug, label: prefName, items: matched, latestDate: latest };
  }
  for (const [slug, natName] of Object.entries(crimeSegments.nationalities || {})) {
    const matched = newsItems.filter((i) => i.nationality === natName);
    if (matched.length < 5) continue;
    const route = `/analysis/crime-news/nationality/${slug}`;
    const norm = `${route}/`;
    const latest = matched.map((x) => x.date).filter(Boolean).sort().slice(-1)[0] || latestNewsDate;
    routesToPrerender.push(route);
    segmentRouteMeta[norm] = { mode: 'nationality', slug, label: natName, items: matched, latestDate: latest };
  }

  const ADDENDUM_LASTMOD_ROUTES = new Set([
    '/analysis/social-security/',
    '/analysis/summary-statistics/',
    '/analysis/crime-statistics/',
    '/analysis/non-prosecution/',
    '/analysis/labor-mismatch/',
    '/analysis/economic-impact/',
    '/analysis/simulation-model/',
    '/analysis/uk-immigration-lesson/',
    '/analysis/burial-controversy/',
    '/analysis/conclusion/',
    '/analysis/national-security/',
    '/analysis/symbiosis/',
    '/analysis/borderless-welfare-state/'
  ]);
  const ADDENDUM_FLOOR_ISO = '2026-11-20T09:00:00+09:00';

  const routeLastmodIso = (normRoute) => {
    if (
      normRoute === '/' ||
      normRoute === '/analysis/crime-news/' ||
      normRoute === '/analysis/non-prosecution/' ||
      normRoute === '/analysis/crime-rate-factcheck/'
    ) {
      return latestNewsIso > ADDENDUM_FLOOR_ISO ? latestNewsIso : ADDENDUM_FLOOR_ISO;
    }
    if (hubRouteMeta[normRoute]) return `${hubRouteMeta[normRoute].stats.latestDate}T08:00:00+09:00`;
    if (segmentRouteMeta[normRoute]) return `${segmentRouteMeta[normRoute].latestDate}T08:00:00+09:00`;
    const srcFile = normRoute.startsWith('/analysis/image/') ? 'pages/ImagePage.tsx' : ROUTE_SOURCE_FILES[normRoute];
    const gitIso = srcFile && gitLastmodByFile[srcFile];
    if (ADDENDUM_LASTMOD_ROUTES.has(normRoute)) {
      return gitIso && gitIso > ADDENDUM_FLOOR_ISO ? gitIso : ADDENDUM_FLOOR_ISO;
    }
    if (gitIso) return gitIso;
    return '2026-11-08T08:00:00+09:00';
  };
  const routeLastmod = (normRoute) => routeLastmodIso(normRoute).slice(0, 10);

  // 全主要セクション一覧（Google検索のサイトリンク・ジャンプリンク表示用 SiteNavigationElement）
  const SITE_NAV_SECTIONS = [
    { name: '外国人犯罪ニュース速報DB（毎時更新）', url: `${SITE_URL}/analysis/crime-news/` },
    { name: '外国人犯罪統計（検挙率1.72倍・不起訴問題）', url: `${SITE_URL}/analysis/crime-statistics/` },
    { name: '社会保障タダ乗り問題（生活保護・国保未納・医療費）', url: `${SITE_URL}/analysis/social-security/` },
    { name: '移民と実質賃金低下・増税の悪循環', url: `${SITE_URL}/analysis/economic-impact/` },
    { name: '帰化と永住権の逆転現象・通名と安全保障', url: `${SITE_URL}/analysis/naturalization-paradox/` },
    { name: '外国人による土地買収・水源地・自衛隊周辺リスク', url: `${SITE_URL}/analysis/land-acquisition/` },
    { name: 'イスラム土葬問題と地域自治体の摩擦', url: `${SITE_URL}/analysis/burial-controversy/` },
    { name: '特定技能2号・育成就労・技能実習生失踪の構造', url: `${SITE_URL}/analysis/labor-dilemma/` },
    { name: '労働需給ミスマッチと求人倍率の真実', url: `${SITE_URL}/analysis/labor-mismatch/` },
    { name: '欧州福祉国家の破綻データ（移民1人4200万円赤字）', url: `${SITE_URL}/analysis/borderless-welfare-state/` },
    { name: '愛知県西尾市「県営緑町住宅」共生の現実', url: `${SITE_URL}/analysis/symbiosis/` },
    { name: '英国の移民政策失敗とブレグジットの教訓', url: `${SITE_URL}/analysis/uk-immigration-lesson/` },
    { name: '国家安全保障・スパイ防止法・治安リスク', url: `${SITE_URL}/analysis/national-security/` },
    { name: '2050年数理予測モデル（国民負担97兆円試算）', url: `${SITE_URL}/analysis/simulation-model/` },
    { name: 'よくある質問（FAQ：犯罪率・生活保護・不起訴の理由）', url: `${SITE_URL}/faq/` },
    { name: '分析レポート全30本アーカイブ一覧', url: `${SITE_URL}/analysis-archive/` }
  ];

  // 全48ルート＋地域・国籍別集計ページの高検索需要キーワード＆高CTRタイトル定義
  const SEO_ROUTE_CONFIG = {
    '/': {
      title: `外国人犯罪率の統計と逮捕ニュースDB（全${totalNewsCount}件）| 日本の岐路`,
      desc: `【毎時自動更新】警察庁統計で日本人比1.72倍に達する外国人犯罪率・不起訴問題、生活保護や国保負担、実質賃金低下の仕組みを公的データで徹底検証。全国地方紙・警察発表の外国人逮捕ニュース全${totalNewsCount}件を国籍別・都道府県別に公開。`,
      keywords: '外国人犯罪,外国人 犯罪率,外国人 犯罪 統計,外国人 不起訴 なぜ,外国人 生活保護 なぜ,外国人 国保 問題,特定技能2号 移民 違い,技能実習生 失踪,外国人 土地買収,クルド人 ベトナム人 中国人 犯罪',
      priority: '1.0', changefreq: 'hourly',
      faqs: [
        { q: '日本の外国人犯罪率は日本人と比べて高いのですか？', a: '警察庁の犯罪統計および2025年参議院内閣委員会での政府答弁データに基づくと、人口当たりの検挙人員比率は日本人の0.188%に対し来日外国人は0.323%であり、約1.72倍の高さとなっています。' },
        { q: '外国人犯罪のニュースや国籍別・都道府県別の事件一覧はどこで見られますか？', a: `当サイトの「外国人犯罪報道 日次データベース（/analysis/crime-news/）」にて、全国の地方紙・テレビ局・警察発表から毎時自動収集した全${totalNewsCount}件以上の事件を国籍別（ベトナム・中国・韓国・ブラジル・トルコ等）および47都道府県別に検索・閲覧できます。` },
        { q: '外国人労働者が増えるとなぜ日本人の給料（実質賃金）が上がらないのですか？', a: '人手不足の現場に安価な外国人労働力を供給し続けることで、本来起きるはずの「賃上げ」や「省力化・AI・ロボット投資」が先送りされ、低賃金構造と増税・社会保障費増大の悪循環が固定化するためです。' }
      ]
    },
    '/analysis/crime-news/': {
      title: `外国人逮捕ニュース一覧【毎日更新】国籍別・都道府県別DB（全${totalNewsCount}件）| 日本の岐路`,
      desc: `【${latestNewsDate}最新・全${totalNewsCount}件収録】全国の地方紙・ローカル局・警察発表から外国籍被疑者の逮捕・起訴・不起訴報道を毎時自動収集。ベトナム・中国・韓国・クルド（トルコ）・ブラジル等の国籍別や47都道府県別にリアルタイム検索できる外国人事件データベース。`,
      keywords: '外国人犯罪 ニュース,外国人犯罪 一覧,外国人 逮捕 速報,ベトナム人 逮捕,中国人 逮捕,クルド人 事件,外国人 不起訴 ニュース,不法滞在 摘発,技能実習生 逮捕,都道府県別 外国人犯罪',
      priority: '0.95', changefreq: 'hourly',
      faqs: [
        { q: '外国人犯罪ニュース一覧ではどの国籍の事件が多く報道されていますか？', a: `現在収録されている全${totalNewsCount}件の報道データベースでは、ベトナム国籍（窃盗・不法残留・薬物等）、中国籍（特殊詐欺・窃盗・組織犯罪等）、韓国籍、台湾籍、ブラジル国籍、フィリピン国籍、ネパール国籍、トルコ国籍などの事件が多く集計されています。` },
        { q: '都道府県別に外国人犯罪ニュースを絞り込むことはできますか？', a: 'はい。東京都、千葉県、静岡県、愛知県、大阪府、埼玉県、福岡県、茨城県など都道府県別の専用集計ページやフィルターボタンと国籍別フィルターを組み合わせて、地域ごとの最新の逮捕・事件報道を即座に確認できます。' }
      ]
    },
    '/analysis/crime-statistics/': {
      title: '【2026国会質疑】外国人犯罪率1.72倍と国籍別構成比（ベトナム32.6%・中国16.1%）検証 | 日本の岐路',
      desc: '警察庁答弁の定住外国人検挙率0.323%（日本人0.188%・約1.72倍）に加え、2026年10月参院法務委質疑で取り上げられたベトナム人検挙構成比32.6%（在留比18.2%）・中国人16.1%や罪種別倍率試算、不起訴問題を徹底検証。',
      keywords: '外国人 犯罪 国籍別 割合,ベトナム人 犯罪 割合 32.6%,外国人 犯罪率 1.72倍,外国人 不起訴 なぜ,来日外国人 犯罪白書,警察庁 外国人犯罪',
      priority: '0.92', changefreq: 'weekly',
      faqs: notionAddendumFaqs['crime-statistics'] || []
    },
    '/analysis/social-security/': {
      title: '【厚労省データ】外国人国保の収納率63%(未納5.29倍)と生活保護支給の実態 | 日本の岐路',
      desc: '厚労省約150自治体集計（内閣官房PDF・衆院答弁書）で判明した外国人世帯主の国保収納率63%（全体93%・未収納率5.29倍）と構成比拡大試算、最高裁判決後も続く外国人生活保護（年1,200億円規模）や医療費未払いの実態を公的データで検証。',
      keywords: '外国人 国保 未納 割合,外国人 国民健康保険 収納率 63%,外国人 生活保護 なぜ,外国人 生活保護 最高裁,外国人 医療費 未払い,外国人 社会保障 負担',
      priority: '0.92', changefreq: 'weekly',
      faqs: notionAddendumFaqs['social-security'] || []
    },
    '/analysis/economic-impact/': {
      title: '外国人労働者が増えると給料は下がる？賃金回復6段階戦略と増税悪循環 | 日本の岐路',
      desc: '「人手不足は賃金上昇のゴールデンタイム」――安価な労働供給を先に増やさず、40年停滞からの賃金回復・AI省人化・一人当たりGDP向上・少子化障壁低減へつなぐ6段階戦略と、増税と所得減少の悪循環メカニズムを解説。',
      keywords: '外国人労働者 賃金 上がらない なぜ,人手不足 賃上げ 少子化対策,実質賃金 低下 理由,増税 所得減少 悪循環,1人当たりGDP 低下 移民',
      priority: '0.9', changefreq: 'weekly',
      faqs: notionAddendumFaqs['economic-impact'] || []
    },
    '/analysis/naturalization-paradox/': {
      title: '帰化と永住権の違いは？要件の年数が逆転している理由 | 日本の岐路',
      desc: 'なぜ日本では「永住権（原則10年）」より「帰化（日本国籍取得・原則5年）」の方が居住年数ハードルが低いのか？帰化要件の緩和・簡易帰化、帰化後の犯罪歴や国会議員・公務員就任リスク、通名制度が悪用される口座犯罪の盲点を法制度から徹底検証。',
      keywords: '帰化 永住権 違い,帰化 永住権 どっちが簡単,帰化 条件 緩和 問題点,日本国籍 取得 5年,帰化 取り消し できない,通名 犯罪 なぜ,国籍法 改正 リスク',
      priority: '0.88', changefreq: 'weekly',
      faqs: [
        { q: '永住権と帰化（日本国籍取得）はどちらが条件が厳しいですか？', a: '一般的な永住許可が原則10年の継続在留を要するのに対し、普通帰化は原則5年（日本人の配偶者等の簡易帰化は1〜3年）で申請可能という「逆転現象」が起きています。一度帰化すると参政権や公務就任権が得られ、重大犯罪を犯しても日本国籍を剥奪・強制送還することは原則できません。' }
      ]
    },
    '/analysis/land-acquisition/': {
      title: '外国人の土地買収はなぜ規制できない？北海道・水源地・基地周辺 | 日本の岐路',
      desc: '中国資本等の外国勢力による北海道・沖縄・対馬・ニセコ等の水源地、広大な森林、自衛隊基地・原発周辺の土地買収実態を解説。GATS（サービス貿易一般協定）留保欠落と重要土地等調査法の罰則・買収阻止規定の不備、安全保障上の致命的リスクを検証。',
      keywords: '外国人 土地買収 規制,北海道 土地買収 中国 水源地,自衛隊基地周辺 土地買収,重要土地等調査法,対馬 沖縄 外国資本 買収,日本 土地 外国人 なぜ買える',
      priority: '0.88', changefreq: 'weekly',
      faqs: [
        { q: 'なぜ日本では外国人が簡単に土地や水源地を買えるのですか？', a: '1994年のWTO（GATS協定）締結時に日本政府が外国資本による土地取得制限の留保条項を設けなかったこと、また2022年施行の重要土地等調査法も「事前届出と利用調査」にとどまり、売買自体を禁止・没収する強制力がないためです。' }
      ]
    },
    '/analysis/burial-controversy/': {
      title: '【宗教規範 vs 日本法】土葬問題・神戸神社損壊事例と「相互尊重」の非対称性を検証 | 日本の岐路',
      desc: '火葬率99.97%の日本で起きている土葬墓地対立に加え、国会質疑で焦点となった「宗教上の規範と日本法が衝突した際の優先順位」、2023年神戸・瑞丘八幡神社損壊事例と教義的非対称性から共生条件の限界を検証。',
      keywords: 'イスラム教 日本法 優先,ムスリム 神社 破壊 神戸,イスラム教 土葬 なぜ,大分県 日出町 土葬 反対,宮城県 土葬 墓地,火葬 土葬 トラブル',
      priority: '0.88', changefreq: 'weekly',
      faqs: notionAddendumFaqs['burial-controversy'] || []
    },
    '/analysis/labor-dilemma/': {
      title: '特定技能2号は移民と何が違う？育成就労と技能実習生失踪の問題 | 日本の岐路',
      desc: 'なぜ技能実習生は年間9,000人以上も失踪し、不法滞在や組織犯罪（銅線窃盗・闇バイト）に流入するのか？「育成就労」による転籍緩和が招く地方から都市部への人材流出と、「特定技能2号」の対象拡大による家族帯同・無期限在留（事実上の定住移民化）のリスクを検証。',
      keywords: '特定技能2号 移民 違い,特定技能2号 家族帯同 永住,技能実習生 失踪 理由,技能実習生 失踪 犯罪,育成就労 問題点 転籍,外国人雇用 働き方改革 矛盾',
      priority: '0.88', changefreq: 'weekly',
      faqs: [
        { q: '特定技能2号が「事実上の移民受け入れ」と言われる理由は？', a: '特定技能1号（最長5年・家族帯同不可）と異なり、特定技能2号は在留期間の更新上限がなく（無期限滞在が可能）、配偶者や子どもの家族帯同が認められ、将来的な永住権申請にも直結するためです。これが建設・製造・外食・農業など全分野へ拡大されました。' }
      ]
    },
    '/analysis/labor-mismatch/': {
      title: '【国際比較】「人手不足」の6分解と南アフリカ失業率33.7%(LU3 44%)との対比・求人倍率検証 | 日本の岐路',
      desc: '日本の「人手不足」を総数・技能・賃金条件・企業規模維持など6つに分解し、事務職（0.4倍）とのミスマッチや、極端な人手あまり状態にある南アフリカ最新労働統計（Stats SA Q3 2026：失業率33.7%・LU3 44.0%）との構造差を検証。',
      keywords: '人手不足 人手あまり 違い,人手不足 嘘 採用難,有効求人倍率 職種別 ミスマッチ,南アフリカ 失業率 33.7%,人手不足 賃上げ 省力化',
      priority: '0.88', changefreq: 'weekly',
      faqs: notionAddendumFaqs['labor-mismatch'] || []
    },
    '/analysis/borderless-welfare-state/': {
      title: '移民1人で4,200万円の赤字？オランダ『国境なき福祉国家』(IZA 17569)原典調査 | 日本の岐路',
      desc: 'アムステルダム大学ヤン・ファン・デ・ベーク博士らが全国民マイクロデータで算出したIZA Discussion Paper 17569・オランダ議会政府回答（2021Z13767）原典と、出身地域・世代・移住動機別の生涯純財政貢献分析を解説。',
      keywords: 'オランダ 移民 財政 IZA 17569,Borderless Welfare State 原典,移民 財政負担 4200万円,欧州 移民政策 失敗 データ,福祉国家 移民 両立しない',
      priority: '0.88', changefreq: 'weekly',
      faqs: notionAddendumFaqs['borderless-welfare'] || []
    },
    '/analysis/symbiosis/': {
      title: '【現場検証】西尾市緑町住宅＆蕨市・川口市の生活環境実態と「多文化共生」の限界 | 日本の岐路',
      desc: '住民の多数が外国人となった愛知県西尾市「県営緑町住宅」と、埼玉県蕨市・川口市周辺の住民証言・短時間街頭取材検証を整理。ごみ出し摩擦・駅前滞留・自治会費未納・学校負担など現場のリアルな課題を公開。',
      keywords: '蕨市 川口市 外国人 生活環境,西尾市 県営緑町住宅 外国人,多文化共生 報道 街頭取材,多文化共生 失敗 事例 日本,公立小学校 外国人児童 負担',
      priority: '0.88', changefreq: 'weekly',
      faqs: notionAddendumFaqs['symbiosis'] || []
    },
    '/analysis/uk-immigration-lesson/': {
      title: '【欧州最新比較】英国・イタリア(メストレ)・スウェーデン2026法案・フランスに学ぶ移民の教訓 | 日本の岐路',
      desc: '英国NHS・治安悪化に加え、ヴェネツィア警察（2023/2026）や県庁レッドゾーン検討で追うイタリア・メストレの実態、税・社会保障悪用を対象とするスウェーデン2026年3月法案、フランスの生活費抗議を比較検証。',
      keywords: 'ヨーロッパ 移民 治安 失敗 事例,イタリア メストレ 治安,スウェーデン 移民 国外追放,イギリス 移民政策 失敗,ブレグジット 原因 移民',
      priority: '0.88', changefreq: 'weekly',
      faqs: notionAddendumFaqs['uk-immigration-lesson'] || []
    },
    '/analysis/national-security/': {
      title: '【2026安保最新】尖閣335日・沖縄影響工作(JIIA)・中国邦人拘束17人・JTロシア接収と防諜課題 | 日本の岐路',
      desc: '2026年版防衛白書（尖閣連続確認335日）、JIIA沖縄アイデンティティ工作分析（2026/11）、フィリピン撤退教訓、JTロシア4社一時管理、中国「国家安全」邦人拘束17人（外交青書2026）、日中世論調査（対日否定87.7%）を網羅検証。',
      keywords: '沖縄 基地反対運動 中国 影響工作,中国 邦人拘束 17人,日中世論調査 87.7%,尖閣 335日 防衛白書,スパイ防止法 日本 なぜない',
      priority: '0.88', changefreq: 'weekly',
      faqs: notionAddendumFaqs['national-security'] || []
    },
    '/analysis/nigeria-case/': {
      title: 'JICAアフリカ・ホームタウン構想とは？ナイジェリア誤報の経緯 | 日本の岐路',
      desc: '日本の地方自治体（木更津市・三条市・長井市・今治市）をアフリカ諸国の「故郷」と位置づけた構想が現地メディアで「特別ビザ発給・移住解禁」と誤報・拡散された経緯と、安易な自治体間協定が招く大量移住圧力の危険性。',
      keywords: 'ナイジェリア JICA ホームタウン,アフリカ 自治体 特別ビザ 誤報,木更津 三条 長井 今治 アフリカ,多文化共生 トラブル 事例',
      priority: '0.84', changefreq: 'weekly'
    },
    '/analysis/simulation-model/': {
      title: '【数理検証】外国人比率1%上限案(期待件数71.3%減)・みかん理論・2050年97兆円コスト試算 | 日本の岐路',
      desc: '現状約3.48%（428万人）から比率1%目安（123万人）へ縮小した場合の期待件数71.3%減の算術構造、『C = J + F』の事前予防原則、みかん理論の正確な数理構造と2050年累計97兆円の社会的コスト推計を可視化。',
      keywords: '外国人 比率 上限 何パーセント,移民 受け入れ 規模 犯罪 リスク,外国人比率 1% 試算 71.3%,みかん理論 C=J+F,移民 社会的コスト 97兆円',
      priority: '0.88', changefreq: 'weekly',
      faqs: notionAddendumFaqs['simulation-model'] || []
    },
    '/analysis/statistical-evidence/': {
      title: '移民で経済成長する？外国人比率と実質賃金の国際比較グラフ | 日本の岐路',
      desc: 'OECD諸国の外国人比率と1人あたりGDP成長率・実質賃金推移を比較すると「移民が多い国ほど一人あたりが豊かになるわけではない」という統計事実が浮かび上がります。視覚的グラフで検証する経済効果と実質賃金の国際比較。',
      keywords: '移民 経済成長 グラフ,外国人比率 GDP 相関,移民 統計データ 国際比較,外国人労働者 推移 グラフ',
      priority: '0.84', changefreq: 'weekly'
    },
    '/analysis/risk-analysis/': {
      title: '外国人受け入れのデメリット5つ：治安・経済・社会保障ほか | 日本の岐路',
      desc: '外国人労働者・移民の拡大が日本社会にもたらす5つの構造的リスク（①犯罪・治安悪化、②賃金抑制、③生活保護・国保負担、④土葬・地域摩擦、⑤土地買収・安全保障）を一覧でわかりやすく整理。',
      keywords: '外国人受け入れ 問題点 まとめ,移民 デメリット 一覧,外国人労働者 問題 5つ,多文化共生 リスク まとめ',
      priority: '0.85', changefreq: 'weekly'
    },
    '/analysis/summary-statistics/': {
      title: '【2026年最新】在留外国人428万人(総人口3.5%)・国保収納率63%・検挙率1.72倍 統計一覧 | 日本の岐路',
      desc: '2026年6月末の在留外国人数428万1,026人（過去最多・総人口約3.5%）、国保収納率63% vs 全体93%、定住外国人検挙率1.72倍、尖閣335日、永住審査厳格化など最新一次資料を一目で確認できる統計総括ページ。',
      keywords: '在留外国人 2026 何人,日本 外国人 割合 何パーセント,外国人問題 統計 まとめ,国保 収納率 63%,外国人 検挙率 1.72倍',
      priority: '0.90', changefreq: 'weekly',
      faqs: notionAddendumFaqs['summary-statistics'] || []
    },
    '/analysis/policy-recommendations/': {
      title: '人手不足の解決策は外国人以外にある？省力化・賃上げの政策提言 | 日本の岐路',
      desc: '増税と所得減少の悪循環を止め、日本人の実質賃金を引き上げるための政策提言。安易な外国人受け入れ枠の凍結、AI・ロボティクス投資への税制優遇、国保・生活保護の厳格化による持続可能な自立経済への道筋。',
      keywords: '人手不足 解決策 外国人以外,省力化投資 ロボット 賃上げ,移民政策 見直し 提言,日本経済 復活 政策',
      priority: '0.82', changefreq: 'monthly'
    },
    '/analysis/strategic-recommendations/': {
      title: '外国人政策の改革案：入管法・国籍法・土地規制の3つの提言 | 日本の岐路',
      desc: '日本の治安と国家主権を守るために今すぐ実行すべき3つの戦略的提言（①入管管理と不法滞在ゼロプラン、②帰化・永住審査の厳格化と相互主義に基づく土地取得規制、③公的扶助・国保の適正化）。',
      keywords: '入管法 改正 厳格化,国籍法 土地規制 相互主義,不法滞在 強制送還,外国人政策 ロードマップ',
      priority: '0.82', changefreq: 'monthly'
    },
    '/analysis/conclusion/': {
      title: '多文化共生「相互尊重」の限界と神道に根づく日本の秩序・棲み分け結論 | 日本の岐路',
      desc: '共通ルール遵守を前提にしない「相互尊重による共存」の論理的限界と、八百万・感謝・「いただきます」など海外からも高く評価される日本の精神文化・治安基盤を守り抜く「棲み分け」の結論。',
      keywords: '多文化共生 相互尊重 限界 なぜ,日本 治安 良い 理由 文化 神道,棲み分けの共生 日本,移民問題 結論 日本の未来',
      priority: '0.84', changefreq: 'monthly',
      faqs: notionAddendumFaqs['conclusion'] || []
    },
    '/analysis/ai-simulation/': {
      title: '生成AIは日本の移民政策をどう予測する？2040年シミュレーション | 日本の岐路',
      desc: '複数の最新AIに日本の人口動態・財政・治安パラメータを入力して多角的に検証。政治的忖度を排した数理・論理モデルが警告する「低熟練労働力受け入れの不可逆的コスト」とは。',
      keywords: 'AI 予測 日本 移民 2040年,生成AI シミュレーション 人口減少,外国人問題 AI分析',
      priority: '0.82', changefreq: 'monthly'
    },
    '/analysis/video-guide/': {
      title: '【動画解説】外国人労働者問題を5分で理解する | 日本の岐路',
      desc: '公的統計データが示す外国人犯罪率・実質賃金停滞・社会保障負担の構造を、映像とグラフで直感的に理解できる解説動画ページ。',
      keywords: '外国人問題 解説動画,移民政策 わかりやすい 動画,日本の岐路 動画ガイド',
      priority: '0.80', changefreq: 'monthly'
    },
    '/analysis-archive/': {
      title: '外国人問題・移民政策の分析レポート一覧 | 日本の岐路',
      desc: '警察庁の外国人犯罪統計、日次事件速報データベース、生活保護・国保負担問題、実質賃金低下、帰化と永住権の逆転、北海道の土地買収、イスラム土葬摩擦など全専門レポートを網羅したアーカイブ一覧。',
      keywords: '外国人問題 レポート 一覧,移民政策 分析 まとめ,外国人犯罪 社会保障 土地買収 記事一覧',
      priority: '0.90', changefreq: 'daily'
    },
    '/faq/': {
      title: '外国人犯罪率・不起訴・生活保護のよくある質問 | 日本の岐路',
      desc: '「外国人の犯罪率は本当に高い？」「なぜ外国人の生活保護や国保給付の問題が起きる？」「特定技能2号と移民の違いは？」「なぜ不起訴が多い？」など、検索される疑問に公的データと法的根拠で回答。',
      keywords: '外国人犯罪 FAQ,外国人 生活保護 疑問,外国人 不起訴 なぜ,特定技能2号 疑問 回答',
      priority: '0.88', changefreq: 'weekly',
      faqs: [
        { q: '外国人犯罪率が日本人の1.72倍というのはどの統計ですか？', a: '警察庁の犯罪統計および2025年参議院内閣委員会における政府答弁数値（日本人の人口比検挙割合0.188%に対し、来日外国人は0.323%）に基づいています。' },
        { q: '外国人への生活保護支給は法律で義務付けられているのですか？', a: 'いいえ。2014年7月の最高裁判決により、外国人は生活保護法の適用対象外であり受給権はないことが確定していますが、1954年の旧厚生省通知に基づく行政措置として自治体が支給を続けています。' },
        { q: '特定技能2号になると家族を日本に呼び寄せて永住できるのですか？', a: 'はい。特定技能2号には在留期間の更新上限がなく、配偶者や子の帯同が認められており、在留継続により永住許可や帰化申請の要件を満たすことが可能です。' }
      ]
    },
    '/glossary/': {
      title: '入管・外国人政策の用語集（特定技能・育成就労・仮放免）| 日本の岐路',
      desc: '特定技能1号・2号、育成就労、技能実習、在留資格、仮放免、退去強制、不起訴処分（起訴猶予）、簡易帰化、重要土地等調査法、GATS協定など、ニュースを理解するための重要専門用語をわかりやすく解説。',
      keywords: '特定技能 育成就労 用語,仮放免 退去強制 違い,簡易帰化 とは,入管 用語集',
      priority: '0.80', changefreq: 'monthly'
    },
    '/references/': {
      title: '外国人犯罪・入管統計の出典一覧（警察庁・法務省・厚労省）| 日本の岐路',
      desc: '当サイトの全分析で使用している警察庁、法務省出入国在留管理庁、厚生労働省、総務省統計局、参議院・衆議院委員会答弁、および海外学術論文（オランダ・英国）の一次出典リンク集。',
      keywords: '警察庁 来日外国人犯罪 統計 出典,法務省 犯罪白書 リンク,入管庁 不法残留者数 統計',
      priority: '0.78', changefreq: 'monthly'
    },
    '/about/': {
      title: '当サイト「日本の岐路」について：公的統計データに基づく独立系検証プロジェクト',
      desc: '感情論やイデオロギーを排し、政府公開の一次統計（警察庁・法務省・厚労省）と海外の実証研究に基づいて日本の外国人政策・治安・経済構造を客観的に可視化するリサーチプロジェクトの概要。',
      keywords: '日本の岐路 サイト概要,外国人政策 データ検証',
      priority: '0.70', changefreq: 'monthly'
    },
    '/operator-info/': {
      title: '運営者情報・編集方針・ファクトチェック基準 | 日本の岐路',
      desc: '日本社会構造分析リサーチの運営者情報、一次情報に基づくデータ検証プロセス、および日次ニュース自動収集の編集基準について。',
      keywords: '日本の岐路 運営者情報,日本社会構造分析リサーチ',
      priority: '0.65', changefreq: 'monthly'
    },
    '/privacy-policy/': {
      title: 'プライバシーポリシー・個人情報保護方針 | 日本の岐路',
      desc: '当サイトにおけるアクセス解析ツール、広告配信、および個人情報の取り扱いに関するプライバシーポリシー。',
      keywords: 'プライバシーポリシー,日本の岐路',
      priority: '0.50', changefreq: 'yearly'
    },
    '/disclaimer/': {
      title: '免責事項・著作権・引用規定について | 日本の岐路',
      desc: '当サイトのデータ引用規定、報道記事リンクの取り扱い、および免責事項について。',
      keywords: '免責事項,日本の岐路',
      priority: '0.50', changefreq: 'yearly'
    },
    '/contact/': {
      title: 'お問い合わせ・情報提供フォーム | 日本の岐路',
      desc: '当サイトの分析データに関するご質問、地域のトラブル事例や報道情報の提供窓口。',
      keywords: 'お問い合わせ,情報提供,日本の岐路',
      priority: '0.55', changefreq: 'yearly'
    }
  };

  // 証拠資料画像ページ（/analysis/image/1/ 〜 /analysis/image/15/）の個別SEO定義
  const IMAGE_TITLES = {
    1: '証拠資料1：来日外国人検挙人員・犯罪率推移と警察庁統計データ図解',
    2: '証拠資料2：国籍別検挙件数・罪種別内訳と組織犯罪の実態グラフ',
    3: '証拠資料3：外国人労働者急増と日本人の実質賃金低下の相関データ',
    4: '証拠資料4：オランダ『国境なき福祉国家』出身地域別の生涯財政収支グラフ',
    5: '証拠資料5：国民健康保険・生活保護における外国人受給額と自治体負担データ',
    6: '証拠資料6：技能実習生の失踪者数推移（年間9,000人超）と不法滞在化データ',
    7: '証拠資料7：特定技能1号・2号と育成就労の制度比較および永住権ルート図解',
    8: '証拠資料8：職種別有効求人倍率のミスマッチ（事務職余剰と現場不足）統計',
    9: '証拠資料9：帰化許可要件（在留5年）と永住許可要件（在留10年）の逆転比較表',
    10: '証拠資料10：外国資本による北海道・重要インフラ・水源地買収マップと面積推移',
    11: '証拠資料11：イギリスの純移民数急増とNHS医療待機者数・治安コスト推移',
    12: '証拠資料12：公営住宅・地域社会における外国人集住と自治体行政コスト検証',
    13: '証拠資料13：2050年までの外国人受け入れに伴う累計97兆円の社会的コスト試算',
    14: '証拠資料14：主要OECD諸国の外国人労働者比率と1人あたりGDP成長率の散布図',
    15: '証拠資料15：増税・社会保険料増と実質賃金低下の悪循環および省力化投資の比較'
  };
  for (let i = 1; i <= 15; i++) {
    SEO_ROUTE_CONFIG[`/analysis/image/${i}/`] = {
      title: `${IMAGE_TITLES[i]} | 日本の岐路 統計図解アーカイブ`,
      desc: `【高解像度統計スライド】${IMAGE_TITLES[i]}。政府公的統計・国会答弁・海外実証論文に基づく一次エビデンス図解資料。`,
      keywords: `外国人問題 グラフ,移民 統計 図解,${IMAGE_TITLES[i].replace(/証拠資料\d+：/, '')}`,
      priority: '0.75',
      changefreq: 'monthly'
    };
  }
  for (const [norm, meta] of Object.entries(segmentRouteMeta)) {
    const cnt = meta.items.length;
    SEO_ROUTE_CONFIG[norm] = meta.mode === 'pref'
      ? {
          title: `${meta.label}の外国人犯罪・逮捕ニュース一覧（全${cnt}件）| 日本の岐路`,
          desc: `${meta.label}内で報道された外国籍被疑者の逮捕・起訴・判決ニュース全${cnt}件（最新日: ${meta.latestDate}）。罪種別の内訳と国籍別の発生件数を一覧で確認できます。`,
          keywords: `${meta.label} 外国人犯罪,${meta.label} 外国人 逮捕,外国人 逮捕 ニュース,${meta.label} 治安`,
          priority: '0.82',
          changefreq: 'daily'
        }
      : {
          title: `${meta.label}の犯罪・逮捕ニュース一覧（全${cnt}件）| 日本の岐路`,
          desc: `${meta.label}の被疑者による日本国内での事件・逮捕報道全${cnt}件（最新日: ${meta.latestDate}）。都道府県別の発生傾向と主な罪種内訳を集計・掲載しています。`,
          keywords: `${meta.label} 犯罪,${meta.label} 逮捕,外国人 逮捕 ニュース,${meta.label} 事件 一覧`,
          priority: '0.82',
          changefreq: 'daily'
        };
  }

  const nonProsItemsForSeo = newsItems.filter((i) => i.stage === '不起訴');
  const nonProsShareSeo = totalNewsCount > 0 ? ((nonProsItemsForSeo.length / totalNewsCount) * 100).toFixed(1) : '0.0';
  const nonProsLatestSeo = nonProsItemsForSeo[0]?.date || latestNewsDate;
  SEO_ROUTE_CONFIG['/analysis/non-prosecution/'] = {
    title: `【一覧・構造解説】外国人犯罪の「不起訴」はなぜ？(${nonProsItemsForSeo.length}件実録)と起訴便宜主義・司法実務 | 日本の岐路`,
    desc: `ニュースで外国籍被疑者の「不起訴処分」が相次ぐ背景を日本の刑事訴訟法・起訴便宜主義・通訳コスト・強制送還手続から客観解説。国内報道から抽出した最新の不起訴${nonProsItemsForSeo.length}件一覧も同時収録。`,
    keywords: '外国人 不起訴 なぜ,外国人犯罪 不起訴 一覧,外国人 逮捕 不起訴 理由,起訴猶予,嫌疑不十分,検察審査会',
    priority: '0.92',
    changefreq: 'daily',
    faqs: [
      {
        q: '外国人犯罪のニュースで「不起訴処分」と報じられるのは、本当に無罪（冤罪）だからですか？',
        a: '必ずしも無実を意味しません。日本の不起訴処分には「嫌疑なし」「嫌疑不十分」のほかに、犯罪事実が明白でも被害弁償や情状等を考慮して起訴を見送る「起訴猶予（刑事訴訟法第248条）」が含まれます。'
      },
      {
        q: '検察庁はなぜ不起訴になった詳細な理由をニュース発表しないのですか？',
        a: '検察は公判を開かない以上、被疑者・関係者の名誉やプライバシー保護、捜査上の支障回避の観点から、個別事案の不起訴理由（起訴猶予・嫌疑不十分等の区分）を原則非公表としています。'
      },
      {
        q: '不起訴処分に納得できない場合、被害者や遺族は不服を申し立てられますか？',
        a: 'はい。告訴人・告発人や被害者・遺族等は、一般市民11名で構成される「検察審査会」に不起訴処分の当否を審査するよう申し立てることができます。審査会が「起訴相当」を2度議決すると強制起訴の手続へ進みます。'
      },
      {
        q: '現在このサイトに記録されている最新の「不起訴」報道は何件ありますか？',
        a: `国内メディア一次報道アーカイブ（全${totalNewsCount}件）のうち、「不起訴」ステージに分類された報道記録は現在${nonProsItemsForSeo.length}件（全体の${nonProsShareSeo}%、最新収録日${nonProsLatestSeo}）です。`
      },
      ...(notionAddendumFaqs['non-prosecution'] || [])
    ]
  };

  const catCountMapSeo = new Map();
  for (const it of newsItems) {
    const c = it.crimeCategory || 'その他';
    catCountMapSeo.set(c, (catCountMapSeo.get(c) || 0) + 1);
  }
  const top3CatsText = Array.from(catCountMapSeo.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c, n]) => `${c}(${n}件)`)
    .join('、');

  SEO_ROUTE_CONFIG['/analysis/crime-rate-factcheck/'] = {
    title: '【統計検証】「外国人犯罪率は日本人より低い」は本当かデマか？警察庁答弁1.72倍の計算根拠と3つの落とし穴 | 日本の岐路',
    desc: `SNS等で議論が割れる「外国人犯罪率」について、2025年11月参議院内閣委員会の警察庁答弁（定住外国人0.323% vs 日本人0.188%＝約1.72倍）と、なぜ反対の結論が出るのかを計算式から検証します。`,
    keywords: '外国人 犯罪率 デマ,外国人 犯罪率 本当,外国人 犯罪率 日本人 比較,外国人 犯罪率 警察庁,1.72倍,来日外国人 統計',
    priority: '0.92',
    changefreq: 'daily',
    faqs: [
      {
        q: '「外国人の犯罪率は日本人の1.72倍」という数字はどこが出典ですか？',
        a: '2025年11月の参議院内閣委員会における警察庁答弁に基づく比較データで、短期滞在者を除いた定住外国人の刑法犯検挙率0.323%を日本人の0.188%で除した数値（約1.72倍）が出典です。'
      },
      {
        q: '「外国人の犯罪率が高いのはデマ」と主張する記事は何を根拠にしていますか？',
        a: '主に「外国人全体は20〜30代の若年層が多く、高齢者の多い日本人全体と年齢補正なしで比較するのは不公平である」という点や、警察庁統計のうち「来日外国人」区分のみを取り出した比率などを根拠にしています。'
      },
      {
        q: '日本の外国人犯罪報道で実際に多い罪種は何ですか？',
        a: `当サイトが収集した直近の国内一次報道${totalNewsCount}件の傾向では、${top3CatsText}などが上位を占めています。`
      }
    ]
  };

  for (const [norm, hub] of Object.entries(hubRouteMeta)) {
    SEO_ROUTE_CONFIG[norm] = {
      title: hub.title,
      desc: hub.desc,
      keywords: hub.keywords,
      priority: hub.mode === 'cross' ? '0.80' : '0.85',
      changefreq: hub.mode === 'month' ? 'weekly' : 'daily',
      faqs: hub.faqs
    };
  }

  const escapeHtmlAttr = (str) => String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const stripHtmlTags = (str) => String(str || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  // 外部CSSキャッシュ（/assets/index-*.css は netlify.toml で 1年間 immutable キャッシュ）を活かし全HTMLへの98KB重複インライン展開を廃止
  const baseInlinedTemplate = template;

  for (const url of routesToPrerender) {
    const context = {};
    const { html: appHtml, helmet } = render(url, context);

    const normalizedUrl = url.endsWith('/') ? url : `${url}/`;
    const canonicalUrl = `${SITE_URL}${normalizedUrl}`;
    const seoCfg = SEO_ROUTE_CONFIG[normalizedUrl] || {
      title: stripHtmlTags(helmet?.title?.toString()) || '日本の岐路：外国人問題・移民政策の統計分析',
      desc: '公的統計データに基づく日本の外国人労働者・治安・社会保障・安全保障リスクの包括的検証。',
      keywords: '外国人犯罪,外国人労働者,移民政策,社会保障,治安統計',
      priority: '0.80',
      changefreq: 'weekly'
    };

    // 本文HTMLから各セクションの見出し（h2 / h3）を自動抽出して id="section-N" を付与し、構造化データ hasPart に変換
    const sectionParts = [];
    let secIdx = 1;
    const seenHeadings = new Set();
    const enrichedAppHtml = appHtml.replace(/<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi, (full, tag, attrs, inner) => {
      if (sectionParts.length >= 25) return full;
      const text = stripHtmlTags(inner);
      if (text && text.length >= 4 && text.length <= 90 && !seenHeadings.has(text) && !/^(ナビゲーション|メニュー|目次|Crawler)/i.test(text)) {
        seenHeadings.add(text);
        const currentIdx = secIdx++;
        const secId = `section-${currentIdx}`;
        sectionParts.push({
          '@type': 'WebPageElement',
          'position': currentIdx,
          'name': text,
          'url': `${canonicalUrl}#${secId}`
        });
        if (!/\bid\s*=/i.test(attrs)) {
          return `<${tag}${attrs} id="${secId}">${inner}</${tag}>`;
        }
      }
      return full;
    });

    const segMeta = segmentRouteMeta[normalizedUrl] || null;
    const hubMeta = hubRouteMeta[normalizedUrl] || null;
    const pageModifiedIso = routeLastmodIso(normalizedUrl);

    // 全セクションが検索結果にリッチ表示されるための統合 @graph JSON-LD を構築
    const graphNodes = [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        'name': '日本の岐路：外国人問題・治安・経済・社会保障の統計検証データベース',
        'alternateName': ['日本の岐路', '外国人犯罪報道日次データベース', '日本社会構造分析リサーチ'],
        'url': `${SITE_URL}/`,
        'inLanguage': 'ja'
      },
      {
        '@type': 'ItemList',
        '@id': `${SITE_URL}/#site-navigation`,
        'name': '主要分析セクション・ナビゲーション一覧',
        'itemListElement': SITE_NAV_SECTIONS.map((nav, idx) => ({
          '@type': 'SiteNavigationElement',
          'position': idx + 1,
          'name': nav.name,
          'url': nav.url
        }))
      },
      {
        '@type': (normalizedUrl === '/' || normalizedUrl === '/analysis/crime-news/' || segMeta) ? 'CollectionPage' : 'TechArticle',
        '@id': `${canonicalUrl}#article`,
        'isPartOf': { '@id': `${SITE_URL}/#website` },
        'headline': seoCfg.title,
        'name': seoCfg.title,
        'description': seoCfg.desc,
        'keywords': seoCfg.keywords,
        'inLanguage': 'ja',
        'image': [`${SITE_URL}/ogp-image-2.jpg`],
        'url': canonicalUrl,
        'mainEntityOfPage': { '@type': 'WebPage', '@id': canonicalUrl },
        'author': {
          '@type': 'Person',
          'name': 'Akuma Shogun',
          'jobTitle': '独立系社会・経済データビジュアライザー',
          'sameAs': ['https://note.com/ideal_kudu9256']
        },
        'publisher': {
          '@type': 'Organization',
          'name': '日本社会構造分析リサーチ',
          'logo': { '@type': 'ImageObject', 'url': `${SITE_URL}/ogp-image-2.jpg` }
        },
        'datePublished': '2026-07-01T08:00:00+09:00',
        'dateModified': pageModifiedIso,
        ...(sectionParts.length > 0 ? { 'hasPart': sectionParts } : {})
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        'itemListElement': normalizedUrl === '/'
          ? [{ '@type': 'ListItem', 'position': 1, 'name': 'ホーム', 'item': `${SITE_URL}/` }]
          : segMeta
            ? [
                { '@type': 'ListItem', 'position': 1, 'name': 'ホーム', 'item': `${SITE_URL}/` },
                { '@type': 'ListItem', 'position': 2, 'name': '外国人犯罪ニュースDB', 'item': `${SITE_URL}/analysis/crime-news/` },
                { '@type': 'ListItem', 'position': 3, 'name': segMeta.label, 'item': canonicalUrl }
              ]
            : [
                { '@type': 'ListItem', 'position': 1, 'name': 'ホーム', 'item': `${SITE_URL}/` },
                { '@type': 'ListItem', 'position': 2, 'name': '分析アーカイブ一覧', 'item': `${SITE_URL}/analysis-archive/` },
                { '@type': 'ListItem', 'position': 3, 'name': seoCfg.title.split(/[|｜]/)[0].trim(), 'item': canonicalUrl }
              ]
      }
    ];

    // FAQ構造化データの追加（検索結果でのアコーディオン・強調スニペット露出強化）
    if (Array.isArray(seoCfg.faqs) && seoCfg.faqs.length > 0) {
      graphNodes.push({
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        'mainEntity': seoCfg.faqs.map(f => ({
          '@type': 'Question',
          'name': f.q,
          'acceptedAnswer': { '@type': 'Answer', 'text': f.a }
        }))
      });
    }

    // 都道府県別・国籍別集計ページ用の最新事件 ItemList 構造化データ
    if (segMeta && segMeta.items.length > 0) {
      graphNodes.push({
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#segment-incidents`,
        'name': `${segMeta.label}の外国人犯罪・逮捕報道一覧（直近10件 / 全${segMeta.items.length}件）`,
        'numberOfItems': segMeta.items.length,
        'itemListElement': segMeta.items.slice(0, 10).map((item, idx) => ({
          '@type': 'ListItem',
          'position': idx + 1,
          'name': `[${item.date}] 【${item.location}・${item.nationality || '外国籍'}】${item.title}`,
          'description': item.summary || item.title,
          'url': `${canonicalUrl}#incident-${item.id}`
        }))
      });
    }

    // トピック別・罪種別・ステージ別・月別・エリア別・クロスハブ用 ItemList 構造化データ
    if (hubMeta && hubMeta.items.length > 0) {
      graphNodes.push({
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#hub-incidents`,
        'name': `${hubMeta.label}の関連報道一覧（直近10件 / 全${hubMeta.items.length}件）`,
        'numberOfItems': hubMeta.items.length,
        'itemListElement': hubMeta.items.slice(0, 10).map((item, idx) => ({
          '@type': 'ListItem',
          'position': idx + 1,
          'name': `[${item.date}] 【${item.location}・${item.nationality || '外国籍'}】${item.title}`,
          'description': item.summary || item.title,
          'url': `${canonicalUrl}#incident-${item.id}`
        }))
      });
    }

    // 外国人犯罪ニュース速報DBページ（/analysis/crime-news/）およびトップページには最新事件の Dataset & ItemList を動的注入
    if ((normalizedUrl === '/analysis/crime-news/' || normalizedUrl === '/') && newsItems.length > 0) {
      const latest20 = newsItems.slice(0, 20);
      graphNodes.push({
        '@type': 'Dataset',
        '@id': `${SITE_URL}/analysis/crime-news/#dataset`,
        'name': `日本国内の外国人犯罪・逮捕報道日次データベース（全${totalNewsCount}件・毎時更新）`,
        'description': `全国の地方紙・テレビ局・警察発表から自動収集された外国籍被疑者の事件・逮捕報道データベース（最新更新日：${latestNewsDate}、収録件数：${totalNewsCount}件）。`,
        'url': `${SITE_URL}/analysis/crime-news/`,
        'dateModified': latestNewsIso,
        'license': 'https://creativecommons.org/publicdomain/zero/1.0/',
        'creator': { '@type': 'Organization', 'name': '日本社会構造分析リサーチ' }
      });
      if (normalizedUrl === '/analysis/crime-news/') {
        graphNodes.push({
          '@type': 'ItemList',
          '@id': `${canonicalUrl}#latest-incidents`,
          'name': `最新の外国人犯罪・逮捕報道一覧（直近20件 / 全${totalNewsCount}件）`,
          'numberOfItems': totalNewsCount,
          'itemListElement': latest20.map((item, idx) => ({
            '@type': 'ListItem',
            'position': idx + 1,
            'name': `[${item.date}] 【${item.location}・${item.nationality || '外国籍'}】${item.title}`,
            'description': item.summary || item.title,
            'url': `${canonicalUrl}#incident-${item.id}`
          }))
        });
      }
    }

    const isNoindexRoute = normalizedUrl.startsWith('/analysis/image/');
    const robotsContent = isNoindexRoute
      ? 'noindex, follow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    const cleanHeadTags = [
      `<title>${escapeHtmlAttr(seoCfg.title)}</title>`,
      `<meta name="prerender-title" content="${escapeHtmlAttr(seoCfg.title)}" />`,
      `<meta name="description" content="${escapeHtmlAttr(seoCfg.desc)}" />`,
      `<meta name="keywords" content="${escapeHtmlAttr(seoCfg.keywords)}" />`,
      `<meta name="robots" content="${robotsContent}" />`,
      `<link rel="canonical" href="${canonicalUrl}" />`,
      `<meta property="og:site_name" content="日本の岐路" />`,
      `<meta property="og:locale" content="ja_JP" />`,
      `<meta property="og:title" content="${escapeHtmlAttr(seoCfg.title)}" />`,
      `<meta property="og:description" content="${escapeHtmlAttr(seoCfg.desc)}" />`,
      `<meta property="og:url" content="${canonicalUrl}" />`,
      `<meta property="og:type" content="${normalizedUrl === '/' ? 'website' : 'article'}" />`,
      `<meta property="og:image" content="${SITE_URL}/ogp-image-2.jpg" />`,
      `<meta property="article:modified_time" content="${pageModifiedIso}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escapeHtmlAttr(seoCfg.title)}" />`,
      `<meta name="twitter:description" content="${escapeHtmlAttr(seoCfg.desc)}" />`,
      `<meta name="twitter:image" content="${SITE_URL}/ogp-image-2.jpg" />`,
      `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graphNodes })}</script>`
    ].join('\n    ');

    const needsNewsPreload =
      normalizedUrl === '/' ||
      normalizedUrl.startsWith('/analysis/crime-news') ||
      normalizedUrl === '/analysis/non-prosecution/' ||
      normalizedUrl === '/analysis/crime-rate-factcheck/';

    let routeTemplate = baseInlinedTemplate;
    if (!needsNewsPreload) {
      routeTemplate = routeTemplate.replace(/<link rel="modulepreload"[^>]*data-news[^>]*>\s*/gi, '');
    }

    const finalHtml = routeTemplate
      .replace('<!--app-html-->', enrichedAppHtml)
      .replace(/<title>[\s\S]*?<meta property="twitter:image"[^>]*>/, cleanHeadTags);

    const fileName = url === '/' ? 'index.html' : `${url}/index.html`;
    const filePath = path.join(uploadDir, fileName);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, finalHtml, 'utf-8');
  }

  const clientDir = toAbsolute('dist/client');

  function copyStaticAssets(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === 'index.html') continue;

      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        copyStaticAssets(srcPath, destPath);
      } else if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyStaticAssets(clientDir, uploadDir);
  fs.copyFileSync(toAbsolute('dist/client/index.html'), path.join(uploadDir, '200.html'));

  // 全インデックス対象ルートの実更新日を反映した sitemap.xml を public/・dist/client/・NETLIFY_UPLOAD/ に自動出力
  const indexableRoutes = routesToPrerender.filter(url => !url.startsWith('/analysis/image/'));
  const sitemapEntries = indexableRoutes.map(url => {
    const norm = url.endsWith('/') ? url : `${url}/`;
    const cfg = SEO_ROUTE_CONFIG[norm] || { priority: '0.80', changefreq: 'weekly' };
    return `  <url><loc>${SITE_URL}${norm}</loc><lastmod>${routeLastmod(norm)}</lastmod><changefreq>${cfg.changefreq}</changefreq><priority>${cfg.priority}</priority></url>`;
  }).join('\n');
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`;
  fs.writeFileSync(toAbsolute('public/sitemap.xml'), sitemapXml, 'utf-8');
  fs.writeFileSync(toAbsolute('dist/client/sitemap.xml'), sitemapXml, 'utf-8');
  fs.writeFileSync(path.join(uploadDir, 'sitemap.xml'), sitemapXml, 'utf-8');
  console.log(`Updated sitemap.xml with ${indexableRoutes.length} indexable routes (total prerendered: ${routesToPrerender.length}, latest news: ${latestNewsDate})`);

  console.log('BUILD COMPLETE! Upload NETLIFY_UPLOAD to Netlify.');
}

prerender().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
