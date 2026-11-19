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
import type { HubNewsItem } from '../lib/crimeHubs.mjs';

const ITEMS = newsData as HubNewsItem[];

const PREF_NAME_TO_SLUG = new Map<string, string>(
  Object.entries(crimeSegments.prefectures || {}).map(([slug, name]) => [String(name), slug])
);

const NAT_NAME_TO_SLUG = new Map<string, string>(
  Object.entries(crimeSegments.nationalities || {}).map(([slug, name]) => [String(name), slug])
);

const sortByDateDesc = (a: HubNewsItem, b: HubNewsItem) =>
  String(b.date || '').localeCompare(String(a.date || ''));

const countBy = (arr: HubNewsItem[], getter: (item: HubNewsItem) => string) => {
  const map = new Map<string, number>();
  for (const item of arr) {
    const k = getter(item);
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
};

export const NonProsecutionAnalysis: React.FC = () => {
  const nonProsItems = ITEMS.filter(item => item.stage === '不起訴').sort(sortByDateDesc);
  const totalCount = ITEMS.length;
  const sharePct = totalCount > 0 ? ((nonProsItems.length / totalCount) * 100).toFixed(1) : '0.0';
  const latestDate = nonProsItems[0]?.date || '2026-11-01';

  const topCats = countBy(nonProsItems, i => i.crimeCategory || 'その他');
  const topNats = countBy(nonProsItems, i => i.nationality || '外国籍（詳細不明）');
  const topPrefs = countBy(nonProsItems, i => i.prefecture || i.location || '不明');

  const pageTitle = `【一覧・構造解説】外国人犯罪の「不起訴」はなぜ？(${nonProsItems.length}件実録)と起訴便宜主義・司法実務 | 日本の岐路`;
  const pageDesc = `ニュースで外国籍被疑者の「不起訴処分」が相次ぐ背景を日本の刑事訴訟法・起訴便宜主義・通訳コスト・強制送還手続から客観解説。国内報道から抽出した最新の不起訴${nonProsItems.length}件一覧も同時収録。`;
  const canonicalUrl = 'https://endearing-blini-b688ce.netlify.app/analysis/non-prosecution/';

  const structureBlocks: ContentBlock[] = [
    {
      type: 'subheading',
      text: '1. 「不起訴＝無罪・嫌疑なし」ではない（3つの類型）'
    },
    {
      type: 'paragraph',
      text: 'ニュース速報で「○○容疑者を不起訴処分とした」と報じられると、無実が証明されたように受け止められがちですが、検察庁の統計（検察統計年報）上、不起訴処分の理由は主に「起訴猶予」「嫌疑不十分」「嫌疑なし」などに分かれます。実際には犯罪の成立自体に疑いがある場合だけでなく、被疑者が罪を犯したことが明白であっても諸般の事情で公判請求を見送る「起訴猶予」が多く含まれます。'
    },
    {
      type: 'list',
      text: [
        '嫌疑なし：被疑者が犯人でないことが明白、または犯罪成立を認める証拠がない場合。',
        '嫌疑不十分：犯罪の疑いは残るものの、日本の刑事裁判で求められる厳格な有罪立証（「合理的な疑いを差し挟む余地のない証明」）に耐えうる十分な証拠が揃わない場合。',
        '起訴猶予（刑事訴訟法第248条）：犯罪事実は認定できるものの、犯人の性格・年齢・境遇、犯罪の軽重・情状、被害者との示談成立や被害弁償、退去強制の見通しなどを総合考慮し、あえて起訴しない判断。'
      ]
    },
    {
      type: 'subheading',
      text: '2. 通訳・司法翻訳と勾留期限（最大23日）の現場制約'
    },
    {
      type: 'paragraph',
      text: '日本の刑事手続では、被疑者の権利保障と供述調書の任意性・信用性担保のため、母国語に対応した警察・検察の通訳人確保が不可欠です。しかし希少言語や方言では専門通訳の確保自体に日数を要し、原則10日・延長を含めても最大23日という厳格な勾留期間内に、複数の容疑者や共犯者との供述矛盾を精査し終える負担が大きくなります。証拠関係が複雑な場合、勾留満期で処分保留釈放や嫌疑不十分での不起訴に至る構造的ハードルが指摘されています。'
    },
    {
      type: 'subheading',
      text: '3. 示談成立・強制送還（退去強制手続）との実務関係'
    },
    {
      type: 'paragraph',
      text: '財産犯や暴行・交通事犯等において被害者への全額弁償と示談が成立した場合、国籍を問わず起訴猶予となるケースは少なくありません。また不法滞在を伴う事案や在留資格取消・退去強制対象となるケースでは、日本の刑務所で長期間公費収容・服役させるよりも、出入国在留管理局による退去強制（強制送還・一定期間の上陸拒否）へ引き継ぐ実務判断が働く場合がある点も、一般から見えにくい理由の一つです。'
    },
    {
      type: 'subheading',
      text: '4. なぜ検察は個別の不起訴理由を公表しないのか'
    },
    {
      type: 'paragraph',
      text: '検察庁は原則として個別の不起訴事件について具体的理由（「起訴猶予」か「嫌疑不十分」か等）を報道発表しない運用を採っています。これは、不起訴になった元被疑者の名誉・プライバシー保護（前科がつかない状態での社会復帰配慮）や、被害者・関係者の個人情報保護、再捜査への支障回避を理由としています。一方で理由が非公表であるため、重大事件の被害者側や地域住民にとって判断基準が不透明に映りやすく、制度説明と検察審査会への不服申立制度の周知が課題となっています。'
    }
  ];

  const faqs = [
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
      q: `現在このサイトに記録されている最新の「不起訴」報道は何件ありますか？`,
      a: `国内メディア一次報道アーカイブ（全${totalCount}件）のうち、「不起訴」ステージに分類された報道記録は現在${nonProsItems.length}件（全体の${sharePct}%、最新収録日${latestDate}）です。`
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
          content="外国人 不起訴 なぜ,外国人犯罪 不起訴 一覧,外国人 逮捕 不起訴 理由,起訴猶予,嫌疑不十分,検察審査会,退去強制"
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
            <Link to="/analysis/crime-news/" className="hover:text-white transition-colors">
              外国人犯罪速報アーカイブ
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">外国人事件の不起訴処分分析</span>
          </nav>

          <Header
            title={`【実録${nonProsItems.length}件＆徹底解説】外国人犯罪の「不起訴」はなぜ起きるのか`}
            description="ニュースで相次ぐ「不起訴処分」の背景にある日本の刑事訴訟法（起訴便宜主義）・勾留期限・通訳体制・強制送還との関係を整理し、実際の国内報道一覧とともに検証します。"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-rose-800/50 rounded-2xl p-5">
              <div className="text-xs text-slate-400 mb-1">収録済み「不起訴」報道件数</div>
              <div className="text-3xl font-black text-rose-400">
                {nonProsItems.length}
                <span className="text-sm font-normal text-slate-400 ml-1">件</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">全収録{totalCount}件中の {sharePct}%</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs text-slate-400 mb-1">不起訴報道で多い罪種（上位）</div>
              <div className="text-sm font-bold text-amber-300 mt-1 space-y-1">
                {topCats.slice(0, 3).map(([cat, cnt]) => (
                  <div key={cat} className="flex justify-between gap-2">
                    <span className="truncate">{cat}</span>
                    <span className="font-mono shrink-0">{cnt}件</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs text-slate-400 mb-1">専用データハブ・関連統計</div>
              <div className="flex flex-col gap-2 mt-2">
                <Link
                  to="/analysis/crime-news/stage/non-prosecution/"
                  className="text-xs font-semibold text-sky-300 hover:text-sky-200 underline"
                >
                  不起訴処分ハブページ（詳細集計）→
                </Link>
                <Link
                  to="/analysis/crime-statistics/"
                  className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline"
                >
                  警察庁統計・検挙率1.72倍の分析 →
                </Link>
                <Link
                  to="/analysis/crime-rate-factcheck/"
                  className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 underline"
                >
                  「犯罪率デマ」検証ファクトチェック →
                </Link>
              </div>
            </div>
          </div>

          <Section
            title="日本の検察制度・実務で「不起訴」が選ばれる4つの構造"
            id="non-prosecution-reasons"
          >
            <ContentBlockRenderer blocks={structureBlocks} />
          </Section>

          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white">
                国内一次報道から抽出した「不起訴」事例一覧（全{nonProsItems.length}件・新着順）
              </h2>
              <span className="text-xs text-slate-400">最新報道日: {latestDate}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div>
                <div className="font-bold text-slate-300 mb-2">国籍別内訳（不起訴事例）</div>
                <div className="flex flex-wrap gap-2">
                  {topNats.map(([nat, cnt]) => {
                    const slug = NAT_NAME_TO_SLUG.get(nat);
                    return slug ? (
                      <Link
                        key={nat}
                        to={`/analysis/crime-news/nationality/${slug}/`}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300"
                      >
                        {nat} ({cnt})
                      </Link>
                    ) : (
                      <span key={nat} className="px-2 py-1 rounded bg-slate-800 text-slate-300">
                        {nat} ({cnt})
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-300 mb-2">主な報道地域（上位）</div>
                <div className="flex flex-wrap gap-2">
                  {topPrefs.slice(0, 8).map(([pref, cnt]) => {
                    const slug = PREF_NAME_TO_SLUG.get(pref);
                    return slug ? (
                      <Link
                        key={pref}
                        to={`/analysis/crime-news/pref/${slug}/`}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300"
                      >
                        {pref} ({cnt})
                      </Link>
                    ) : (
                      <span key={pref} className="px-2 py-1 rounded bg-slate-800 text-slate-300">
                        {pref} ({cnt})
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {nonProsItems.map(item => {
                const prefName = item.prefecture || item.location || '';
                const prefSlug = PREF_NAME_TO_SLUG.get(prefName);
                const natSlug = item.nationality ? NAT_NAME_TO_SLUG.get(item.nationality) : undefined;
                return (
                  <article
                    key={item.id}
                    id={`incident-${item.id}`}
                    className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                      <time dateTime={item.date} className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {item.date}
                      </time>
                      <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-700/70 text-rose-200 font-semibold">
                        不起訴
                      </span>
                      {prefSlug ? (
                        <Link
                          to={`/analysis/crime-news/pref/${prefSlug}/`}
                          className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 hover:bg-slate-700"
                        >
                          {item.location}
                        </Link>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">{item.location}</span>
                      )}
                      {item.nationality && (
                        natSlug ? (
                          <Link
                            to={`/analysis/crime-news/nationality/${natSlug}/`}
                            className="px-2 py-0.5 rounded bg-red-950/60 border border-red-800/50 text-red-200 hover:bg-red-900/60"
                          >
                            {item.nationality}
                          </Link>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-800/50 text-red-200">
                            {item.nationality}
                          </span>
                        )
                      )}
                      {item.crimeCategory && (
                        <span className="px-2 py-0.5 rounded bg-amber-950/50 border border-amber-800/40 text-amber-200">
                          {item.crimeCategory}
                        </span>
                      )}
                      <span className="text-slate-400 ml-auto">{item.media}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-rose-300 transition-colors"
                      >
                        {item.title} ↗
                      </a>
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{item.summary}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-5">外国人犯罪の不起訴に関するFAQ</h2>
            <dl className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <dt className="font-bold text-amber-300 text-sm sm:text-base mb-1.5">Q. {faq.q}</dt>
                  <dd className="text-slate-300 text-sm leading-relaxed">A. {faq.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <RelatedArticles currentPath="/analysis/non-prosecution" />
        </div>
      </div>
    </MainLayout>
  );
};
