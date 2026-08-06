import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Header } from "../components/Header";

export const PrivacyPolicy: React.FC = () => {
    return (
        <>
            <Helmet>
                <title>プライバシーポリシー | 日本の岐路</title>
                <meta
                    name="description"
                    content="日本社会構造分析リサーチ（当サイト）における個人情報の取り扱いおよびGoogle AdSense広告配信に関する事項を記載します。"
                />
                <meta property="og:title" content="プライバシーポリシー | 日本の岐路" />
                <meta property="og:description" content="個人情報の取り扱いおよびGoogle AdSense広告配信に関する公式規定。" />
                <meta property="og:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
                <meta property="og:url" content="https://endearing-blini-b688ce.netlify.app/privacy-policy/" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="プライバシーポリシー | 日本の岐路" />
                <meta name="twitter:description" content="当サイトにおける個人情報の取り扱いと広告配信に関する重要なお知らせ。" />
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
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                プライバシーポリシー
                            </h1>
                            <p className="text-gray-400">最終更新日: 2025年12月31日</p>
                        </div>

                        {/* Content */}
                        <div className="space-y-8">
                            <Section title="プライバシーポリシー">
                                <p>
                                    当サイト（以下、「当サイト」）では、第三者配信の広告サービス（Google AdSense）を利用しています。以下に、当サイトにおける個人情報の取り扱いおよび広告配信に関する事項を記載します。
                                </p>
                            </Section>

                            <Section title="広告について">
                                <p>
                                    当サイトでは、第三者配信の広告サービスである Google AdSense を利用しています。
                                </p>
                                <p className="mt-4">
                                    Google などの第三者広告配信事業者は、ユーザーの興味に応じた広告を表示するために Cookie（クッキー） を使用することがあります。この Cookie によって収集される情報には、氏名、住所、メールアドレス、電話番号などの 個人を特定できる情報は含まれません。
                                </p>
                                <p className="mt-4">
                                    Google による広告における Cookie の使用についての詳細は、Google のポリシーをご確認ください。<br />
                                    <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                        https://policies.google.com/technologies/ads
                                    </a>
                                </p>
                            </Section>

                            <Section title="Cookie を無効にする方法">
                                <p>
                                    ユーザーは、広告設定により パーソナライズ広告を無効にすることが可能です。以下のページから設定できます。<br />
                                    <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                        https://adssettings.google.com/
                                    </a>
                                </p>
                                <p className="mt-4">
                                    また、ブラウザの設定により Cookie を無効にすることも可能です。
                                </p>
                            </Section>

                            <Section title="アクセス解析ツールについて">
                                <p>
                                    当サイトでは、サイト改善のためにアクセス解析ツールを利用する場合があります。これらの解析ツールはトラフィックデータの収集のために Cookie を使用することがありますが、このデータは 匿名で収集されており、個人を特定するものではありません。
                                </p>
                            </Section>

                            <Section title="個人情報の利用目的">
                                <p>
                                    当サイトでは、お問い合わせの際に名前やメールアドレス等の個人情報をご提供いただく場合があります。取得した個人情報は、お問い合わせへの回答必要な情報のご連絡のみに利用し、これらの目的以外では利用しません。
                                </p>
                            </Section>

                            <Section title="個人情報の第三者への開示">
                                <p>
                                    以下の場合を除き、個人情報を第三者に開示することはありません。
                                </p>
                                <ul className="mt-4 space-y-2 list-disc list-inside text-gray-300">
                                    <li>本人の同意がある場合</li>
                                    <li>法令に基づき開示が必要となる場合</li>
                                </ul>
                            </Section>

                            <Section title="免責事項">
                                <p>
                                    当サイトの情報は、可能な限り正確な情報を掲載するよう努めていますが、内容の正確性や安全性を保証するものではありません。当サイトに掲載された内容によって生じた損害等については、一切の責任を負いかねますのでご了承ください。
                                </p>
                            </Section>

                            <Section title="プライバシーポリシーの変更について">
                                <p>
                                    本プライバシーポリシーは、法令の変更やサイト運営方針の変更により、予告なく変更される場合があります。
                                </p>
                            </Section>

                            <Section title="お問い合わせ">
                                <p>
                                    当サイトに関するお問い合わせは、
                                    <a href="/contact/" className="text-blue-400 hover:text-blue-300 underline ml-1">
                                        「お問い合わせ」
                                    </a>
                                    ページよりお願いいたします。
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
