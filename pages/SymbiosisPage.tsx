import React from "react";
import { Helmet } from 'react-helmet-async';
import { Header } from "../components/Header";
import SymbiosisSection from "../components/SymbiosisSection";
import { MainLayout } from "../components/MainLayout";
import { SocialShare } from "../components/SocialShare";
import { RelatedArticles } from "../components/RelatedArticles";

export const SymbiosisPage: React.FC = () => {
    return (
        <MainLayout>
            <Helmet>
                <title>西尾市緑町住宅の現状：多文化共生の真実 | 日本の岐路</title>
                <meta
                    name="description"
                    content="県営住宅に集住する外国人コミュニティの現実をデータと事例から分析。「多文化共生」の理想と、地域住民に押し付けられる統治コスト・摩擦のギャップを解説します。"
                />
                <meta property="og:title" content="愛知県西尾市「県営緑町住宅」の現状と多文化共生の課題" />
                <meta property="og:description" content="外国人集住が地域社会にもたらす真の負担とは。現場の事例と統計から検証する多文化共生の構造的課題。" />
                <meta property="og:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
                <meta property="og:url" content="https://endearing-blini-b688ce.netlify.app/analysis/symbiosis/" />
                <meta property="og:type" content="article" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="「県営緑町住宅」に見る多文化共生の真実 | 日本の岐路" />
                <meta name="twitter:description" content="外国人労働者の受け入れが地域にもたらした急激な変化と、摩擦の現場から見える「日本の未来」。" />
                <meta name="twitter:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
            </Helmet>

            <Header title="「多文化共生」の限界と地域社会の現実" description="愛知県西尾市「県営緑町住宅」の事例に見る、実質的な移民流入がもたらす統治コストの増大と不都合な真実" />

            {/* 上部グラフィックは画面を広く使って美しく表示し（max-w-7xl）、下部のテキストは読みやすさ重視の幅（max-w-4xl）とする美しいレイアウトへ修正 */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden rounded-b-xl border-b border-white/10 relative symbiosis-override">
                <SymbiosisSection />
            </div>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                
                <div className="mt-12 mb-12">
                    <h3 className="text-xl font-bold text-white mb-6">この記事を共有する</h3>
                    <SocialShare />
                </div>

                {/* 独立ページ用の2000文字規模の深層分析テキスト（DEEP ANALYSIS） */}
                <div className="mt-20 space-y-12 bg-gray-950/80 p-8 md:p-12 rounded-2xl border-t-4 border-blue-600 shadow-[0_0_50px_rgba(37,99,235,0.1)] relative">
                    <div className="prose prose-invert prose-lg max-w-none relative z-10">
                        <h2 className="text-3xl font-black text-white mb-10 text-center tracking-widest">
                            [DEEP ANALYSIS] 幻の「多文化共生」：地域社会への負担転嫁と崩壊の現場
                        </h2>
                        
                        <div className="grid md:grid-cols-2 gap-12">
                            <div>
                                <h3 className="text-xl font-bold text-blue-400 mb-4 border-l-2 border-blue-500 pl-3">
                                    【法改正の代償】統計が語る真実と1990年の起点
                                </h3>
                                <p className="leading-relaxed text-gray-300">
                                    愛知県西尾市の「県営緑町住宅」の現状は、決して特殊な一事例ではない。これは、日本全体が今後直面する「多文化共生」の必然的な帰結である。グラフが明確に示しているように、日本の地域コミュニティが変容する決定的な変曲点は1990年の入管法改正にあった。「日系人」という血統を口実にした事実上の単純労働者・デカセギの受け入れ拡大は、経済界の要請を背景に行われた。2001年のスパイク現象（13.5%への急伸）に見られるように、特定地域での集中居住が始まり、一時はリーマンショック等で微減するも、近年再び上昇局面に転じている。経済界が「安価な労働力」を求め続ける限り、この波は収まることなく、むしろ日本独自の高信頼社会という見えない基盤を確実に浸食していくのである。
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-blue-400 mb-4 border-l-2 border-blue-500 pl-3">
                                    【共生のシステム疲労】言葉の壁を超えた「規範の隔たり」
                                </h3>
                                <p className="leading-relaxed text-gray-300">
                                    総会における自治会長の苦労や通訳を介した対話の不成立は、「言葉の壁」という表面的な問題にとどまらない。より深いところに横たわっているのは、日本特有の「公共への責任」と「暗黙の了解」という文化規範と、移民コミュニティの間に存在する決定的な隔たりである。共益費や駐車場代の負担という、日本では当然とされる「共同体の維持コスト」さえも、罰金という強制力をもってしか徴収できない現実は痛ましく、かつ象徴的である。「日本の習慣を覚えてください」という三河弁の切実な訴えは、異なる文化を無秩序に混ぜ合わせようとする「多文化共生政策」そのものの破綻を示している。自治の維持が崩壊すれば、それは必ず治安の悪化や地域全体の資産価値の低下として数字に現れることになる。
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-blue-400 mb-4 border-l-2 border-blue-500 pl-3">
                                    【偽りの経済コスト】限界の自治と「ツケ」の払い手
                                </h3>
                                <p className="leading-relaxed text-gray-300">
                                    利益相反の最も醜悪な図式がここにある。工場などで安い賃金で外国人を雇用し、直接的な果実を吸い上げているのは特定の企業や産業界である。しかし、彼らが生活する上での言語的サポート、ゴミ出しや騒音のトラブル対応、そして何よりも地域コミュニティの治安や維持管理のコスト（今回で言えば約70万円の滞納額等）は、すべて地方自治体や日本人住民に押し付けられている。これを経済学的に表現すれば「社会的コストの完全なる外部化」である。企業は適正な賃金を支払って日本人を雇い、社会に富を循環させるという本来の義務を放棄し、そのツケを末端の地域住民に支払わせている。「人手不足」ではなく「安い労働力の不足」に過ぎないという真実を、緑町住宅の悲鳴が証明している。
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-blue-400 mb-4 border-l-2 border-blue-500 pl-3">
                                    【共存のための抜本的再考】「棲み分け」に向けた社会的現実の直視
                                </h3>
                                <p className="leading-relaxed text-gray-300">
                                    本来、「共存」とは、無秩序に居住空間を混ぜ合わせることではない。異なる文化・歴史の重みを持つ者同士が、互いに自立した上で適度な距離を置き、不用意な干渉を避けること——すなわち「棲み分け」こそが平和を保つもっとも知的な手段である。現場で起こっている摩擦から目を背け、「差別だ」「多様性だ」と無責任なスローガンを唱えることは、かえって偏見とヘイトを助長する結果にしかならない。政府が推し進める『育成収労制度』に代表される実質的な移民拡大政策は、この緑町住宅のような無数の「ひずみ」を全国に拡散する自死行為に等しい。私たちに必要なのは、痛みを伴う適正賃金への移行と技術革新（DX）による抜本的な生産性の向上であり、もはや幻想となった多文化共生という綺麗事と決別する勇気である。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <RelatedArticles currentPath="/analysis/symbiosis" />

            </main>
        </MainLayout>
    );
};

