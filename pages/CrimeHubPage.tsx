import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MainLayout } from '../components/MainLayout';
import newsData from '../data/newsData.json';
import crimeSegments from '../data/crimeSegments.json';
import {
  getAllEligibleHubs,
  getHubDefinition,
  filterItemsByHub,
  buildHubSeoMeta,
  type HubMode,
  type HubNewsItem
} from '../lib/crimeHubs.mjs';

const ITEMS = newsData as HubNewsItem[];

const PREF_NAME_TO_SLUG = new Map<string, string>(
  Object.entries(crimeSegments.prefectures || {}).map(([slug, name]) => [String(name), slug])
);

const NAT_NAME_TO_SLUG = new Map<string, string>(
  Object.entries(crimeSegments.nationalities || {}).map(([slug, name]) => [String(name), slug])
);

const STAGE_CLASS_MAP: Record<string, string> = {
  '逮捕': 'bg-red-950/70 text-red-300 border-red-700/60',
  '再逮捕': 'bg-orange-950/70 text-orange-300 border-orange-700/60',
  '送検': 'bg-amber-950/70 text-amber-300 border-amber-700/60',
  '起訴': 'bg-purple-950/70 text-purple-300 border-purple-700/60',
  '初公判・公判': 'bg-indigo-950/70 text-indigo-300 border-indigo-700/60',
  '判決': 'bg-blue-950/70 text-blue-300 border-blue-700/60',
  '不起訴': 'bg-rose-950/80 text-rose-200 border-rose-600/70'
};

interface HubViewProps {
  mode: HubMode;
}

