import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

interface NoteArticle {
    title: string;
    link: string;
    pubDate: string;
    description: string;
    category?: string;
    thumbnail?: string;
}

const FALLBACK_NOTE_ARTICLES: NoteArticle[] = [
    {
        title: "日本衰退の真実：古代ローマ崩壊の歴史が暴く外国人依存の致命的罠",
        link: "https://note.com/ideal_kudu9256/n/n0f4ba8a12ee0",
        pubDate: "2026年7月14日",
        description: "古代ローマが外国人への労働・防衛依存によって内側から自壊していった史実を、現代日本の移民政策と対比しながら冷静に解説する警告の論考。",
        category: "HISTORY & IMMIGRATION",
        thumbnail: "https://assets.st-note.com/production/uploads/images/291646571/rectangle_large_type_2_d66ab7ec247d208da0b75d544d542ff2.png?width=800"
    },
    {
        title: "財務省の嘘を暴く！なぜ日本の給料は世界の「3分の1」に叩き売られ、路上に若い女性が立つ貧困国に転落したのか？",
        link: "https://note.com/ideal_kudu9256/n/ned56f487f97b",
        pubDate: "2026年7月13日",
        description: "真面目に働きながら手取りの少なさに絶望する現役世代に向け、給料暴落と貧困化をもたらす財務省の増税緊縮路線の実態を暴きます。",
        category: "TAX & ECONOMY",
        thumbnail: "https://assets.st-note.com/production/uploads/images/291297666/rectangle_large_type_2_af0d0e5e562d31ae44454804e5a458b9.png?width=800"
    },
    {
        title: "自民党と維新が進める「議員定数削減」の嘘。国民を騙す独裁体制の正体を暴く",
        link: "https://note.com/ideal_kudu9256/n/n9a6b58e4b1b3",
        pubDate: "2026年7月12日",
        description: "国政選挙で投票先に悩み、マスコミの報道に違和感を抱いているすべての有権者に向け、「身を切る改革」という心地よいスローガンの欺瞞を検証。",
        category: "POLITICS & REFORM"
    }
];

