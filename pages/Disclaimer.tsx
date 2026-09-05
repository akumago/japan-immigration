import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { MainLayout } from "../components/MainLayout";

export const Disclaimer: React.FC = () => {
    return (
        <MainLayout>
            <Helmet>
                <title>免責事項 | 日本の岐路</title>
                <meta
                    name="description"
                    content="日本社会構造分析リサーチ（JSSAR）が公開する統計データ、分析レポートの利用規約、免責事項、および広告配信・Cookie収集に関する公式規定。"
                />
                <meta property="og:title" content="免責事項 | 日本の岐路" />
                <meta property="og:description" content="JSSARが公開する統計データ、分析レポートの利用規約、免責事項についての公式ステートメント。" />
                <meta property="og:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
                <meta property="og:url" content="https://endearing-blini-b688ce.netlify.app/disclaimer/" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="免責事項 | 日本の岐路" />
                <meta name="twitter:description" content="JSSARの免責事項および情報利用ポリシー。" />
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
                                免責事項
                            </h1>
                            <p className="text-gray-400 text-lg">
                                Disclaimer & Information Policy
                            </p>
                        </div>

                        {/* Content */}
                        <div className="space-y-8">
                            <Section title="1. 情報の正確性について">
                                <p>
                                    当サイト「日本の岐路」（日本社会構造分析リサーチ：JSSAR）に掲載されているコンテンツや情報については、可能な限り正確な一次統計データ（警察庁、法務省、厚生労働省、総務省等の公的資料、および国際機関の発表データ）に基づき作成・確認を行っております。
                                </p>
                                <p className="mt-4">
                                    しかしながら、公的統計の改訂や解釈の多様性、または技術的な誤りが生じる可能性を完全に排除することはできません。当サイトが提供する情報の正確性、信頼性、完全性、最新性、妥当性について、いかなる明示的・黙示的な保証も行うものではありません。掲載されているデータおよびシミュレーションモデルは、あくまで分析時点の仮説および推計に基づいた客観的論議のための参考情報です。
                                </p>
                            </Section>

                            <Section title="2. 損害等の責任について">
                                <p>
                                    ユーザーが当サイトに掲載された情報、分析結果、提言、あるいはリンク先の情報を利用したことによって生じた直接的、間接的、付随的、特別、結果的な一切の損害（経済的損失、治安状況の変化に伴うリスク、社会的信用の毀損、機会損失などを含むがこれらに限定されない）について、当サイトおよびその運営者は一切の責任を負いません。
                                </p>
                                <p className="mt-4">
                                    当サイトが提示する提言やデータに基づいて特定の判断・行動（政治的投票、地域移動、投資意思決定など）を行う場合は、ユーザー自身の自己責任において行うようお願い申し上げます。また、当サイトからリンクやバナーなどによって他のサイトに移動された場合、移動先サイトで提供される情報、サービス等について当サイトは一切の責任を負いません。
                                </p>
                            </Section>

                            <Section title="3. 著作権・知的財産権について">
                                <p>
                                    当サイトに掲載されている全てのコンテンツ（文章、グラフデータ、SVG図表、数理シミュレーションロジック、画像、ロゴなど）の著作権は、特記のない限り「日本の岐路」運営者または正当な権利者に帰属します。
                                </p>
                                <p className="mt-4">
                                    私的利用その他法律によって認められる範囲を超えて、これらのコンテンツを権利者の許可なく複製、転載、改変、配布、二次配布、商業利用等を行う行為は著作権法により禁止されています。特に、AI学習用のスクレイピング、または外部メディアへの無断転載・コピーコンテンツの作成が発覚した場合は、法的措置を含めた厳正な対処を行います。引用を行う際は、著作権法上の要件（適切な引用符の付与、主従関係の維持、および当サイトへのリンクを伴う出典の明記）を満たす必要があります。
                                </p>
                            </Section>

                            <Section title="4. 広告の配信について">
                                <p>
                                    当サイトでは、第三者配信による広告サービス（Google AdSense等）を利用する場合があります。広告配信事業者は、ユーザーの興味に応じた適切な広告（パーソナライズ広告）を表示するために、当サイトや他サイトへのアクセスに関する情報として「Cookie」を使用することがあります。
                                </p>
                                <p className="mt-4">
                                    Cookieには氏名、住所、メールアドレス、電話番号などの個人を特定できる情報は含まれません。Cookieを利用したパーソナライズ広告の無効化を希望される場合は、Googleの
                                    <a href="https://settings.google.com/ads/preferences" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline mx-1">
                                        広告設定
                                    </a>
                                    から設定を変更できます。また、
                                    <a href="https://aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline mx-1">
                                        aboutads.info
                                    </a>
                                    にアクセスし、第三者配信事業者がパーソナライズ広告の掲載に使用するCookieを無効にすることも可能です。
                                </p>
                            </Section>

                            <Section title="5. アクセス解析ツールについて">
                                <p>
                                    当サイトでは、トラフィックデータの収集およびサイト改善を目的として、Googleによるアクセス解析ツール「Google Analytics」（GA4等）を利用しています。このGoogle Analyticsは、トラフィックデータの収集のためにCookieを使用しています。
                                </p>
                                <p className="mt-4">
                                    収集されるトラフィックデータは匿名であり、個人を特定するものではありません。Cookieを無効にすることでトラフィックデータの収集を拒否することができますので、お使いのブラウザの設定をご確認ください。Googleによるデータの利用に関する詳細な規約については、Googleの
                                    <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline mx-1">
                                        ポリシーと規約
                                    </a>
                                    を参照してください。
                                </p>
                            </Section>

                            <Section title="6. 本免責事項の変更・改定について">
                                <p>
                                    当サイトは、提供する情報や技術仕様の変更、関係法令（GDPR、COPPA、電気通信事業法等）の改正、あるいはAdSense等サービスポリシーの改定に伴い、本免責事項の内容を事前の予告なく改定することがあります。改定された免責事項は、当サイトに掲載された時点から効力を生じるものとします。最新の情報については随時このページをご確認ください。
                                </p>
                            </Section>
                        </div>
                    </motion.div>
                </div>
            </div>
        </MainLayout>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    return (
        <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10 p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
                {title}
            </h2>
            <div className="text-gray-300 leading-relaxed text-sm md:text-base">{children}</div>
        </div>
    );
};
