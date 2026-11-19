import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MainLayout } from '../components/MainLayout';
import { Header } from '../components/Header';
import Section from '../components/Section';
import ContentBlockRenderer from '../components/ContentBlockRenderer';
import { RelatedArticles } from '../components/RelatedArticles';
import newsData from '../data/newsData.json';
import crimeSegments from '../data/crimeSegments.json';
import type { ContentBlock } from '../types';
import { getAllEligibleHubs, type HubNewsItem } from '../lib/crimeHubs.mjs';

const ITEMS = newsData as HubNewsItem[];

const NAT_NAME_TO_SLUG = new Map<string, string>(
  Object.entries(crimeSegments.nationalities || {}).map(([slug, name]) => [String(name), slug])
);

const countBy = (arr: HubNewsItem[], getter: (item: HubNewsItem) => string) => {
  const map = new Map<string, number>();
  for (const item of arr) {
    const k = getter(item);
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
};

export const CrimeRateFactCheck: React.FC = () => {
  const totalCount = ITEMS.length;
  const topNats = countBy(ITEMS, i => i.nationality || '外国籍（詳細不明）').slice(0, 10);
  const topCats = countBy(ITEMS, i => i.crimeCategory || 'その他').slice(0, 10);
  const topStages = countBy(ITEMS, i => i.stage || '逮捕');
  const eligibleHubs = getAllEligibleHubs(ITEMS);
  const catHubMap = new Map<string, string>(
    eligibleHubs.filter(h => h.mode === 'category').map(h => [h.label, h.path])
  );

  const pageTitle = '【統計検証】「外国人犯罪率は日本人より低い」は本当かデマか？警察庁答弁1.72倍の計算根拠と3つの落とし穴 | 日本の岐路';
  const pageDesc = `SNS等で議論が割れる「外国人犯罪率」について、2025年11月参議院内閣委員会の警察庁答弁（定住外国人0.323% vs 日本人0.188%＝約1.72倍）と、なぜ反対の結論（観光客混入・年齢構成・国籍別平均化）が出るのかを計算式から検証します。`;
  const canonicalUrl = 'https://endearing-blini-b688ce.netlify.app/analysis/crime-rate-factcheck/';

  const factCheckBlocks: ContentBlock[] = [
    {
      type: 'subheading',
      text: 'なぜ「1.72倍高い」というデータと「日本人より低い」という主張が同時に存在するのか？'
    },
    {
      type: 'paragraph',
      text: 'インターネットやメディアでは、「外国人の犯罪率は日本人の約1.7倍以上」という資料と、「外国人の犯罪率は日本人と変わらない・むしろ低い」という記事の両方が出回っています。双方が真逆の結論に至る最大の理由は、分子（検挙件数・検挙人員の定義）と分母（どの人口グループで割るか）の取り方が異なる点にあります。'
    },
    {
      type: 'subheading',
      text: '検証ポイント①：短期滞在者（観光客等）を分母・集計に含めるかの違い'
    },
    {
      type: 'paragraph',
      text: '法務省・警察庁の「来日外国人」犯罪統計には観光・短期出張で来日する延べ数千万人規模の入国者が関わる一方、住民登録ベースで比較する際には在留外国人数が使われます。2025年11月の参議院内閣委員会における警察庁答弁では、短期滞在者を除いた「定住外国人」ベースの刑法犯検挙率は0.323%であり、日本人の0.188%と比較して約1.72倍に上ることが示されました。'
    },
    {
      type: 'subheading',
      text: '検証ポイント②：年齢構成（高齢化率の差）による補正論点'
    },
    {
      type: 'paragraph',
      text: '統計比較における重要な注意点として、在留外国人は就労・留学目的の20〜30代など若年・生産年齢層が大部分を占める一方、日本人は犯罪率の低い65歳以上の高齢者が約3割を占めます。そのため「年齢階層別の補正を行うべきだ」という指摘がある一方で、治安現場・自治体の実務負担という観点からは「現実に地域社会に居住している人口1人あたりの絶対リスク（粗検挙率1.72倍）」こそが防災・警察リソース配分の基準になるという議論がなされています。'
    },
    {
      type: 'subheading',
      text: '検証ポイント③：「全外国人ひとまとめの平均値」による希釈効果'
    },
    {
      type: 'paragraph',
      text: '在留外国人には特別永住者、高度専門職、家族滞在、技能実習生、特定技能、留学生、不法滞在者（オーバーステイ）など極めて多様なグループが含まれます。犯罪率が著しく低い層と、入管法違反・組織的窃盗・特殊詐欺関与・薬物密輸などが集中する一部グループ・在留資格・国籍をすべて合算して「全外国人平均」を取ると、局地的な治安悪化や犯罪類型の偏りが平均値の陰に隠れて見えなくなる点が統計上の課題です。'
    }
  ];

  const comparisonRows = [
    {
      topic: '2025年11月 参議院内閣委員会（警察庁答弁）',
      basis: '短期滞在者（観光客等）を除いた「定住外国人」 vs 日本人（刑法犯検挙率）',
      figure: '定住外国人 0.323% / 日本人 0.188%（約1.72倍）',
      note: '国内に定住する外国人全体の平均的な検挙人口比を示す公式答弁値'
    },
    {
      topic: '「外国人の方が犯罪率は低い」説で多い計算例',
      basis: '分子に「来日外国人」のみを置き、永住者・特別永住者等を含む全在留外国人数等で除算するケース等',
      figure: '集計区分により0.1%台と算出される場合がある',
      note: '統計区分の非対称性（分子と分母の範囲ズレ）を確認せずに比較すると過小評価が起きやすい'
    },
    {
      topic: '当サイト報道データベース集計（直近国内報道）',
      basis: `全国紙・地方紙の一次報道から日本国内の外国籍関連事件のみを自動収集・重複排除（全${totalCount}件）`,
      figure: `直近累計 ${totalCount}件（国籍別・罪種別・都道府県別にリアルタイム集計）`,
      note: '統計年報のタイムラグ（1〜2年遅れ）を補完し、現時点で報道されている犯罪類型・地域偏在を可視化'
    }
  ];

  const faqs = [
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
      a: `当サイトが収集した直近の国内一次報道${totalCount}件の傾向では、${topCats.slice(0, 3).map(([c, n]) => `${c}(${n}件)`).join('、')}などが上位を占めています。`
    }
  ];

  return (
    <MainLayout>
      <Helmet>
        <html lang="ja" />
        <title>{pageTitle}</title>
        <meta name="prerender-title" content={pageTitle} />
        <meta name="description" content={pageDesc} />
        <meta
          name="keywords"
          content="外国人 犯罪率 デマ,外国人 犯罪率 本当,外国人 犯罪率 日本人 比較,外国人 犯罪率 警察庁,1.72倍,来日外国人 統計,定住外国人 検挙率"
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      </Helmet>

      <div className="min-h-screen bg-slate-950 text-slate-100 py-8 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <nav aria-label="パンくずリスト" className="text-xs sm:text-sm text-slate-400 flex flex-wrap items-center gap-2">
            <Link to="/" className="hover:text-white transition-colors">
              トップ
            </Link>
            <span>/</span>
            <Link to="/analysis/crime-statistics/" className="hover:text-white transition-colors">
              外国人犯罪統計の詳細分析
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">外国人犯罪率ファクトチェック</span>
          </nav>

          <Header
            title="【データ照合】「外国人犯罪率＝デマ vs 1.72倍」徹底ファクトチェック"
            description="なぜ正反対の主張が拡散されるのか？警察庁国会答弁の計算式・分母の定義・年齢構成論点と、直近の国内一次報道データベースを突き合わせて検証します。"
          />

          <section className="bg-slate-900/75 border border-slate-800 rounded-2xl p-6 overflow-x-auto">
            <h2 className="text-xl font-bold text-white mb-4">
              公的統計・議論で参照される比較数値の違い（対照表）
            </h2>
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-300">
                  <th className="py-3 pr-4">参照データ・言説</th>
                  <th className="py-3 pr-4">算出対象・分母の条件</th>
                  <th className="py-3 pr-4">数値水準</th>
                  <th className="py-3">統計解釈上の注意点</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-3.5 pr-4 font-bold text-amber-300 align-top">{row.topic}</td>
                    <td className="py-3.5 pr-4 align-top">{row.basis}</td>
                    <td className="py-3.5 pr-4 font-mono text-red-300 align-top">{row.figure}</td>
                    <td className="py-3.5 text-slate-400 align-top">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <Section
            title="数値が食い違う3つの統計トリックと検証ポイント"
            id="factcheck-methodology"
          >
            <ContentBlockRenderer blocks={factCheckBlocks} />
          </Section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2">
                直近国内報道（{totalCount}件）の国籍別出現件数トップ10
              </h2>
              <ul className="space-y-2.5 text-sm">
                {topNats.map(([nat, cnt]) => {
                  const slug = NAT_NAME_TO_SLUG.get(nat);
                  const pct = ((cnt / totalCount) * 100).toFixed(1);
                  return (
                    <li key={nat} className="flex items-center justify-between gap-2">
                      {slug ? (
                        <Link
                          to={`/analysis/crime-news/nationality/${slug}/`}
                          className="text-sky-300 hover:text-sky-200 underline decoration-sky-700/60"
                        >
                          {nat}
                        </Link>
                      ) : (
                        <span className="text-slate-300">{nat}</span>
                      )}
                      <span className="font-mono text-slate-200">
                        {cnt}件 <span className="text-slate-400 text-xs">({pct}%)</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2">
                直近国内報道（{totalCount}件）の罪種トップ10・ステージ分布
              </h2>
              <ul className="space-y-2 text-sm mb-5">
                {topCats.map(([cat, cnt]) => {
                  const hubPath = catHubMap.get(cat);
                  return (
                    <li key={cat} className="flex items-center justify-between gap-2">
                      {hubPath ? (
                        <Link
                          to={hubPath}
                          className="text-amber-300 hover:text-amber-200 underline decoration-amber-700/60 truncate"
                        >
                          {cat}
                        </Link>
                      ) : (
                        <span className="text-slate-300 truncate">{cat}</span>
                      )}
                      <span className="font-mono text-slate-200 shrink-0">{cnt}件</span>
                    </li>
                  );
                })}
              </ul>
              <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2 text-xs">
                {topStages.map(([st, cnt]) => (
                  <span key={st} className="px-2.5 py-1 rounded bg-slate-800 text-slate-200">
                    {st}: {cnt}件
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-5">外国人犯罪率の検証に関するFAQ</h2>
            <dl className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <dt className="font-bold text-amber-300 text-sm sm:text-base mb-1.5">Q. {faq.q}</dt>
                  <dd className="text-slate-300 text-sm leading-relaxed">A. {faq.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/analysis/crime-statistics/"
              className="px-4 py-2.5 rounded-xl bg-red-950/70 hover:bg-red-900/70 border border-red-800/60 text-red-200 text-sm font-semibold transition-colors"
            >
              参院答弁・1.72倍統計グラフを見る →
            </Link>
            <Link
              to="/analysis/non-prosecution/"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold transition-colors"
            >
              不起訴処分なぜ？実録データと解説 →
            </Link>
            <Link
              to="/analysis/crime-news/"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold transition-colors"
            >
              最新ニュースデータベース全{totalCount}件を見る →
            </Link>
          </div>

          <RelatedArticles currentPath="/analysis/crime-rate-factcheck" />
        </div>
      </div>
    </MainLayout>
  );
};
