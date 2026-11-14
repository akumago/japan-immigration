import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import https from 'https';

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
  const totalNewsCount = newsItems.length || 450;
  const nowJst = new Date(Date.now() + 9 * 3600 * 1000);
  const todayDateStr = nowJst.toISOString().slice(0, 10);
  const latestNewsDate = (newsItems[0] && newsItems[0].date) ? newsItems[0].date : todayDateStr;
  const modifiedIso = `${todayDateStr}T${nowJst.toISOString().slice(11, 19)}+09:00`;

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

  // 全48ルートの高検索需要キーワード＆高CTRタイトル・ディスクリプション定義
  const SEO_ROUTE_CONFIG = {
    '/': {
      title: `外国人犯罪率1.72倍の統計根拠と外国人事件速報DB（全${totalNewsCount}件収録）| 移民政策・生活保護・治安リスク徹底検証 | 日本の岐路`,
      desc: `【毎時自動更新】警察庁統計で日本人比1.72倍に達する外国人犯罪率・不起訴問題、生活保護や国保タダ乗り等の社会保障負担、実質賃金低下のカラクリを公的データで徹底検証。全国地方紙・警察発表の外国人逮捕ニュース全${totalNewsCount}件を国籍別・都道府県別に公開。`,
      keywords: '外国人犯罪,外国人 犯罪率,外国人 犯罪 統計,外国人 不起訴 なぜ,外国人 生活保護 なぜ,外国人 国保 タダ乗り,特定技能2号 移民 違い,技能実習生 失踪,外国人 土地買収,クルド人 ベトナム人 中国人 犯罪',
      priority: '1.0', changefreq: 'hourly',
      faqs: [
        { q: '日本の外国人犯罪率は日本人と比べて高いのですか？', a: '警察庁の犯罪統計および2025年参議院内閣委員会での政府答弁データに基づくと、人口当たりの検挙人員比率は日本人の0.188%に対し来日外国人は0.323%であり、約1.72倍の高さとなっています。' },
        { q: '外国人犯罪のニュースや国籍別・都道府県別の事件一覧はどこで見られますか？', a: `当サイトの「外国人犯罪報道 日次データベース（/analysis/crime-news/）」にて、全国の地方紙・テレビ局・警察発表から毎時自動収集した全${totalNewsCount}件以上の事件を国籍別（ベトナム・中国・韓国・ブラジル・トルコ等）および47都道府県別に検索・閲覧できます。` },
        { q: '外国人労働者が増えるとなぜ日本人の給料（実質賃金）が上がらないのですか？', a: '人手不足の現場に安価な外国人労働力を供給し続けることで、本来起きるはずの「賃上げ」や「省力化・AI・ロボット投資」が先送りされ、低賃金構造と増税・社会保障費増大の悪循環が固定化するためです。' }
      ]
    },
    '/analysis/crime-news/': {
      title: `【速報】外国人犯罪ニュース一覧・国籍別＆都道府県別データベース（全${totalNewsCount}件・毎時更新）| 日本の岐路`,
      desc: `【${todayDateStr}最新・全${totalNewsCount}件収録】全国の地方紙・ローカル局・警察発表から外国籍被疑者の逮捕・起訴・不起訴報道を毎時自動収集。ベトナム・中国・韓国・クルド（トルコ）・ブラジル等の国籍別や47都道府県別にリアルタイム検索できる日本最大の外国人事件データベース。`,
      keywords: '外国人犯罪 ニュース,外国人犯罪 一覧,外国人 逮捕 速報,ベトナム人 逮捕,中国人 逮捕,クルド人 事件,外国人 不起訴 ニュース,不法滞在 摘発,技能実習生 逮捕,都道府県別 外国人犯罪',
      priority: '0.95', changefreq: 'hourly',
      faqs: [
        { q: '外国人犯罪ニュース一覧ではどの国籍の事件が多く報道されていますか？', a: `現在収録されている全${totalNewsCount}件の報道データベースでは、ベトナム国籍（窃盗・不法残留・薬物等）、中国籍（特殊詐欺・窃盗・組織犯罪等）、韓国籍、台湾籍、ブラジル国籍、フィリピン国籍、ネパール国籍、トルコ国籍などの事件が多く集計されています。` },
        { q: '都道府県別に外国人犯罪ニュースを絞り込むことはできますか？', a: 'はい。東京都、千葉県、静岡県、愛知県、大阪府、埼玉県、福岡県、茨城県など47都道府県別のフィルターボタンと国籍別フィルターを組み合わせて、地域ごとの最新の逮捕・事件報道を即座に確認できます。' }
      ]
    },
    '/analysis/crime-statistics/': {
      title: '外国人犯罪統計の真実：なぜ検挙率は日本人の1.72倍なのか？国籍別犯罪傾向と不起訴処分の闇 | 日本の岐路',
      desc: '警察庁・法務省の犯罪白書と国会答弁データを徹底検証。来日外国人の検挙率が日本人比1.72倍に達する統計的根拠、ベトナム・中国・ブラジル等の国籍別犯罪割合（窃盗・強盗・薬物・不法滞在）、外国人事件で不起訴処分が多発する構造的理由（通訳不足・逃亡・司法取引）を解明。',
      keywords: '外国人 犯罪率,外国人犯罪 統計,外国人 検挙率 1.72倍,外国人 不起訴 なぜ,外国人 不起訴 理由,国籍別 犯罪率 ランキング,ベトナム人 犯罪率,中国人 犯罪 統計,来日外国人 犯罪白書,警察庁 外国人犯罪',
      priority: '0.9', changefreq: 'weekly',
      faqs: [
        { q: '外国人が逮捕されても不起訴になるケースが多いのはなぜですか？', a: '希少言語の司法通訳人不足による取調べ期間の限界、組織犯罪における証拠立証の壁、強制送還（退去強制）を前提とした起訴猶予処分などが重なり、結果として刑事処罰を受けないまま釈放・帰国するケースが多発しています。' },
        { q: '来日外国人の犯罪統計で特に多い罪種は何ですか？', a: '警察庁の統計では、組織的な太陽光パネル銅線窃盗や農作物・高級車窃盗などの侵入盗・非侵入盗、特殊詐欺の出し子・受け子、薬物密輸、および入管難民法違反（不法残留・不法就労）が高い割合を占めています。' }
      ]
    },
    '/analysis/social-security/': {
      title: '外国人の生活保護・国保タダ乗り問題：なぜ医療費未払いと社会保障の不正受給が起きるのか？ | 日本の岐路',
      desc: '外国人の国民健康保険（国保）悪用による高額療養費・海外療養費・出産育児一時金の不正受給スキーム、訪日外国人の医療費踏み倒し問題、最高裁判決にもかかわらず続く自治体裁量での外国人生活保護支給（年1,200億円超）の実態と現役世代の社会保険料負担を公的データで検証。',
      keywords: '外国人 生活保護 なぜ,外国人 生活保護 最高裁 違憲,外国人 国保 タダ乗り,外国人 医療費 未払い,出産育児一時金 外国人 不正,海外療養費 不正受給,外国人 社会保障 負担,経営管理ビザ 国保 悪用',
      priority: '0.9', changefreq: 'weekly',
      faqs: [
        { q: 'なぜ外国人に生活保護が支給されているのですか？最高裁で対象外と判決が出たのではないですか？', a: '2014年の最高裁判決で「生活保護法は外国人を対象としていない（法的権利はない）」と確定しましたが、昭和29年の旧厚生省通知（行政措置による準用）が撤廃されず残っているため、現在も自治体の裁量で永住者や定住者等に年間1,200億円規模の生活保護費が支出されています。' },
        { q: '外国人の国民健康保険（国保）タダ乗りとはどのような問題ですか？', a: '来日直後にわずかな保険料で国保に加入し、数百万〜数千万円単位の高額医療（がん治療やC型肝炎治療薬など）や高額療養費制度、出産育児一時金（50万円）を受給した後に保険料を未納のまま帰国・転居するケースが全国の自治体で問題化しています。' }
      ]
    },
    '/analysis/economic-impact/': {
      title: 'なぜ外国人労働者が増えると日本人の給料が下がり増税になるのか？実質賃金停滞と悪循環の図解 | 日本の岐路',
      desc: '「人手不足だから外国人を入れる」という政策が日本人の実質賃金上昇を止め、増税と社会保障費増大を招くメカニズムを三角図解でわかりやすく解説。安価な労働供給が企業のDX・省力化投資を阻害し、GDPは増えても1人当たり所得が貧困化する経済学的根拠。',
      keywords: '外国人労働者 賃金 上がらない,実質賃金 低下 理由,移民 経済効果 嘘,増税 所得減少 悪循環,人手不足 賃上げ 外国人,労働生産性 日本 低い理由,1人当たりGDP 低下 移民',
      priority: '0.9', changefreq: 'weekly',
      faqs: [
        { q: '外国人労働者を受け入れると日本経済は成長するのではないですか？', a: '人口水増しによって見かけのGDP総額が微増しても、低賃金労働の拡大によって「1人当たりGDP」と「日本人の実質賃金」は逆に押し下げられます。さらに治安維持・教育・医療・生活保護などの社会的コストを税金で負担するため、国民の手取り所得は減少します。' }
      ]
    },
    '/analysis/naturalization-paradox/': {
      title: '帰化と永住権の違い・逆転現象とは？滞在5年で日本国籍が取れる国籍法の穴と通名・安全保障リスク | 日本の岐路',
      desc: 'なぜ日本では「永住権（原則10年）」より「帰化（日本国籍取得・原則5年）」の方が居住年数ハードルが低いのか？帰化要件の緩和・簡易帰化、帰化後の犯罪歴や国会議員・公務員就任リスク、通名制度が悪用される口座犯罪の盲点を法制度から徹底検証。',
      keywords: '帰化 永住権 違い,帰化 永住権 どっちが簡単,帰化 条件 緩和 問題点,日本国籍 取得 5年,帰化 取り消し できない,通名 犯罪 なぜ,国籍法 改正 リスク',
      priority: '0.88', changefreq: 'weekly',
      faqs: [
        { q: '永住権と帰化（日本国籍取得）はどちらが条件が厳しいですか？', a: '一般的な永住許可が原則10年の継続在留を要するのに対し、普通帰化は原則5年（日本人の配偶者等の簡易帰化は1〜3年）で申請可能という「逆転現象」が起きています。一度帰化すると参政権や公務就任権が得られ、重大犯罪を犯しても日本国籍を剥奪・強制送還することは原則できません。' }
      ]
    },
    '/analysis/land-acquisition/': {
      title: '外国人による日本の土地買収問題：北海道の水源地・森林・自衛隊基地周辺が買われる理由と法規制の限界 | 日本の岐路',
      desc: '中国資本等の外国勢力による北海道・沖縄・対馬・ニセコ等の水源地、広大な森林、自衛隊基地・原発周辺の土地買収実態を解説。GATS（サービス貿易一般協定）留保欠落と重要土地等調査法の罰則・買収阻止規定の不備、安全保障上の致命的リスクを検証。',
      keywords: '外国人 土地買収 規制,北海道 土地買収 中国 水源地,自衛隊基地周辺 土地買収,重要土地等調査法 ザル法,対馬 沖縄 外国資本 買収,日本 土地 外国人 なぜ買える',
      priority: '0.88', changefreq: 'weekly',
      faqs: [
        { q: 'なぜ日本では外国人が簡単に土地や水源地を買えるのですか？', a: '1994年のWTO（GATS協定）締結時に日本政府が外国資本による土地取得制限の留保条項を設けなかったこと、また2022年施行の重要土地等調査法も「事前届出と利用調査」にとどまり、売買自体を禁止・没収する強制力がないためです。' }
      ]
    },
    '/analysis/burial-controversy/': {
      title: 'イスラム教徒の土葬問題とは？大分・宮城・茨城など全国の自治体で住民反対が起きる理由と水質・風評リスク | 日本の岐路',
      desc: '火葬率99.97%の日本で急増するムスリム（イスラム教徒）による土葬墓地新設要求。大分県日出町・宮城県・茨城県等で起きた地域住民との激しい対立、地下水汚染や農産物の風評被害、墓地埋葬法の課題と多文化共生の限界を現地事例から徹底解説。',
      keywords: 'イスラム教 土葬 なぜ,土葬 問題 自治体 どこ,大分県 日出町 土葬 反対,宮城県 土葬 墓地,ムスリム 土葬 日本 法律,火葬 土葬 トラブル',
      priority: '0.88', changefreq: 'weekly',
      faqs: [
        { q: 'なぜ日本でイスラム教徒の土葬墓地が問題になっているのですか？', a: '日本は公衆衛生と国土の制約から火葬率が99.97%に達し、事実上の社会規範となっています。土葬墓地の新設は周辺住民の飲料水源（井戸水・地下水）への心理的・衛生的懸念や農産物の風評被害、土地利用を巡る自治体・住民との深刻な摩擦を引き起こしています。' }
      ]
    },
    '/analysis/labor-dilemma/': {
      title: '特定技能2号と育成就労の問題点：技能実習生が年間9,000人失踪・不法滞在化する構造と事実上の移民解禁 | 日本の岐路',
      desc: 'なぜ技能実習生は年間9,000人以上も失踪し、不法滞在や組織犯罪（銅線窃盗・闇バイト）に流入するのか？「育成就労」による転籍緩和が招く地方から都市部への人材流出と、「特定技能2号」の対象拡大による家族帯同・無期限在留（事実上の定住移民化）のリスクを検証。',
      keywords: '特定技能2号 移民 違い,特定技能2号 家族帯同 永住,技能実習生 失踪 理由,技能実習生 失踪 犯罪,育成就労 問題点 転籍,外国人雇用 働き方改革 矛盾',
      priority: '0.88', changefreq: 'weekly',
      faqs: [
        { q: '特定技能2号が「事実上の移民受け入れ」と言われる理由は？', a: '特定技能1号（最長5年・家族帯同不可）と異なり、特定技能2号は在留期間の更新上限がなく（無期限滞在が可能）、配偶者や子どもの家族帯同が認められ、将来的な永住権申請にも直結するためです。これが建設・製造・外食・農業など全分野へ拡大されました。' }
      ]
    },
    '/analysis/labor-mismatch/': {
      title: '「人手不足は嘘」の統計的根拠：職種別有効求人倍率のミスマッチと外国人労働者に頼らない解決策 | 日本の岐路',
      desc: '日本の人手不足の正体は「人口不足」ではなく「職種と賃金のミスマッチ」だった。事務職（求人倍率0.4倍）に求職者が溢れる一方、低賃金・重労働の現場にだけ外国人を入れる歪んだ雇用構造を厚生労働省データで証明。',
      keywords: '人手不足 嘘 統計,有効求人倍率 職種別 ミスマッチ,事務職 求人倍率 低い,外国人労働者 いらない 理由,人手不足 賃上げ 省力化',
      priority: '0.85', changefreq: 'weekly'
    },
    '/analysis/borderless-welfare-state/': {
      title: '移民1人あたり約4,200万円の財政赤字：オランダ『国境なき福祉国家』実証データが示す日本の未来 | 日本の岐路',
      desc: 'アムステルダム大学ヤン・ファン・デ・Beek博士らが全国民マイクロデータで算出した衝撃の調査結果。非西洋系・低熟練移民の受け入れは1人あたり生涯で約27.5万ユーロ（約4,200万円）の純財政赤字を生み、福祉国家を破綻させるという科学的エビデンス。',
      keywords: '国境なき福祉国家 オランダ 移民,移民 財政負担 4200万円,欧州 移民政策 失敗 データ,移民 社会保障 赤字 試算,福祉国家 移民 両立しない',
      priority: '0.88', changefreq: 'weekly'
    },
    '/analysis/symbiosis/': {
      title: '愛知県西尾市「県営緑町住宅」の現実：外国人比率上昇で起きた自治会崩壊・ゴミ問題・小学校の教育摩擦 | 日本の岐路',
      desc: '住民の多数が外国人となった愛知県西尾市「県営緑町住宅」などの現場レポート。ゴミ出しルール崩壊、騒音トラブル、自治会費未納による地域コミュニティの機能不全、公立小学校での日本語指導負担と日本人児童へのしわ寄せを徹底検証。',
      keywords: '西尾市 県営緑町住宅 外国人,外国人 団地 ゴミ問題 自治会,多文化共生 失敗 事例 日本,公立小学校 外国人児童 負担,川口 芝園団地 緑町住宅',
      priority: '0.86', changefreq: 'weekly'
    },
    '/analysis/uk-immigration-lesson/': {
      title: 'イギリスの移民政策失敗の教訓：NHS医療崩壊・治安悪化・ブレグジットに至った歴史と日本の類似点 | 日本の岐路',
      desc: '「労働力不足解消」を名目に大量の移民を受け入れたイギリスで何が起きたのか？NHS（国営医療）の待機時間爆発、住宅価格高騰、低賃金固定化、ロザラム事件等の治安悪化と社会的分断から日本が今すぐ学ぶべき歴史的教訓。',
      keywords: 'イギリス 移民政策 失敗,英国 移民 治安悪化 NHS,ブレグジット 原因 移民,ヨーロッパ 移民 失敗 理由,日本 イギリス 移民 比較',
      priority: '0.85', changefreq: 'weekly'
    },
    '/analysis/national-security/': {
      title: '外国人急増と日本の国家安全保障リスク：国防動員法・スパイ防止法欠如・重要インフラ防衛の死角 | 日本の岐路',
      desc: '有事の際に在日外国人が本国法（中国・国防動員法や国家情報法等）に従うリスク、スパイ防止法が存在しない日本の防諜体制の脆弱性、通信・電力・港湾インフラおよび治安維持への直接的脅威を安全保障の観点から分析。',
      keywords: '外国人 安全保障 リスク,国防動員法 在日中国人,スパイ防止法 日本 なぜない,重要インフラ 外国人 リスク,移民 治安 安全保障',
      priority: '0.85', changefreq: 'weekly'
    },
    '/analysis/nigeria-case/': {
      title: 'JICA「アフリカの故郷（ホームタウン）」構想の火種：ナイジェリア事例に見る国際交流と特別ビザ誤報の教訓 | 日本の岐路',
      desc: '日本の地方自治体（木更津市・三条市・長井市・今治市）をアフリカ諸国の「故郷」と位置づけた構想が現地メディアで「特別ビザ発給・移住解禁」と誤報・拡散された経緯と、安易な自治体間協定が招く大量移住圧力の危険性。',
      keywords: 'ナイジェリア JICA ホームタウン,アフリカ 自治体 特別ビザ 誤報,木更津 三条 長井 今治 アフリカ,多文化共生 トラブル 事例',
      priority: '0.84', changefreq: 'weekly'
    },
    '/analysis/simulation-model/': {
      title: '2050年数理予測シミュレーション：移民受け入れ拡大で国民負担は累計97兆円増大する | 日本の岐路',
      desc: '外国人労働者と家族帯同の増加が2050年までの日本経済・財政・社会保障・治安コストに与える影響を数理モデルで推計。企業の短期利益の裏で国民全体が背負う累計約97兆円の社会的コスト（外部不経済）を可視化。',
      keywords: '移民 2050年 シミュレーション,外国人受け入れ 財政負担 試算,移民 社会的コスト 97兆円,人口減少 移民 シミュレーション',
      priority: '0.85', changefreq: 'weekly'
    },
    '/analysis/statistical-evidence/': {
      title: '【グラフで検証】移民を増やしても経済成長しない統計的証拠：主要国の外国人比率と実質賃金の国際比較 | 日本の岐路',
      desc: 'OECD諸国の外国人比率と1人あたりGDP成長率・実質賃金推移を比較すると「移民が多い国ほど一人あたりが豊かになるわけではない」という冷徹な統計事実が浮かび上がる。視覚的グラフで論破する移民推進論の嘘。',
      keywords: '移民 経済成長 無関係 グラフ,外国人比率 GDP 相関,移民 統計データ 国際比較,外国人労働者 推移 グラフ',
      priority: '0.84', changefreq: 'weekly'
    },
    '/analysis/risk-analysis/': {
      title: '外国人受け入れの5大リスク総まとめ：治安・経済・社会保障・文化摩擦・安全保障の包括的検証 | 日本の岐路',
      desc: '外国人労働者・移民の拡大が日本社会にもたらす5つの構造的リスク（①犯罪・治安悪化、②賃金抑制、③生活保護・国保負担、④土葬・地域摩擦、⑤土地買収・安全保障）を一覧でわかりやすく整理。',
      keywords: '外国人受け入れ 問題点 まとめ,移民 デメリット 一覧,外国人労働者 問題 5つ,多文化共生 リスク まとめ',
      priority: '0.85', changefreq: 'weekly'
    },
    '/analysis/summary-statistics/': {
      title: '【統計総括】数字が証明する外国人政策の限界：警察庁・厚労省・法務省データの重要指標一覧 | 日本の岐路',
      desc: '検挙率1.72倍、技能実習生失踪9,000人超、外国人生活保護1,200億円、生涯財政赤字4,200万円など、政府公式統計と国際研究が示す重要ファクトを一目で確認できる統計総括ページ。',
      keywords: '外国人問題 統計 まとめ,外国人犯罪 厚労省 法務省 データ,移民政策 エビデンス 一覧',
      priority: '0.84', changefreq: 'weekly'
    },
    '/analysis/policy-recommendations/': {
      title: '政策提言：外国人労働力依存を断ち切り「高賃金・省力化・AIロボット大国」へ転換する具体策 | 日本の岐路',
      desc: '増税と所得減少の悪循環を止め、日本人の実質賃金を引き上げるための政策提言。安易な外国人受け入れ枠の凍結、AI・ロボティクス投資への税制優遇、国保・生活保護の厳格化による持続可能な自立経済への道筋。',
      keywords: '人手不足 解決策 外国人以外,省力化投資 ロボット 賃上げ,移民政策 見直し 提言,日本経済 復活 政策',
      priority: '0.82', changefreq: 'monthly'
    },
    '/analysis/strategic-recommendations/': {
      title: '日本の未来を守る3大戦略ロードマップ：入管法・国籍法・土地規制・社会保障の抜本改革案 | 日本の岐路',
      desc: '日本の治安と国家主権を守るために今すぐ実行すべき3つの戦略的提言（①入管管理と不法滞在ゼロプラン、②帰化・永住審査の厳格化と相互主義に基づく土地取得規制、③公的扶助・国保の適正化）。',
      keywords: '入管法 改正 厳格化,国籍法 土地規制 相互主義,不法滞在 ゼロプラン 強制送還,外国人政策 ロードマップ',
      priority: '0.82', changefreq: 'monthly'
    },
    '/analysis/conclusion/': {
      title: '結論：なし崩しの多文化共生ではなく「厳格なルールと棲み分け」による平和な日本へ | 日本の岐路',
      desc: '全分析レポートの結論。欧米の失敗を繰り返さず、日本の高度な治安・文化・社会保障を次世代へ引き継ぐための「秩序ある棲み分け」と主権回復へのメッセージ。',
      keywords: '多文化共生 限界 結論,棲み分けの共生 日本,移民問題 結論 日本の未来',
      priority: '0.80', changefreq: 'monthly'
    },
    '/analysis/ai-simulation/': {
      title: '生成AIが予測する日本の移民政策の結末：忖度なしの論理モデルが導き出した2040年の日本社会 | 日本の岐路',
      desc: '複数の最新AIに日本の人口動態・財政・治安パラメータを入力して多角的に検証。政治的忖度を排した数理・論理モデルが警告する「低熟練労働力受け入れの不可逆的コスト」とは。',
      keywords: 'AI 予測 日本 移民 2040年,生成AI シミュレーション 人口減少,外国人問題 AI分析',
      priority: '0.82', changefreq: 'monthly'
    },
    '/analysis/video-guide/': {
      title: '【動画でわかる】外国人労働者問題・治安・経済への影響を5分で解説するビジュアルガイド | 日本の岐路',
      desc: '公的統計データが示す外国人犯罪率・実質賃金停滞・社会保障負担の構造を、映像とグラフで直感的に理解できる解説動画ページ。',
      keywords: '外国人問題 解説動画,移民政策 わかりやすい 動画,日本の岐路 動画ガイド',
      priority: '0.80', changefreq: 'monthly'
    },
    '/analysis-archive/': {
      title: '外国人問題・移民政策の専門分析レポート全一覧（治安・生活保護・経済・土地買収・土葬）| 日本の岐路',
      desc: '警察庁の外国人犯罪統計、日次事件速報データベース、生活保護・国保タダ乗り問題、実質賃金低下、帰化と永住権の逆転、北海道の土地買収、イスラム土葬摩擦など全専門レポートを網羅したアーカイブ一覧。',
      keywords: '外国人問題 レポート 一覧,移民政策 分析 まとめ,外国人犯罪 社会保障 土地買収 記事一覧',
      priority: '0.90', changefreq: 'daily'
    },
    '/faq/': {
      title: 'よくある質問（FAQ）：外国人犯罪率1.72倍の根拠・不起訴の理由・生活保護・特定技能2号の疑問に回答 | 日本の岐路',
      desc: '「外国人の犯罪率は本当に高い？」「なぜ外国人の生活保護や国保タダ乗りが放置されている？」「特定技能2号と移民の違いは？」「なぜ不起訴が多い？」など、検索される疑問に公的データと法的根拠で回答。',
      keywords: '外国人犯罪 FAQ,外国人 生活保護 疑問,外国人 不起訴 なぜ 知恵袋,特定技能2号 疑問 回答',
      priority: '0.88', changefreq: 'weekly',
      faqs: [
        { q: '外国人犯罪率が日本人の1.72倍というのはどの統計ですか？', a: '警察庁の犯罪統計および2025年参議院内閣委員会における政府答弁数値（日本人の人口比検挙割合0.188%に対し、来日外国人は0.323%）に基づいています。' },
        { q: '外国人への生活保護支給は法律で義務付けられているのですか？', a: 'いいえ。2014年7月の最高裁判決により、外国人は生活保護法の適用対象外であり受給権はないことが確定していますが、1954年の旧厚生省通知に基づく行政措置として自治体が支給を続けています。' },
        { q: '特定技能2号になると家族を日本に呼び寄せて永住できるのですか？', a: 'はい。特定技能2号には在留期間の更新上限がなく、配偶者や子の帯同が認められており、在留継続により永住許可や帰化申請の要件を満たすことが可能です。' }
      ]
    },
    '/glossary/': {
      title: '外国人問題・入管政策の重要用語集（特定技能2号・育成就労・簡易帰化・重要土地等調査法・不起訴）| 日本の岐路',
      desc: '特定技能1号・2号、育成就労、技能実習、在留資格、仮放免、退去強制、不起訴処分（起訴猶予）、簡易帰化、重要土地等調査法、GATS協定など、ニュースを理解するための重要専門用語をわかりやすく解説。',
      keywords: '特定技能 育成就労 用語,仮放免 退去強制 違い,簡易帰化 とは,入管 用語集',
      priority: '0.80', changefreq: 'monthly'
    },
    '/references/': {
      title: '公的統計・一次資料・参考文献一覧（警察庁犯罪白書・法務省入管統計・厚生労働省・国会答弁）| 日本の岐路',
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

  const escapeHtmlAttr = (str) => String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const stripHtmlTags = (str) => String(str || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  // CSSを完全インライン化してレンダリングブロックリクエストを完全ゼロ化（最速表示）
  const cssMatch = template.match(/<link rel="stylesheet" [^>]*href="([^"]+)"[^>]*>/);
  let baseInlinedTemplate = template;
  if (cssMatch) {
    const cssPath = path.join(toAbsolute('dist/client'), cssMatch[1].replace(/^\//, ''));
    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      baseInlinedTemplate = template.replace(cssMatch[0], `<style>${cssContent}</style>`);
    }
  }

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

    // 本文HTMLから各セクションの見出し（h2 / h3）を自動抽出して構造化データ hasPart に変換
    const sectionParts = [];
    const headingRegex = /<(h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    let secIdx = 1;
    const seenHeadings = new Set();
    while ((match = headingRegex.exec(appHtml)) !== null && sectionParts.length < 25) {
      const text = stripHtmlTags(match[2]);
      if (text && text.length >= 4 && text.length <= 90 && !seenHeadings.has(text) && !/^(ナビゲーション|メニュー|目次|Crawler)/i.test(text)) {
        seenHeadings.add(text);
        sectionParts.push({
          '@type': 'WebPageElement',
          'position': secIdx++,
          'name': text,
          'url': `${canonicalUrl}#section-${secIdx - 1}`
        });
      }
    }

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
        '@type': normalizedUrl === '/' ? 'CollectionPage' : 'TechArticle',
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
        'dateModified': modifiedIso,
        ...(sectionParts.length > 0 ? { 'hasPart': sectionParts } : {})
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        'itemListElement': normalizedUrl === '/'
          ? [{ '@type': 'ListItem', 'position': 1, 'name': 'ホーム', 'item': `${SITE_URL}/` }]
          : [
              { '@type': 'ListItem', 'position': 1, 'name': 'ホーム', 'item': `${SITE_URL}/` },
              { '@type': 'ListItem', 'position': 2, 'name': '分析アーカイブ一覧', 'item': `${SITE_URL}/analysis-archive/` },
              { '@type': 'ListItem', 'position': 3, 'name': seoCfg.title.split('|')[0].trim(), 'item': canonicalUrl }
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

    // 外国人犯罪ニュース速報DBページ（/analysis/crime-news/）およびトップページには最新事件の Dataset & ItemList を動的注入
    if ((normalizedUrl === '/analysis/crime-news/' || normalizedUrl === '/') && newsItems.length > 0) {
      const latest20 = newsItems.slice(0, 20);
      graphNodes.push({
        '@type': 'Dataset',
        '@id': `${SITE_URL}/analysis/crime-news/#dataset`,
        'name': `日本国内の外国人犯罪・逮捕報道日次データベース（全${totalNewsCount}件・毎時更新）`,
        'description': `全国の地方紙・テレビ局・警察発表から自動収集された外国籍被疑者の事件・逮捕報道データベース（最新更新日：${latestNewsDate}、収録件数：${totalNewsCount}件）。`,
        'url': `${SITE_URL}/analysis/crime-news/`,
        'dateModified': modifiedIso,
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
            'url': canonicalUrl
          }))
        });
      }
    }

    const cleanHeadTags = [
      `<title>${escapeHtmlAttr(seoCfg.title)}</title>`,
      `<meta name="description" content="${escapeHtmlAttr(seoCfg.desc)}" />`,
      `<meta name="keywords" content="${escapeHtmlAttr(seoCfg.keywords)}" />`,
      `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,
      `<link rel="canonical" href="${canonicalUrl}" />`,
      `<meta property="og:site_name" content="日本の岐路" />`,
      `<meta property="og:locale" content="ja_JP" />`,
      `<meta property="og:title" content="${escapeHtmlAttr(seoCfg.title)}" />`,
      `<meta property="og:description" content="${escapeHtmlAttr(seoCfg.desc)}" />`,
      `<meta property="og:url" content="${canonicalUrl}" />`,
      `<meta property="og:type" content="${normalizedUrl === '/' ? 'website' : 'article'}" />`,
      `<meta property="og:image" content="${SITE_URL}/ogp-image-2.jpg" />`,
      `<meta property="article:modified_time" content="${modifiedIso}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escapeHtmlAttr(seoCfg.title)}" />`,
      `<meta name="twitter:description" content="${escapeHtmlAttr(seoCfg.desc)}" />`,
      `<meta name="twitter:image" content="${SITE_URL}/ogp-image-2.jpg" />`,
      `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graphNodes })}</script>`
    ].join('\n    ');

    const finalHtml = baseInlinedTemplate
      .replace('<!--app-html-->', appHtml)
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

  // 全48ルートの最新 <lastmod> を反映した sitemap.xml を public/・dist/client/・NETLIFY_UPLOAD/ に自動出力
  const sitemapEntries = routesToPrerender.map(url => {
    const norm = url.endsWith('/') ? url : `${url}/`;
    const cfg = SEO_ROUTE_CONFIG[norm] || { priority: '0.80', changefreq: 'weekly' };
    return `  <url><loc>${SITE_URL}${norm}</loc><lastmod>${todayDateStr}</lastmod><changefreq>${cfg.changefreq}</changefreq><priority>${cfg.priority}</priority></url>`;
  }).join('\n');
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`;
  fs.writeFileSync(toAbsolute('public/sitemap.xml'), sitemapXml, 'utf-8');
  fs.writeFileSync(toAbsolute('dist/client/sitemap.xml'), sitemapXml, 'utf-8');
  fs.writeFileSync(path.join(uploadDir, 'sitemap.xml'), sitemapXml, 'utf-8');
  console.log(`Updated sitemap.xml with ${routesToPrerender.length} routes (lastmod: ${todayDateStr})`);

  console.log('BUILD COMPLETE! Upload NETLIFY_UPLOAD to Netlify.');
}

prerender().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
