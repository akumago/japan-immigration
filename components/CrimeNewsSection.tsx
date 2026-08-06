import React from 'react';
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

export const CrimeNewsSection: React.FC = () => {
  const items: NewsItem[] = newsData as NewsItem[];

  return (
    <section className="mb-20">
      <div className="bg-gradient-to-br from-[#161b22] via-[#0d1117] to-[#161b22] rounded-3xl border border-red-500/20 p-8 md:p-12 shadow-2xl relative overflow-hidden group hover:border-red-500/40 transition-all duration-500">
        {/* 背景光彩アクセント */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* ヘッダー部分 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-white/10 relative z-10 gap-4">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold mb-3 tracking-widest uppercase">
              <span className="relative flex h-2.5 w-2.5 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              DAILY AUTOMATED UPDATES
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              最新 外国人犯罪報道ニュース速報
            </h2>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              全国の地方紙・ローカルメディア等を含む最新報道を24時間監視し自動集計（毎日 09:00 自動更新）
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-mono text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              自動追尾監視中
            </span>
          </div>
        </div>

        {/* ニュース一覧リスト */}
        <div className="space-y-4 relative z-10">
          {items.length === 0 ? (
            <div className="text-center py-12 bg-[#0d1117]/60 rounded-2xl border border-white/5">
              <p className="text-gray-400 text-sm">直近24時間以内の新規報道事案は検出されていません。</p>
            </div>
          ) : (
            items.map((item) => (
              <div 
                key={item.id}
                className="group/card bg-[#0d1117]/80 hover:bg-[#161b22] border border-white/5 hover:border-red-500/30 rounded-2xl p-6 transition-all duration-300 shadow-lg relative overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 bg-red-950/80 text-red-300 border border-red-800/50 rounded-md text-xs font-bold font-mono">
                    📍 {item.location}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {item.date}
                  </span>
                  <span className="text-xs text-gray-500">
                    • 出典: <strong className="text-gray-300 font-normal">{item.media}</strong>
                  </span>
                </div>

                <h3 className="text-lg md:text-xl font-bold text-gray-100 group-hover/card:text-red-400 transition-colors mb-2 leading-snug">
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 hover:underline"
                  >
                    {item.title}
                    <svg className="w-4 h-4 text-gray-400 group-hover/card:text-red-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </h3>

                {item.summary && (
                  <p className="text-sm text-gray-300 leading-relaxed font-light">
                    {item.summary}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default CrimeNewsSection;
