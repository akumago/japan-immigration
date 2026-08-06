import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { MainLayout } from '../components/MainLayout';
import newsData from '../data/newsData.json';

interface NewsItem {
  id: string;
  title: string;
  date: string;
  location: string;
  media: string;
  url: string;
  summary: string;
}

export const CrimeNewsArchive: React.FC = () => {
  const items: NewsItem[] = newsData as NewsItem[];
  const [selectedPref, setSelectedPref] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const ITEMS_PER_PAGE = 15;

  // ユニークな都道府県リスト
  const prefectures = useMemo(() => {
    const prefs = new Set<string>();
    items.forEach(item => {
      if (item.location && item.location !== '全国') {
        prefs.add(item.location);
      }
    });
    return Array.from(prefs).sort();
  }, [items]);

  // フィルタリング処理
  const filteredItems = useMemo(() => {
    if (selectedPref === 'ALL') return items;
    return items.filter(item => item.location === selectedPref);
  }, [items, selectedPref]);

  // 総ページ数
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  // 現在のページに表示するニュース
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // フィルター変更時は1ページ目へ戻す
  const handlePrefChange = (pref: string) => {
    setSelectedPref(pref);
    setCurrentPage(1);
  };

  return (
    <MainLayout>
      <Helmet>
        <title>外国人犯罪報道 日次アーカイブ＆データベース | 日本の岐路</title>
        <meta
          name="description"
          content="全国の地方紙・ローカルメディアを含む最新の外国人事件・逮捕報道を日次で自動集計・記録するデータベース。都道府県別の事件履歴を閲覧いただけます。"
        />
        <meta
          name="keywords"
          content="外国人犯罪,逮捕報道,地方紙ニュース,治安データベース,不法滞在,治安維持"
        />
      </Helmet>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ヘッダーセクション */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold mb-4 tracking-widest uppercase">
            <span className="relative flex h-2.5 w-2.5 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            AUTOMATED DAILY INCIDENT DATABASE
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
            外国人犯罪報道 <span className="text-red-500 border-b-4 border-red-500">日次データベース</span>
          </h1>
          <p className="text-gray-300 text-base md:text-lg font-light leading-relaxed">
            全国の地方紙・主要報道メディア等のニュースから、外国人が関与する案件を自動取得・累積保存しています（毎日 09:00 自動更新）。
          </p>
        </div>

        {/* 都道府県絞り込みフィルター */}
        <div className="mb-10 bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
            <h2 className="text-sm font-bold text-gray-300 flex items-center gap-2 font-mono uppercase tracking-wider">
              <span>🔍</span> 地域絞り込みフィルター
            </h2>
            <span className="text-xs text-gray-400 font-mono">
              該当件数: <strong className="text-red-400 text-sm">{filteredItems.length}</strong> / 全 {items.length} 件 （ページ {currentPage} / {totalPages || 1}）
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePrefChange('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedPref === 'ALL'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              すべて表示 ({items.length})
            </button>
            {prefectures.map(pref => {
              const count = items.filter(i => i.location === pref).length;
              return (
                <button
                  key={pref}
                  onClick={() => handlePrefChange(pref)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selectedPref === pref
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
                  }`}
                >
                  {pref} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* ニュースカード一覧 */}
        <div className="space-y-4">
          {paginatedItems.length === 0 ? (
            <div className="text-center py-16 bg-[#161b22]/50 rounded-2xl border border-white/5">
              <p className="text-gray-400">指定された条件での報道ログは登録されていません。</p>
            </div>
          ) : (
            paginatedItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="group bg-[#161b22] hover:bg-[#1c2128] border border-white/5 hover:border-red-500/30 rounded-2xl p-6 md:p-8 transition-all duration-300 shadow-xl relative overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-red-950/80 text-red-300 border border-red-800/50 rounded-lg text-xs font-bold font-mono">
                    📍 {item.location}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    📅 {item.date}
                  </span>
                  <span className="text-xs text-gray-400">
                    • 報道メディア: <strong className="text-gray-200">{item.media}</strong>
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-white group-hover:text-red-400 transition-colors mb-3 leading-snug">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:underline"
                  >
                    {item.title}
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </h2>

                {item.summary && (
                  <p className="text-gray-300 text-sm md:text-base leading-relaxed font-light">
                    {item.summary}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* ページネーションコントロール */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                currentPage === 1
                  ? 'bg-white/5 text-gray-600 border-white/5 cursor-not-allowed'
                  : 'bg-[#161b22] hover:bg-[#1c2128] text-gray-200 border-white/10 hover:border-red-500/30'
              }`}
            >
              ❮ 前へ
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-xl text-xs font-bold transition-all border ${
                  currentPage === page
                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30'
                    : 'bg-[#161b22] hover:bg-[#1c2128] text-gray-300 border-white/10 hover:border-red-500/30'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                currentPage === totalPages
                  ? 'bg-white/5 text-gray-600 border-white/5 cursor-not-allowed'
                  : 'bg-[#161b22] hover:bg-[#1c2128] text-gray-200 border-white/10 hover:border-red-500/30'
              }`}
            >
              次へ ❯
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CrimeNewsArchive;
