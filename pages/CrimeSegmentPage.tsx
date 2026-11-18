import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MainLayout } from '../components/MainLayout';
import newsData from '../data/newsData.json';
import crimeSegments from '../data/crimeSegments.json';

interface NewsItem {
  id: string;
  title: string;
  date: string;
  location: string;
  media: string;
  stage?: string;
  url: string;
  summary: string;
  nationality?: string;
  crimeCategory?: string;
}

const PREF_SLUGS = crimeSegments.prefectures as Record<string, string>;
const NAT_SLUGS = crimeSegments.nationalities as Record<string, string>;

const CrimeSegmentView: React.FC<{ mode: 'pref' | 'nationality'; slug: string }> = ({ mode, slug }) => {
  const allItems = newsData as NewsItem[];
  const label = mode === 'pref' ? PREF_SLUGS[slug] : NAT_SLUGS[slug];

  const filteredItems = useMemo(() => {
    if (!label) return [];
    return allItems.filter((item) => (mode === 'pref' ? item.location === label : item.nationality === label));
  }, [allItems, mode, label]);

  const { latestDate, categoryCounts, stageCounts, subBreakdown, peerLinks } = useMemo(() => {
    const cats = new Map<string, number>();
    const stages = new Map<string, number>();
    const sub = new Map<string, number>();
    let maxDate = '';

    for (const item of filteredItems) {
      if (item.date && item.date > maxDate) maxDate = item.date;
      const cat = item.crimeCategory || 'その他刑事事件';
      cats.set(cat, (cats.get(cat) || 0) + 1);
      const stg = item.stage || '報道';
      stages.set(stg, (stages.get(stg) || 0) + 1);
      const subKey = mode === 'pref' ? item.nationality || '外国籍' : item.location || '全国';
      sub.set(subKey, (sub.get(subKey) || 0) + 1);
    }

    const peerMap = mode === 'pref' ? PREF_SLUGS : NAT_SLUGS;
    const peers = Object.entries(peerMap)
      .map(([k, name]) => ({
        slug: k,
        name,
        count: allItems.filter((i) => (mode === 'pref' ? i.location === name : i.nationality === name)).length,
      }))
      .filter((x) => x.count >= 5)
      .sort((a, b) => b.count - a.count);

    return {
      latestDate: maxDate || '最新',
      categoryCounts: Array.from(cats.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
      stageCounts: Array.from(stages.entries()).sort((a, b) => b[1] - a[1]),
      subBreakdown: Array.from(sub.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
      peerLinks: peers,
    };
  }, [filteredItems, allItems, mode]);

  if (!label) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">指定されたカテゴリは見つかりませんでした</h1>
          <Link to="/analysis/crime-news/" className="text-blue-400 hover:underline">
            外国人犯罪ニュース一覧（全件DB）に戻る →
          </Link>
        </div>
      </MainLayout>
    );
  }

  const pageTitle =
    mode === 'pref'
      ? `${label}の外国人犯罪・逮捕ニュース一覧（全${filteredItems.length}件）｜日本の岐路`
      : `${label}の犯罪・逮捕ニュース一覧（全${filteredItems.length}件）｜日本の岐路`;
  const pageDesc =
    mode === 'pref'
      ? `${label}内で報道された外国籍被疑者の逮捕・起訴・判決ニュース全${filteredItems.length}件（最新日: ${latestDate}）。罪種別の内訳と国籍別の発生件数を一覧で確認できます。`
      : `${label}の被疑者による日本国内での事件・逮捕報道全${filteredItems.length}件（最新日: ${latestDate}）。都道府県別の発生傾向と主な罪種内訳を集計・掲載しています。`;

  return (
    <MainLayout>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
      </Helmet>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav aria-label="パンくずリスト" className="text-xs text-gray-400 mb-6 flex flex-wrap items-center gap-2">
          <Link to="/" className="hover:text-blue-400">ホーム</Link>
          <span>/</span>
          <Link to="/analysis/crime-news/" className="hover:text-blue-400">外国人犯罪ニュースDB</Link>
          <span>/</span>
          <span className="text-gray-200 font-bold">{label}</span>
        </nav>

        <div className="mb-10 max-w-4xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold mb-3">
            {mode === 'pref' ? '📍 都道府県別 報道アーカイブ' : '🌐 国籍別 報道アーカイブ'}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4 leading-tight">
            {label}の外国人事件・逮捕ニュース一覧（全{filteredItems.length}件）
          </h1>
          <p className="text-gray-300 text-sm md:text-base leading-relaxed">
            全国の地方紙・テレビ局・警察発表から記録された、{label}に関連する事件・逮捕・起訴・裁判報道の集計ページです（最新収録日: {latestDate}）。全国の統計全体については{' '}
            <Link to="/analysis/crime-statistics/" className="text-blue-400 hover:underline font-medium">
              警察庁データに基づく外国人犯罪統計検証
            </Link>
            をご覧ください。
          </p>
        </div>

        {/* 集計サマリー（罪種別・内訳・手続段階別） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-gray-200 mb-4 border-b border-white/10 pb-2">
              📌 主な罪種内訳
            </h2>
            <ul className="space-y-2 text-xs text-gray-300">
              {categoryCounts.map(([cat, cnt]) => (
                <li key={cat} className="flex justify-between items-center">
                  <span className="truncate pr-2">{cat}</span>
                  <span className="font-mono font-bold text-red-400 shrink-0">{cnt}件</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-gray-200 mb-4 border-b border-white/10 pb-2">
              {mode === 'pref' ? '🌐 国籍別の内訳' : '📍 都道府県別の内訳'}
            </h2>
            <ul className="space-y-2 text-xs text-gray-300">
              {subBreakdown.map(([name, cnt]) => (
                <li key={name} className="flex justify-between items-center">
                  <span>{name}</span>
                  <span className="font-mono font-bold text-blue-400">{cnt}件</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-gray-200 mb-4 border-b border-white/10 pb-2">
              ⚖️ 報道時の手続段階
            </h2>
            <ul className="space-y-2 text-xs text-gray-300">
              {stageCounts.map(([stg, cnt]) => (
                <li key={stg} className="flex justify-between items-center">
                  <span>{stg}</span>
                  <span className="font-mono font-bold text-gray-200">{cnt}件</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 記事一覧 */}
        <div className="space-y-4 mb-12">
          {filteredItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="group bg-[#161b22] hover:bg-[#1c2128] border border-white/5 hover:border-red-500/30 rounded-2xl p-6 transition-all duration-300 shadow-lg"
            >
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="px-2.5 py-0.5 bg-red-950/80 text-red-300 border border-red-800/50 rounded-md text-xs font-bold font-mono">
                  📍 {item.location}
                </span>
                {item.nationality && (
                  <span className="px-2.5 py-0.5 bg-blue-950/80 text-blue-300 border border-blue-800/50 rounded-md text-xs font-bold font-mono">
                    🌐 {item.nationality}
                  </span>
                )}
                {item.crimeCategory && (
                  <span className="px-2.5 py-0.5 bg-white/5 text-gray-300 border border-white/10 rounded-md text-xs">
                    {item.crimeCategory}
                  </span>
                )}
                <span className="text-xs text-gray-400 font-mono">📅 {item.date}</span>
                <span className="text-xs text-gray-400">• {item.media}</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white group-hover:text-red-400 transition-colors mb-2 leading-snug">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {item.title} ↗
                </a>
              </h2>
              {item.summary && (
                <p className="text-gray-300 text-sm leading-relaxed font-light">{item.summary}</p>
              )}
            </div>
          ))}
        </div>

        {/* 他の地域・国籍集計ページへの相互リンク */}
        <div className="p-6 rounded-2xl bg-[#161b22] border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-sm font-bold text-gray-200">
              {mode === 'pref' ? '他の都道府県別 外国人事件一覧' : '他の国籍別 事件一覧'}
            </h2>
            <Link to="/analysis/crime-news/" className="text-xs font-bold text-blue-400 hover:underline">
              ← 全国版（複合フィルター）に戻る
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {peerLinks.map((peer) => (
              <Link
                key={peer.slug}
                to={`/analysis/crime-news/${mode === 'pref' ? 'pref' : 'nationality'}/${peer.slug}/`}
                className={`px-3 py-1.5 rounded-xl text-xs transition-colors border ${
                  peer.slug === slug
                    ? 'bg-red-600 text-white border-red-500 font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                }`}
              >
                {peer.name} ({peer.count})
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export const PrefCrimePage: React.FC = () => {
  const { pref = '' } = useParams<{ pref: string }>();
  return <CrimeSegmentView mode="pref" slug={pref} />;
};

export const NationalityCrimePage: React.FC = () => {
  const { nat = '' } = useParams<{ nat: string }>();
  return <CrimeSegmentView mode="nationality" slug={nat} />;
};
