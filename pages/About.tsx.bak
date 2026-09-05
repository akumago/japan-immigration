import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

export const About: React.FC = () => {
    return (
        <>
            <Helmet>
                <title>日本社会構造分析リサーチについて | 日本の岐路</title>
                <meta
                    name="description"
                    content="日本社会構造分析リサーチ（JSSAR）の目的、客観的調査方法、および反差別・中立性ポリシーについて。"
                />
                <meta property="og:title" content="日本社会構造分析リサーチについて | 日本の岐路" />
                <meta property="og:description" content="JSSARの目的、客観的調査方法、および反差別・中立性ポリシーについての公式ステートメント。" />
                <meta property="og:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
                <meta property="og:url" content="https://endearing-blini-b688ce.netlify.app/about/" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="JSSARについて | 日本の岐路" />
                <meta name="twitter:description" content="いかに摩擦とヘイトを減らすか。JSSARの設立趣旨と反差別・中立性ポリシー。" />
                <meta name="twitter:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
            </Helmet>

            <div className="min-h-screen bg-[#0d1117] pt-24 pb-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Header */}
                        <div className="mb-12">
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                                当リサーチプロジェクトについて
                            </h1>
                            <p className="text-gray-400 text-lg">
                                日本社会構造分析リサーチ (Japan Social Structure Analysis Research Group)
                            </p>
                        </div>

                        {/* Content */}
                        <div className="space-y-8">
                            <Section title="設立趣旨：いかに摩擦とヘイトを減らすか">
                                <p>
                                    当プロジェクトの根底にあるのは、**「いかにして社会における差別、ヘイト、そして犯罪を減らすか」**という切実な問いです。
                                </p>
                                <p className="mt-4">
                                    一つ屋根の下に暮らす家族でさえ、距離が近すぎれば軋轢を生みます。しかし、互いに適切な生活圏（棲み分け）を持つことで、無用な衝突を避け、良好な関係を築くことができます。国家や文化も同様です。
                                </p>
                                <p className="mt-4 italic text-blue-400 border-l-2 border-blue-500 pl-4">
                                    「強制的な混在が招く憎しみの連鎖を止め、棲み分けによる地球規模の平和を実現すること」
                                </p>
                                <p className="mt-4">
                                    これが我々の研究目的です。公的データに基づいた現状分析は、決して誰かを攻撃するためのものではなく、むしろ互いのアイデンティティを守り、平和を最小化するための「知恵」としての提言です。
                                </p>
                            </Section>

                            <Section title="反差別・中立性ポリシー">
                                <p className="font-semibold text-gray-100">
                                    当プロジェクトは、あらゆる人種、国籍、民族、信条に基づいた差別、偏見、およびヘイトスピーチを断固として拒否します。
                                </p>
                                <p className="mt-4 text-sm leading-relaxed">
                                    我々の分析は、あくまで「社会構造」と「国家政策」を対象としたものであり、個々の人間としての尊厳を傷つける意図は一切ありません。公表されている検挙率や経済統計の提示は、法治国家としての秩序維持と、国民の権利保護という公共の利益を目的としています。
                                </p>
                            </Section>

                            <Section title="調査方法と厳格なデータソース">
                                <p>本レポートは、以下の信頼性の高い情報源に基づいて作成されています：</p>
                                <div className="mt-6 space-y-4">
                                    <DataSource
                                        title="政府統計"
                                        items={[
                                            '警察庁「来日外国人犯罪の検挙状況」',
                                            '厚生労働省「外国人雇用状況の届出状況」',
                                            '法務省「在留外国人統計」',
                                            '総務省統計局「人口推計」',
                                        ]}
                                    />
                                    <DataSource
                                        title="国際機関"
                                        items={[
                                            '国連「International Migration Report」',
                                            'OECD「International Migration Outlook」',
                                            'ILO（国際労働機関）統計',
                                        ]}
                                    />
                                    <DataSource
                                        title="報道・学術研究"
                                        items={[
                                            '国内外の主要メディアの報道',
                                            '学術論文・研究レポート',
                                            '専門家の分析・意見',
                                        ]}
                                    />
                                </div>
                            </Section>

                            <Section title="編集方針">
                                <div className="space-y-4">
                                    <PolicyItem
                                        icon="📊"
                                        title="データに基づく分析"
                                        description="感情論ではなく、公的統計や具体的な事例に基づいた客観的な分析を心がけています。"
                                    />
                                    <PolicyItem
                                        icon="🔍"
                                        title="多角的な視点"
                                        description="経済、社会、安全保障など、多岐にわたる影響を包括的に検証しています。"
                                    />
                                    <PolicyItem
                                        icon="📝"
                                        title="事実の正確性"
                                        description="情報の正確性を最優先とし、出典を明記することで検証可能性を確保しています。"
                                    />
                                    <PolicyItem
                                        icon="🔄"
                                        title="継続的な更新"
                                        description="新たなデータや事例が明らかになった際は、適宜内容を更新・追加しています。"
                                    />
                                </div>
                            </Section>

                            <Section title="免責事項">
                                <p>
                                    本レポートに掲載されている情報は、作成時点で入手可能な資料に基づいています。
                                    情報の正確性には万全を期していますが、完全性を保証するものではありません。
                                </p>
                                <p className="mt-4">
                                    本レポートの内容を利用した結果について、当サイトは一切の責任を負いません。
                                    重要な判断を行う際は、必ず一次情報や専門家の意見も参照してください。
                                </p>
                            </Section>

                            <Section title="訂正・更新履歴">
                                <div className="space-y-3">
                                    <UpdateLog date="2025年12月31日" content="最新の国会審議データ（1.72倍）を反映、サイト構造の最適化" />
                                    <UpdateLog date="2025年11月" content="最新の統計データに基づき各セクションを更新" />
                                    <UpdateLog date="2024年12月" content="リサーチプロジェクトとしてのサイト開設" />
                                </div>
                            </Section>

                            <Section title="お問い合わせ">
                                <p>
                                    本レポートに関するご質問、ご意見、訂正のご依頼などは、
                                    <a href="/contact/" className="text-blue-400 hover:text-blue-300 underline mx-1">
                                        お問い合わせページ
                                    </a>
                                    よりご連絡ください。
                                </p>
                                <p className="mt-4">
                                    サイト運営者については
                                    <a href="/operator-info/" className="text-blue-400 hover:text-blue-300 underline mx-1">
                                        運営者情報ページ
                                    </a>
                                    をご確認ください。
                                </p>
                                <p className="mt-4">
                                    建設的なご意見やデータの訂正依頼は歓迎いたします。
                                    ただし、誹謗中傷や根拠のない批判にはお答えできかねますので、ご了承ください。
                                </p>
                            </Section>

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

                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    return (
        <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10 p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
                {title}
            </h2>
            <div className="text-gray-300 leading-relaxed">{children}</div>
        </div>
    );
};

const DataSource: React.FC<{ title: string; items: string[] }> = ({ title, items }) => {
    return (
        <div className="bg-[#0d1117] rounded-lg border border-white/5 p-4">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                {title}
            </h4>
            <ul className="space-y-2">
                {items.map((item, index) => (
                    <li key={index} className="text-gray-400 text-sm flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const PolicyItem: React.FC<{ icon: string; title: string; description: string }> = ({
    icon,
    title,
    description,
}) => {
    return (
        <div className="flex gap-4 p-4 bg-[#0d1117] rounded-lg border border-white/5">
            <div className="text-3xl">{icon}</div>
            <div>
                <h4 className="text-white font-semibold mb-1">{title}</h4>
                <p className="text-gray-400 text-sm">{description}</p>
            </div>
        </div>
    );
};

const UpdateLog: React.FC<{ date: string; content: string }> = ({ date, content }) => {
    return (
        <div className="flex items-start gap-3 p-3 bg-[#0d1117] rounded-lg border border-white/5">
            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
            <div>
                <div className="text-purple-400 text-sm font-medium">{date}</div>
                <div className="text-gray-400 text-sm mt-1">{content}</div>
            </div>
        </div>
    );
};

