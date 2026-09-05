import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '../components/Header';
import { SocialShare } from '../components/SocialShare';
import { SLIDE_ANALYSIS_DATA } from '../data/slideData';
import { SlideDeepAnalysisBlock } from '../components/SlideDeepAnalysisBlock';

export const ImagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const displayNum = parseInt(id || '1', 10);
  const slide = SLIDE_ANALYSIS_DATA[displayNum];
  
  const pageNum = id?.padStart(4, '0') || '0001';
  const imageSrc = `/ilovepdf_pages-to-jpg/Japan_s_Collapse_The_Vicious_Cycle_page-${pageNum}.jpg`;

  if (!slide) {
    return <div className="p-20 text-center">Slide not found.</div>;
  }

  // Structured Data for SEO/AdSense
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VisualBusinessReport",
    "name": slide.title,
    "description": slide.seoDescription,
    "image": `https://jssar.org${imageSrc}`,
    "author": {
      "@type": "Organization",
      "name": "日本社会構造分析リサーチ"
    }
  };

  return (
    <div className="bg-[#0d1117] min-h-screen text-gray-300 font-sans xl:pl-72 2xl:pl-80">
      <Helmet>
        <title>{`${slide.title} | 日本の岐路`}</title>
        <meta name="description" content={slide.seoDescription} />
        <meta name="keywords" content={slide.keywords.join(', ')} />
        <meta property="og:title" content={`${slide.title} | 日本の岐路`} />
        <meta property="og:description" content={slide.seoDescription} />
        <meta property="og:image" content={`https://endearing-blini-b688ce.netlify.app${imageSrc}`} />
        <meta property="og:url" content={`https://endearing-blini-b688ce.netlify.app/analysis/image/${id}`} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${slide.title} | 日本の岐路`} />
        <meta name="twitter:description" content={slide.seoDescription} />
        <meta name="twitter:image" content={`https://endearing-blini-b688ce.netlify.app${imageSrc}`} />
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <Header title={slide.title} description="視覚的データと詳細分析レポート" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex justify-between items-center">
            <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center">
                <span className="mr-2">←</span> トップページへ
            </Link>
            <div className="text-sm text-gray-400 font-mono">
                PAGE: {displayNum} / 15
            </div>
        </div>

        <div className="flex flex-col items-center">
            <div className="w-full bg-gray-900 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-800 mb-10 transition-all duration-500 hover:border-blue-500/30">
                <img 
                    src={imageSrc} 
                    alt={slide.title}
                    className="w-full h-auto object-contain"
                />
            </div>

            <div className="w-full max-w-4xl bg-gradient-to-br from-gray-900 to-black p-8 md:p-12 rounded-2xl border border-gray-800 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z" />
                    </svg>
                    画像解説・分析内容
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
                    {slide.description}
                </p>
                
                <div className="mt-8 pt-8 border-t border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-blue-400 font-semibold mb-2 text-sm uppercase tracking-wider">主要キーワード</h4>
                        <div className="flex flex-wrap gap-2">
                            {slide.keywords.map(kw => (
                                <span key={kw} className="px-3 py-1 bg-blue-900/20 text-blue-300 text-xs rounded-full border border-blue-500/20">
                                    #{kw}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-blue-400 font-semibold mb-2 text-sm uppercase tracking-wider">共有・拡散</h4>
                        <SocialShare />
                    </div>
                </div>
            </div>
        </div>

        {/* Navigation between images */}
        <div className="mt-12 flex justify-between items-center max-w-4xl mx-auto w-full">
            {displayNum > 1 ? (
                <Link to={`/analysis/image/${displayNum - 1}`} className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl transition-all">
                    ← 前のページ
                </Link>
            ) : <div />}
            
            {displayNum < 15 ? (
                <Link to={`/analysis/image/${displayNum + 1}`} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 font-bold">
                    次のページ →
                </Link>
            ) : <div />}
        </div>

        {/* 追記部分: 新規コンポーネントの呼び出し（各画像に合致する2000文字規模の分析ブロックを表示） */}
        <SlideDeepAnalysisBlock displayNum={displayNum} />

      </main>
    </div>
  );
};
