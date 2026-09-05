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
    
    // ページごとのタイトル・説明文・公開日・更新日の完全マッピング (AIO/GEO/SEO完全適合)
    const pageMetaMap: Record<string, { title: string; desc: string; published: string; modified: string }> = {
        '/analysis/crime-news/': {
            title: '最新 外国人犯罪報道ニュース速報・データベース',
            desc: '全国の地方紙・ローカルメディア等の報道を24時間自動集計した最新外国人犯罪速報データベース。',
            published: '2026-08-01T08:00:00+09:00',
            modified: '2026-08-17T18:00:00+09:00'
        },
        '/analysis/crime-statistics/': {
            title: '外国人犯罪統計の詳細分析：検挙率1.72倍の真実',
            desc: '警察庁統計および2025年参院内閣委員会答弁に基づく詳細分析。日本人検挙率0.188%に対し外国人0.323%という数値の統計的意味。',
            published: '2026-07-04T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/economic-impact/': {
            title: '経済への長期的影響：実質賃金停滞と労働生産性',
            desc: '外国人労働者の受け入れ拡大が日本国内の実質賃金や労働生産性に与える影響をマクロ経済データから検証。',
            published: '2026-07-05T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/borderless-welfare-state/': {
            title: '欧州の実証データ：福祉国家と移民の財政的影響',
            desc: 'オランダの匿名マイクロデータ研究に基づく、移民受け入れが福祉国家財政に与える純負担の実証分析。',
            published: '2026-07-06T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/simulation-model/': {
            title: '数理予測モデルによる将来推計と検証',
            desc: '人口動態および経済予測シミュレーションの数理モデルと日本固有の変数の解説。',
            published: '2026-07-07T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/national-security/': {
            title: '国家安全保障への直接的影響と地政学リスク',
            desc: '国境管理の緩和や重要インフラ周辺の環境変化が日本の安全保障に及ぼす影響の検証。',
            published: '2026-07-08T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/land-acquisition/': {
            title: '国土・重要インフラ・水源地の買収実態',
            desc: '外国人・外国資本による日本の水源地、森林、自衛隊基地周辺等の土地買収の実態と法規制。',
            published: '2026-07-09T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/uk-immigration-lesson/': {
            title: '英国の教訓：なし崩し的労働力導入がもたらした結末',
            desc: '英国における移民政策の推移と社会的分断、ブレグジットに至るまでの経緯から日本が学ぶべき教訓。',
            published: '2026-07-10T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/labor-dilemma/': {
            title: '働き方改革と雇用の矛盾：安価な労働力依存の罠',
            desc: '外国人労働力への依存が国内企業のイノベーションと省力化投資（DX/ロボティクス）を阻害する構造。',
            published: '2026-07-11T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/symbiosis/': {
            title: '地域社会における共生と摩擦の実態レポート',
            desc: '愛知県西尾市「県営緑町住宅」などの現場取材に基づく、言語・文化・ルール摩擦の現実。',
            published: '2026-07-12T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/nigeria-case/': {
            title: '多文化主義の限界：ナイジェリアの事例研究',
            desc: '異なる民族・宗教の統合難航と治安悪化の事例から学ぶ多文化共生政策の課題。',
            published: '2026-07-13T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/naturalization-paradox/': {
            title: '帰化制度のパラドックス：国籍法の課題と安全保障',
            desc: '日本の帰化許可基準と国籍取得手続きにおける審査制度の課題とリスク検証。',
            published: '2026-07-14T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/burial-controversy/': {
            title: '土葬問題と宗教・文化的共生摩擦',
            desc: 'イスラム教徒等の土葬墓地新設を巡る地域住民との対立と環境・法制度の課題。',
            published: '2026-07-15T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/social-security/': {
            title: '社会保障制度の持続可能性と財政負担',
            desc: '国民健康保険・年金・生活保護における外国人受給実態と国民負担の検証。',
            published: '2026-07-16T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/labor-mismatch/': {
            title: '外国人労働力と雇用のミスマッチ分析',
            desc: '人手不足職種と受け入れ分野の乖離、技能実習・特定技能制度の実態。',
            published: '2026-07-17T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/strategic-recommendations/': {
            title: '戦略的提言：日本社会の持続可能性を守るロードマップ',
            desc: '悪循環を断ち切り、自立経済とロボティクスDXへ進むための3つの大提言。',
            published: '2026-07-18T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/policy-recommendations/': {
            title: '政策提言：人口減少時代の国家ビジョン',
            desc: '国民経済の自立と生産性向上を実現するための具体的政策提言。',
            published: '2026-07-19T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
        '/analysis/conclusion/': {
            title: '結論と今後の展望：日本の選択が決定づける未来',
            desc: '外国人労働者受け入れ政策の包括的総括と日本社会が下すべき決断。',
            published: '2026-07-20T08:00:00+09:00',
            modified: '2026-08-15T12:00:00+09:00'
        },
    };

    const currentPath = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
    const pageMeta = pageMetaMap[currentPath] || {
        title: '日本の岐路 分析レポート',
        desc: '公的データに基づく移民政策の影響分析レポート。',
        published: '2026-07-01T08:00:00+09:00',
        modified: '2026-08-15T12:00:00+09:00'
    };

    const jsonLd = isHomePage
        ? {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": "日本の岐路：外国人労働者受け入れ政策の構造的課題と国民経済への影響",
              "description": "外国人労働者受け入れ政策が日本の経済、社会、治安、安全保障に与える長期的影響を、公的統計データに基づき包括的に検証。",
              "url": siteUrl,
              "image": "https://endearing-blini-b688ce.netlify.app/ogp-image-2.jpg",
              "author": {
                  "@type": "Person",
                  "name": "Akuma Shogun",
                  "jobTitle": "独立系社会・経済データビジュアライザー",
                  "sameAs": [
                      "https://note.com/ideal_kudu9256",
                      "https://x.com/"
                  ]
              },
              "datePublished": "2026-07-01T08:00:00+09:00",
              "dateModified": "2026-08-17T18:00:00+09:00",
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
              "@graph": [
                  {
                      "@type": "TechArticle",
                      "@id": `${canonicalUrl}#article`,
                      "isPartOf": {
                          "@type": "WebSite",
                          "name": "日本の岐路",
                          "url": siteUrl
                      },
                      "headline": pageMeta.title,
                      "description": pageMeta.desc,
                      "image": [
                          "https://endearing-blini-b688ce.netlify.app/ogp-image-2.jpg"
                      ],
                      "url": canonicalUrl,
                      "mainEntityOfPage": {
                          "@type": "WebPage",
                          "@id": canonicalUrl
                      },
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
                              "url": "https://endearing-blini-b688ce.netlify.app/ogp-image-2.jpg"
                          }
                      },
                      "datePublished": pageMeta.published,
                      "dateModified": pageMeta.modified
                  },
                  {
                      "@type": "BreadcrumbList",
                      "@id": `${canonicalUrl}#breadcrumb`,
                      "itemListElement": [
                          {
                              "@type": "ListItem",
                              "position": 1,
                              "name": "ホーム",
                              "item": siteUrl
                          },
                          {
                              "@type": "ListItem",
                              "position": 2,
                              "name": pageMeta.title,
                              "item": canonicalUrl
                          }
                      ]
                  }
              ]
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
            <footer id="seo-crawler-nav" className="mt-20 py-10 border-t border-white/5 opacity-40 hover:opacity-100 transition-opacity duration-500">
                <div className="max-w-7xl mx-auto px-4 text-[10px] leading-relaxed">
                    <p className="text-gray-400 mb-4 font-bold uppercase tracking-widest text-center">Crawler Navigation Map</p>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                        {CRAWLER_NAV_LINKS.map((link, idx) => (
                            <Link key={idx} to={link.path} className="text-gray-400 hover:text-blue-400 transition-colors">
                                {link.title}
                            </Link>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};
