import React from 'react';
import { TableOfContents } from './TableOfContents';
import { SHARED_TOC_ITEMS, CRAWLER_NAV_LINKS } from '../constants';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CookieConsent } from './CookieConsent';

interface LayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const siteUrl = 'https://endearing-blini-b688ce.netlify.app';
    const canonicalUrl = `${siteUrl}${location.pathname}${location.pathname.endsWith('/') ? '' : '/'}`;

    // 動的JSON-LD構造化データの生成
    const isHomePage = location.pathname === '/';
    
    // ページごとの公開日・更新日の定義 (E-E-A-T対応のための静的日付マッピング)
    const pageDates: Record<string, { published: string; modified: string }> = {
        '/analysis/crime-statistics/': { published: '2026-07-04T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' },
        '/analysis/economic-impact/': { published: '2026-07-05T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' },
        '/analysis/borderless-welfare-state/': { published: '2026-07-06T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' },
        '/analysis/simulation-model/': { published: '2026-07-07T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' },
        '/analysis/national-security/': { published: '2026-07-08T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' },
        '/analysis/land-acquisition/': { published: '2026-07-09T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' },
        '/analysis/uk-immigration-lesson/': { published: '2026-07-10T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' },
        '/analysis/labor-dilemma/': { published: '2026-07-11T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' },
        '/analysis/symbiosis/': { published: '2026-07-12T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' },
        '/analysis/nigeria-case/': { published: '2026-07-13T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' },
        '/analysis/strategic-recommendations/': { published: '2026-07-14T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' },
        '/analysis/conclusion/': { published: '2026-07-15T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' },
    };

    const currentPath = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
    const dates = pageDates[currentPath] || { published: '2026-07-01T08:00:00+09:00', modified: '2026-07-15T12:00:00+09:00' };

    const jsonLd = isHomePage
        ? {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": "日本の岐路：外国人労働者受け入れ政策における構造的課題と国民経済への影響",
              "description": "外国人移民政策が日本の経済、社会、安全保障に与える影響を、公的統計データと事例分析に基づき包括的に検証。",
              "url": siteUrl,
              "about": {
                  "@type": "Dataset",
                  "name": "日本社会構造分析移民政策データセット",
                  "description": "日本国内における移民受け入れ政策の推移、将来の人口およびマクロ経済動態予測シミュレーション、法務省公表データに基づく来日外国人犯罪統計、および財政的影響に関する実証分析を含む、日本社会の構造的変化に関する一次および二次統計データセット集。",
                  "license": "https://creativecommons.org/publicdomain/zero/1.0/",
                  "creator": {
                      "@type": "Organization",
                      "name": "日本社会構造分析リサーチ"
                  },
                  "publisher": {
                      "@type": "Organization",
                      "name": "日本社会構造分析リサーチ"
                  }
              }
          }
        : {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              "mainEntityOfPage": {
                  "@type": "WebPage",
                  "@id": canonicalUrl
              },
              "headline": "日本の岐路 分析レポート",
              "description": "公的データに基づく移民政策の影響分析レポート。",
              "image": [
                  "https://endearing-blini-b688ce.netlify.app/ogp-image-2.png"
              ],
              "url": canonicalUrl,
              "author": {
                  "@type": "Person",
                  "name": "Akuma Shogun",
                  "jobTitle": "独立系社会・経済データビジュアライザー",
                  "sameAs": [
                      "https://note.com/ideal_kudu9256",
                      "https://x.com/"
                  ]
              },
              "publisher": {
                  "@type": "Organization",
                  "name": "日本社会構造分析リサーチ",
                  "logo": {
                      "@type": "ImageObject",
                      "url": "https://endearing-blini-b688ce.netlify.app/ogp-image-2.png"
                  }
              },
              "datePublished": dates.published,
              "dateModified": dates.modified
          };

    return (
        <div className="bg-[#0d1117] min-h-screen text-gray-300 font-sans">
            <Helmet>
                {/* 1. 重複インデックスを防ぐ canonical の動的設定 */}
                <link rel="canonical" href={canonicalUrl} />
                
                {/* 2. Schema.org に基づく JSON-LD 構造化データの定義 */}
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            </Helmet>

            {/* TOC Icon - Universal for all screens */}
            <TableOfContents sections={SHARED_TOC_ITEMS} />
            
            {/* Main Content Area - Centered, no permanent sidebar padding */}
            <div className="w-full">
                {children}
            </div>

            {/* Cookie同意バナーの追加 */}
            <CookieConsent />

            {/* SEO Crawler Highway - Essential for indexing 44+ pages */}
            <footer id="seo-crawler-nav" className="mt-20 py-10 border-t border-white/5 opacity-20 hover:opacity-100 transition-opacity duration-500">
                <div className="max-w-7xl mx-auto px-4 text-[10px] leading-relaxed">
                    <p className="text-gray-500 mb-4 font-bold uppercase tracking-widest text-center">Crawler Navigation Map</p>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                        {CRAWLER_NAV_LINKS.map((link, idx) => (
                            <Link key={idx} to={link.path} className="text-gray-600 hover:text-blue-400 transition-colors">
                                {link.title}
                            </Link>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};