const HubView: React.FC<HubViewProps> = ({ mode }) => {
  const { slug = '' } = useParams<{ slug: string }>();
  const def = getHubDefinition(ITEMS, mode, slug);
  const matched = def ? filterItemsByHub(ITEMS, mode, def) : [];
  const meta = def ? buildHubSeoMeta(ITEMS, mode, def, matched) : null;
  const allEligible = getAllEligibleHubs(ITEMS);

  if (!def || !meta || matched.length === 0) {
    return (
      <MainLayout>
        <Helmet>
          <html lang="ja" />
          <title>指定された特集ハブが見つかりません | 日本の岐路</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4">
          <div className="max-w-4xl mx-auto bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">指定された犯罪報道アーカイブが見つかりません</h1>
            <p className="text-slate-400 mb-6">
              条件に該当する報道データが規定件数未満であるか、URLが変更された可能性があります。
            </p>
            <Link
              to="/analysis/crime-news/"
              className="inline-flex items-center px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
            >
              外国人犯罪速報アーカイブ（全件一覧）へ戻る
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const eligibleCategoryMap = new Map<string, string>(
    allEligible.filter(h => h.mode === 'category').map(h => [h.label, h.path])
  );
  const eligibleStageMap = new Map<string, string>(
    allEligible.filter(h => h.mode === 'stage').map(h => [String(h.def?.match || h.label), h.path])
  );

  const siblingHubs = allEligible.filter(h => h.mode === mode && h.slug !== meta.slug);
  const otherTopicHubs = allEligible.filter(h => h.mode !== mode).slice(0, 12);

  return (
    <MainLayout>
      <Helmet>
        <html lang="ja" />
        <title>{meta.title}</title>
        <meta name="prerender-title" content={meta.title} />
        <meta name="description" content={meta.desc} />
        <meta name="keywords" content={meta.keywords} />
        <link rel="canonical" href={meta.canonicalUrl} />
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      </Helmet>

      <div className="min-h-screen bg-slate-950 text-slate-100 py-8 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <nav aria-label="パンくずリスト" className="text-xs sm:text-sm text-slate-400 flex flex-wrap items-center gap-2">
            <Link to="/" className="hover:text-white transition-colors">
              トップ
            </Link>
            <span>/</span>
            <Link to="/analysis/crime-news/" className="hover:text-white transition-colors">
              外国人犯罪速報アーカイブ
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">{meta.label}</span>
          </nav>

          <header className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-semibold mb-4">
              <span>{meta.badge}</span>
              <span>・</span>
              <span>自動集計ハブ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug mb-4">
              {meta.h1}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
              {meta.leadParagraph}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 mb-1">該当報道件数</div>
                <div className="text-2xl sm:text-3xl font-black text-red-400">
                  {meta.stats.count}
                  <span className="text-sm font-normal text-slate-400 ml-1">件</span>
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 mb-1">全収録({meta.stats.totalAll}件)中の構成比</div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400">
                  {meta.stats.sharePct}
                  <span className="text-sm font-normal text-slate-400 ml-1">%</span>
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 mb-1">最新報道日</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-100">{meta.stats.latestDate}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to={meta.guidePath}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/50 text-blue-200 text-xs sm:text-sm font-medium transition-colors"
              >
                統計・制度解説を読む: {meta.guideLabel} →
              </Link>
              <Link
                to="/analysis/non-prosecution/"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition-colors"
              >
                不起訴処分・検察対応の徹底検証を見る
              </Link>
              <Link
                to="/analysis/crime-rate-factcheck/"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition-colors"
              >
                「外国人犯罪率」デマ検証・警察庁統計
              </Link>
            </div>
          </header>

          <section aria-label="集計内訳サマリー" className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <h2 className="text-base font-bold text-white mb-3 border-b border-slate-800 pb-2">
                国籍別の内訳（上位）
              </h2>
              <ul className="space-y-2 text-sm">
                {meta.stats.topNats.slice(0, 8).map(([nat, count]) => {
                  const natSlug = NAT_NAME_TO_SLUG.get(nat);
                  return (
                    <li key={nat} className="flex items-center justify-between gap-2">
                      {natSlug ? (
                        <Link
                          to={`/analysis/crime-news/nationality/${natSlug}/`}
                          className="text-sky-300 hover:text-sky-200 underline decoration-sky-700/60 truncate"
                        >
                          {nat}
                        </Link>
                      ) : (
                        <span className="text-slate-300 truncate">{nat}</span>
                      )}
                      <span className="font-mono text-slate-200 font-semibold shrink-0">{count}件</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <h2 className="text-base font-bold text-white mb-3 border-b border-slate-800 pb-2">
                発生都道府県別（上位）
              </h2>
              <ul className="space-y-2 text-sm">
                {meta.stats.topPrefs.slice(0, 8).map(([pref, count]) => {
                  const prefSlug = PREF_NAME_TO_SLUG.get(pref);
                  return (
                    <li key={pref} className="flex items-center justify-between gap-2">
                      {prefSlug ? (
                        <Link
                          to={`/analysis/crime-news/pref/${prefSlug}/`}
                          className="text-sky-300 hover:text-sky-200 underline decoration-sky-700/60 truncate"
                        >
                          {pref}
                        </Link>
                      ) : (
                        <span className="text-slate-300 truncate">{pref}</span>
                      )}
                      <span className="font-mono text-slate-200 font-semibold shrink-0">{count}件</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <h2 className="text-base font-bold text-white mb-3 border-b border-slate-800 pb-2">
                罪種・司法ステージ分布
              </h2>
              <ul className="space-y-2 text-sm mb-4">
                {meta.stats.topCats.slice(0, 5).map(([cat, count]) => {
                  const catPath = eligibleCategoryMap.get(cat);
                  return (
                    <li key={cat} className="flex items-center justify-between gap-2">
                      {catPath && catPath !== meta.path ? (
                        <Link
                          to={catPath}
                          className="text-amber-300 hover:text-amber-200 underline decoration-amber-700/60 truncate"
                        >
                          {cat}
                        </Link>
                      ) : (
                        <span className="text-slate-300 truncate">{cat}</span>
                      )}
                      <span className="font-mono text-slate-200 font-semibold shrink-0">{count}件</span>
                    </li>
                  );
                })}
              </ul>
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                {meta.stats.topStages.slice(0, 6).map(([st, cnt]) => {
                  const stPath = eligibleStageMap.get(st);
                  const chip = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300">
                      {st}: {cnt}
                    </span>
                  );
                  return stPath && stPath !== meta.path ? (
                    <Link key={st} to={stPath} className="hover:opacity-80">
                      {chip}
                    </Link>
                  ) : (
                    <React.Fragment key={st}>{chip}</React.Fragment>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="incident-list" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                報道記録一覧（全{matched.length}件・新着順）
              </h2>
              <span className="text-xs text-slate-400">
                全件・全国紙・地方紙の一次報道ソースリンク付き
              </span>
            </div>

            <div className="space-y-4">
              {matched.map(item => {
                const stageName = item.stage || '逮捕';
                const stageCls = STAGE_CLASS_MAP[stageName] || 'bg-slate-800 text-slate-300 border-slate-700';
                const prefName = item.prefecture || item.location || '';
                const prefSlug = PREF_NAME_TO_SLUG.get(prefName);
                const natSlug = item.nationality ? NAT_NAME_TO_SLUG.get(item.nationality) : undefined;

                return (
                  <article
                    key={item.id}
                    id={`incident-${item.id}`}
                    className="bg-slate-900/75 border border-slate-800/90 hover:border-slate-700 rounded-xl p-5 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-2.5">
                      <time dateTime={item.date} className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {item.date}
                      </time>
                      <span className={`px-2 py-0.5 rounded border font-semibold ${stageCls}`}>
                        {stageName}
                      </span>
                      {prefSlug ? (
                        <Link
                          to={`/analysis/crime-news/pref/${prefSlug}/`}
                          className="px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-sky-300 transition-colors"
                        >
                          {item.location}
                        </Link>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-300">{item.location}</span>
                      )}
                      {item.nationality && (
                        natSlug ? (
                          <Link
                            to={`/analysis/crime-news/nationality/${natSlug}/`}
                            className="px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900/60 border border-red-800/50 text-red-200 transition-colors"
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

                    <h3 className="text-base sm:text-lg font-bold text-white leading-snug mb-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-red-300 transition-colors"
                      >
                        {item.title} ↗
                      </a>
                    </h3>

                    {item.summary && (
                      <p className="text-sm text-slate-300 leading-relaxed">{item.summary}</p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section id="hub-faq" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-5">
              「{meta.label}」に関するよくある質問（FAQ）
            </h2>
            <dl className="space-y-4">
              {meta.faqs.map((faq, idx) => (
                <div key={idx} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 sm:p-5">
                  <dt className="font-bold text-amber-300 text-sm sm:text-base mb-2">Q. {faq.q}</dt>
                  <dd className="text-slate-300 text-sm leading-relaxed">A. {faq.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 text-xs sm:text-sm text-slate-400 space-y-2">
            <h2 className="text-sm font-bold text-slate-200">出典・引用ガイドライン</h2>
            <p>
              本ページの集計対象は、日本国内の全国紙・地方紙・通信社・警察発表等の一次報道に基づきます。記事・研究・SNS等で数値を引用される際は、本ページのパーマリンクをご参照ください。
            </p>
            <div className="font-mono text-xs bg-slate-950 px-3 py-2 rounded border border-slate-800 text-slate-300 break-all">
              {meta.canonicalUrl}
            </div>
          </section>

          {siblingHubs.length > 0 && (
            <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">同じ分類軸の別アーカイブ</h2>
              <div className="flex flex-wrap gap-2">
                {siblingHubs.map(hub => (
                  <Link
                    key={hub.path}
                    to={hub.path}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm text-slate-200 transition-colors"
                  >
                    {hub.label} ({hub.stats.count})
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">関連する特集・分析ハブ</h2>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/analysis/crime-news/"
                className="px-3 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900/70 border border-red-800/60 text-xs sm:text-sm text-red-200 font-semibold transition-colors"
              >
                外国人犯罪速報アーカイブ全件 ({ITEMS.length})
              </Link>
              {otherTopicHubs.map(hub => (
                <Link
                  key={hub.path}
                  to={hub.path}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm text-slate-300 transition-colors"
                >
                  {hub.label} ({hub.stats.count})
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
};

export const CategoryCrimePage: React.FC = () => <HubView mode="category" />;
export const StageCrimePage: React.FC = () => <HubView mode="stage" />;
export const TopicCrimePage: React.FC = () => <HubView mode="topic" />;
export const AreaCrimePage: React.FC = () => <HubView mode="area" />;
export const MonthCrimePage: React.FC = () => <HubView mode="month" />;
export const CrossCrimePage: React.FC = () => <HubView mode="cross" />;