export const OperatorInfo: React.FC = () => {
    const [noteArticles, setNoteArticles] = useState<NoteArticle[]>(FALLBACK_NOTE_ARTICLES);

    useEffect(() => {
        const fetchNoteArticles = async () => {
            try {
                const response = await fetch('/note-articles.json');
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    setNoteArticles(data.slice(0, 3));
                }
            } catch (error) {
                console.error("Failed to fetch local note articles JSON:", error);
            }
        };

        fetchNoteArticles();
    }, []);

    return (
        <>
            <Helmet>
                <title>運営者情報・このサイトについて | 日本の岐路</title>
                <meta
                    name="description"
                    content="独立系経済アナリスト Akuma Shogun による、外国人移民政策と日本社会の構造的課題に関する分析プロジェクト。"
                />
                <meta property="og:title" content="運営者情報・このサイトについて | 日本の岐路" />
                <meta property="og:description" content="独立系経済アナリスト Akuma Shogun による、外国人移民政策と日本社会の構造的課題分析プロジェクト。" />
                <meta property="og:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
                <meta property="og:url" content="https://endearing-blini-b688ce.netlify.app/operator-info/" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="運営者情報：分析の理念 | 日本の岐路" />
                <meta name="twitter:description" content="公的統計データに基づき、日本の未来を可視化。独立系経済アナリストによる分析プロジェクト。" />
                <meta name="twitter:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
            </Helmet>

            <div className="bg-[#0d1117] min-h-screen text-gray-300 font-sans py-24 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Page Header */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-16 border-b border-white/10 pb-8 text-center"
                    >
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-blue-400 mb-4 tracking-tight">運営者情報・このサイトについて</h1>
                        <p className="text-gray-400 text-sm md:text-base tracking-widest uppercase">Operator Profile & Site Philosophy</p>
                    </motion.div>

                    {/* Profile Section */}
                    <motion.section 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mb-20"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <span className="text-4xl">📊</span>
                            <h2 className="text-2xl font-bold text-gray-100">運営者プロフィール</h2>
                        </div>
                        
                        <div className="bg-[#161b22] border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                            
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold text-blue-400 mb-1">Akuma Shogun</h3>
                                <p className="text-blue-500/80 text-sm font-medium mb-6 uppercase tracking-widest">独立系経済アナリスト・データビジュアライザー</p>
                                
                                <div className="space-y-6 text-gray-300 leading-relaxed">
                                    <p>
                                        日本の財政・金融政策および国民生活への影響を、公的統計データに基づいて独自に分析・可視化する個人研究者。「失われた30年」という言葉で曖昧に語られてきた経済停滞の構造を、誰もが理解できるデータビジュアライゼーションとして表現することを活動の中心に置いている。
                                    </p>
                                    <p>
                                        投資・資産運用の実務経験を通じて日本のマクロ経済に関心を深める中で、2020年代に入り「人手不足」の解決策として急速に進められる外国人移民政策が、日本の実質賃金、治安、および社会保障制度の根幹を揺るがしている現状を危惧。本サイトは、多角的かつ客観的なデータを用いてその構造的背景を体系化したものである。
                                    </p>
                                </div>

                                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                                        <p className="flex items-start gap-3 text-sm">
                                            <span className="text-blue-500 mt-1">▸</span>
                                            <span>国連・OECDおよび各国の出入国管理統計を用いた国際比較分析</span>
                                        </p>
                                    </div>
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                                        <p className="flex items-start gap-3 text-sm">
                                            <span className="text-blue-500 mt-1">▸</span>
                                            <span>警察庁・法務省・厚生労働省の一次統計資料の直接参照・検証</span>
                                        </p>
                                    </div>
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                                        <p className="flex items-start gap-3 text-sm">
                                            <span className="text-blue-500 mt-1">▸</span>
                                            <span>労働経済学、公共選択論、国家安全保障理論の多角的応用</span>
                                        </p>
                                    </div>
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                                        <p className="flex items-start gap-3 text-sm">
                                            <span className="text-blue-500 mt-1">▸</span>
                                            <span>SVG・Framer Motionを活用した高度なデータ可視化技術の自主開発</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* Philosophy Section */}
                    <motion.section 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="space-y-8"
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-4xl">🏛️</span>
                            <h2 className="text-2xl font-bold text-gray-100">このサイトの理念</h2>
                        </div>
                        
                        <div className="prose prose-invert max-w-none space-y-6 text-gray-300 leading-relaxed">
                            <p className="text-lg text-gray-100 font-medium italic border-l-4 border-blue-500 pl-6 py-2 bg-blue-500/5 rounded-r-lg">
                                「なぜ日本は、賃金が上がらない構造を放置したまま、安価な労働力という『毒薬』に依存し続けようとしているのか。」
                            </p>
                            <p>
                                この問いに対し、政府・メディアが提示する「人手不足だから外国人を受け入れる」という説明は、極めて断片的かつ表面的なものにすぎません。本来、人手不足は市場原理に基づき「賃金上昇」と「技術革新」をもたらす好機であるはずですが、安易な外国人労働力の供給はこの健全なサイクルを破壊し、日本を「低賃金国家」へと固定化させています。
                            </p>
                            <p>
                                本サイトは、警察庁の犯罪統計、出入国在留管理庁のデータ、厚生労働省の労働統計などの一次統計を直接参照し、単なる感情論や差別意識ではなく、現代マクロ経済学と社会構造分析の知見に照らすことで、**「国家としての持続可能性」と「国民の安全・安心」**を客観的データとして可視化することを目的としています。
                            </p>
                            <p>
                                一人でも多くの市民が、なし崩し的な移民政策が日本の将来（治安、社会保障、文化的アイデンティティ）に与える累積的なリスクを正しく理解し、この国の形を決める建設的な政策議論に参加できる社会を目指して、本サイトは継続的に更新・拡充を続けてまいります。
                            </p>
                        </div>
                    </motion.section>

                    {/* 被リンク・SNS活動チャネル */}
                    <motion.section 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mb-20"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <span className="text-4xl">🔗</span>
                            <h2 className="text-2xl font-bold text-gray-100">外部メディア・活動チャンネル</h2>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* X (Twitter) */}
                            <div className="bg-[#161b22] border border-white/10 rounded-2xl p-8 relative overflow-hidden shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                    公式X (旧Twitter)
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                    一次統計データに基づいたグラフの速報値や、最新の分析状況をポストしています。ユーザーとの意見交換や最新トレンドの発信を行っています。
                                </p>
                                <a 
                                    href="https://x.com/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm font-bold text-blue-400 hover:text-blue-300 group"
                                >
                                    @Akuma_Shogun をフォローする
                                    <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                                </a>
                            </div>

                            {/* note */}
                            <div className="bg-[#161b22] border border-white/10 rounded-2xl p-8 relative overflow-hidden shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                    📝 公式noteコラム
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                    手取り額の推移、デフレ下での増税の検証など、サイト内には収まりきらない読み物形式の経済・財政コラムを随時発信しています。
                                </p>
                                <a 
                                    href="https://note.com/ideal_kudu9256" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm font-bold text-purple-400 hover:text-purple-300 group"
                                >
                                    note クリエイターページへ
                                    <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                                </a>
                            </div>
                        </div>
                    </motion.section>

                    {/* note最新コラム（リアルタイム動的取得） */}
                    <motion.section 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mb-20"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <span className="text-4xl">📝</span>
                            <h2 className="text-2xl font-bold text-gray-100">公式noteコラム：最新の論考</h2>
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-6">
                            {noteArticles.map((article, idx) => (
                                <a 
                                    key={idx}
                                    href={article.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="group bg-[#161b22] border border-white/10 rounded-2xl hover:border-purple-500/50 hover:bg-[#1c2128] transition-all flex flex-col h-full shadow-lg overflow-hidden"
                                >
                                    {article.thumbnail && (
                                        <div className="w-full aspect-[1280/670] overflow-hidden relative border-b border-white/10 bg-[#0d1117]">
                                            <img 
                                                src={article.thumbnail} 
                                                alt={article.title} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                            />
                                        </div>
                                    )}
                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="text-purple-400 font-mono text-[10px] font-bold mb-3 tracking-widest uppercase">
                                            {article.category || 'NOTE COLUMN'}
                                        </div>
                                        <h3 className="text-base font-bold text-gray-200 group-hover:text-white mb-3 leading-snug">
                                            {article.title}
                                        </h3>
                                        <p className="text-gray-400 text-xs leading-relaxed mb-6 flex-grow">
                                            {article.description}
                                        </p>
                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                            <span className="text-[10px] text-gray-400 font-medium">{article.pubDate}</span>
                                            <span className="text-[11px] font-bold text-purple-400 group-hover:text-purple-300 flex items-center">
                                                コラムを読む →
                                            </span>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </motion.section>

                    {/* 追記部分: サイト理念・情報方針ブロック (約1000文字) */}
                    <div className="mt-20 space-y-12 bg-gray-950/80 p-8 md:p-12 rounded-2xl border-t-4 border-gray-600 relative">
                        <div className="prose prose-invert prose-lg max-w-none relative z-10">
                            <h2 className="text-3xl font-black text-gray-200 mb-10 text-center tracking-widest">
                                [MISSION & PHILOSOPHY] 情報発信における基本理念
                            </h2>
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-300 mb-4 border-l-2 border-gray-500 pl-3">
                                        知る権利の回復と「タブーなき客観的論議」の場の創出
                                    </h3>
                                    <p className="leading-relaxed text-gray-400">
                                        当サイト（日本社会構造分析リサーチ：JSSAR）が社会に提供しようとしている最大の価値は、「誰もが知るべき事実でありながら、政治的・社会的なタブーによって覆い隠されてきた不都合なデータ」を、極めて透明性の高い形で国民に開示することにあります。移民政策、外国人犯罪、そして社会保障のフリーライド問題は、本来であれば主権者たる国民が最も深い議論を交わすべき「国家の生死を分かつテーマ」です。しかし現状では、「差別主義的である」「多様性に反する」といったレッテル貼りによって、一次統計データに基づく健全な議論すら封殺される異常な事態が続いています。私たちはこの言論空間の歪みを是正し、感情論やイデオロギーを排した「冷徹な知性によるファクトの共有」を通じて、民主主義の基礎である「知る権利」を回復することを使命としています。
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-300 mb-4 border-l-2 border-gray-500 pl-3">
                                        データドリブンな意思決定：主権者としての防衛策
                                    </h3>
                                    <p className="leading-relaxed text-gray-400">
                                        「数字は嘘をつかない」と言われますが、巨大メディアや行政機関はしばしば「数字の出し方」を操作することで真実を希釈します。全体平均の背後に隠された「特定の国籍による異常な犯罪発生率」や「実質賃金の下押し圧力」など、私たちが深掘りするマクロデータは、日本社会が現在直面している構造的危機の解像度を劇的に高めるものです。当プロジェクトは、これらの一次資料（警察庁、法務省、厚労省等の公式統計）にアクセスし、専門知識を持たない一般市民であっても直感的に被害とリスクを認識できるよう、高度なデータビジュアライゼーション技術を用いて情報を構造化しています。これは単なる啓蒙活動ではなく、日本国憲法が保障する「平和的生存権」と「財産権」を、国民一人ひとりが自力で防衛するための「理論的武装（インテリジェンスの提供）」に他なりません。私たちは今後も、一切の政治的圧力や同調圧力に屈することなく、圧倒的なファクトの壁を築き続けることをお約束します。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* 追記部分終了 */}

                    {/* Contact (Optional but keeps it professional) */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mt-20 pt-10 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6"
                    >
                        <div className="text-sm text-gray-400">
                            © 2024 Akuma Shogun | 日本社会構造分析リサーチ
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-400 uppercase tracking-widest">Contact:</span>
                            <a href="mailto:suteakann@gmail.com" className="text-blue-400 hover:underline font-mono text-sm">suteakann@gmail.com</a>
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

