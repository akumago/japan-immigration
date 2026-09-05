import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

export const References: React.FC = () => {
    const references = [
        {
            category: '政府統計・公的機関',
            items: [
                {
                    title: '警察庁「令和5年における組織犯罪の情勢【確定値版】」',
                    url: 'https://www.npa.go.jp/sosikihanzai/kokusaisousa/kokusai/R5_rainichi.pdf',
                    description: '来日外国人による犯罪の検挙状況、罪種別・国籍別の詳細データが記載されている。',
                },
                {
                    title: '厚生労働省「外国人雇用状況の届出状況」',
                    url: 'https://www.mhlw.go.jp/stf/newpage_30367.html',
                    description: '外国人労働者数、在留資格別・国籍別の雇用状況',
                },
                {
                    title: '法務省「在留外国人統計」',
                    url: 'https://www.moj.go.jp/isa/policies/statistics/toukei_ichiran_touroku.html',
                    description: '在留外国人の数、在留資格別・国籍別の統計',
                },
                {
                    title: '総務省統計局「人口推計」',
                    url: 'https://www.stat.go.jp/data/jinsui/index.html',
                    description: '日本の人口動態、年齢別・地域別人口統計',
                },
            ],
        },
        {
            category: '国際機関',
            items: [
                {
                    title: 'United Nations "International Migration Report 2023"',
                    url: 'https://www.un.org/development/desa/pd/content/international-migration',
                    description: '世界の移民動向、国別の移民比率と経済成長率のデータ',
                },
                {
                    title: 'OECD "International Migration Outlook"',
                    url: 'https://www.oecd.org/migration/international-migration-outlook-1999124x.htm',
                    description: 'OECD諸国の移民政策と労働市場への影響分析',
                },
                {
                    title: 'ILO（国際労働機関）統計',
                    url: 'https://www.ilo.org/global/statistics-and-databases/lang--en/index.htm',
                    description: '国際的な労働統計、移民労働者に関するデータ',
                },
            ],
        },
        {
            category: '学術研究・専門機関',
            items: [
                {
                    title: '法務省「令和6年版 犯罪白書」',
                    url: 'https://www.moj.go.jp/housouken/housouken_housouken03.html',
                    description: '日本の犯罪情勢全般に関する年次報告書。来日外国人犯罪についても言及。',
                },
                {
                    title: '国立社会保障・人口問題研究所「人口統計資料集」',
                    url: 'https://www.ipss.go.jp/syoushika/tohkei/Popular/Popular.asp',
                    description: '日本の人口動態、将来推計に関する詳細データ',
                },
            ],
        },
    ];

    return (
        <>
            <Helmet>
                <title>参考文献・データソース | 日本の岐路</title>
                <meta
                    name="description"
                    content="本レポートで使用した統計データ、学術研究、報道記事などの参考文献一覧"
                />
                <meta property="og:title" content="参考文献・データソース | 日本の岐路" />
                <meta property="og:description" content="警察庁、法務省、国連など、本サイトが依拠する信頼性の高い情報源一覧。" />
                <meta property="og:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
                <meta property="og:url" content="https://endearing-blini-b688ce.netlify.app/references/" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="データの透明性：依拠した典拠一覧 | 日本の岐路" />
                <meta name="twitter:description" content="一次統計資料を重視するJSSARのデータソースを公開。信頼性を担保します。" />
                <meta name="twitter:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
            </Helmet>

            <div className="min-h-screen bg-[#0d1117] pt-24 pb-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Header */}
                        <div className="mb-12">
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                参考文献・データソース
                            </h1>
                            <p className="text-gray-400 text-lg">
                                本レポートで使用した統計データ、学術研究、報道記事などの情報源
                            </p>
                        </div>

                        {/* Notice */}
                        <div className="mb-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                            <div className="flex items-start gap-3">
                                <svg
                                    className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <div>
                                    <h3 className="text-white font-semibold mb-2">データの信頼性について</h3>
                                    <p className="text-gray-300 text-sm">
                                        本レポートは、政府統計や国際機関のデータなど、信頼性の高い情報源に基づいて作成されています。
                                        各データの詳細や最新情報については、各リンク先をご確認ください。
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* References by Category */}
                        <div className="space-y-8">
                            {references.map((category, categoryIndex) => (
                                <motion.div
                                    key={categoryIndex}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
                                >
                                    <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10 p-6 md:p-8">
                                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
                                            {category.category}
                                        </h2>

                                        <div className="space-y-4">
                                            {category.items.map((item, itemIndex) => (
                                                <div
                                                    key={itemIndex}
                                                    className="p-5 bg-[#0d1117] rounded-lg border border-white/5 hover:border-white/10 transition-all duration-300 group"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <h3 className="text-white font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                                                                {item.title}
                                                            </h3>
                                                            <p className="text-gray-400 text-sm mb-3">{item.description}</p>
                                                            {item.url !== '#' && (
                                                                <a
                                                                    href={item.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                                                                >
                                                                    <svg
                                                                        className="w-4 h-4"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth={2}
                                                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                                        />
                                                                    </svg>
                                                                    リンクを開く
                                                                </a>
                                                            )}
                                                        </div>
                                                        <div className="flex-shrink-0">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                                                                <svg
                                                                    className="w-5 h-5 text-blue-400"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                    />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Additional Notes */}
                        <div className="mt-12 p-6 bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                    />
                                </svg>
                                引用について
                            </h3>
                            <div className="text-gray-300 space-y-3">
                                <p>
                                    本レポートの内容を引用される場合は、出典として当サイト名とURLを明記してください。
                                </p>
                                <p className="text-sm text-gray-400">
                                    例：「日本の岐路：外国人移民がもたらす」
                                    （当サイトURL）
                                </p>
                                <p className="text-sm text-gray-400">
                                    ※ 学術研究や報道での引用は歓迎いたします。ただし、内容の改変や誤解を招く引用はご遠慮ください。
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

