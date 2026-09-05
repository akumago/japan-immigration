import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { MainLayout } from "../components/MainLayout";

interface FAQItem {
    question: string;
    answer: string | string[];
}

export const FAQ: React.FC = () => {
    const faqs: FAQItem[] = [
        {
            question: 'Q1: 移民受け入れは経済成長に必要ではないですか？',
            answer: [
                'A: 国連の「International Migration Report 2023」によると、移民比率と経済成長率の間に明確な相関関係は見られません。',
                '経済成長は、移民政策よりも産業構造、技術革新、教育水準、政策の質などの要因に大きく左右されます。',
                '日本の場合、人手不足は本来賃金上昇の好機ですが、安価な外国人労働力で補うことで、この機会を失い、日本人の所得停滞と少子化の悪循環を招いています。',
            ],
        },
        {
            question: 'Q2: データの信頼性はどのように確保していますか？',
            answer: [
                'A: 本レポートは以下の信頼性の高い情報源に基づいています：',
                '• 警察庁「来日外国人犯罪の検挙状況」',
                '• 厚生労働省「外国人雇用状況の届出状況」',
                '• 法務省「在留外国人統計」',
                '• 国連「International Migration Report」',
                '全てのデータには出典を明記し、検証可能性を確保しています。',
            ],
        },
        {
            question: 'Q3: 外国人犯罪は本当に増加しているのですか？',
            answer: [
                'A: 警察庁の統計によると、来日外国人による刑法犯の検挙件数・人員は近年増加傾向にあります。',
                '特に注目すべきは、凶悪犯罪（殺人、強盗など）の割合が高いこと、組織的犯罪が多いこと（共犯事件の割合が日本人の約3倍）です。',
                '「全体の犯罪率は減少している」という主張は、来日外国人数の減少（コロナ禍）を考慮していない誤解を招く統計の使い方です。',
            ],
        },
        {
            question: 'Q4: 技能実習制度の何が問題なのですか？',
            answer: [
                'A: 技能実習制度には以下の構造的問題があります：',
                '• 名目は「技能移転」だが、実態は安価な労働力の確保',
                '• 転職の自由がなく、劣悪な労働環境でも逃げられない',
                '• 多額の借金を背負って来日し、失踪・犯罪の温床に',
                '• 日本人労働者の賃金を押し下げる効果',
                '2027年からの「育成就労制度」も、転籍を一定条件で認めるものの、根本的な問題は解決していません。',
            ],
        },
        {
            question: 'Q5: 人手不足の解決策は移民以外にないのですか？',
            answer: [
                'A: 移民に頼らない解決策は多数あります：',
                '• DX（デジタルトランスフォーメーション）による生産性向上',
                '• 高度な自律型自動化技術の活用',
                '• 賃金上昇による労働市場の活性化',
                '• 女性・高齢者の労働参加促進（働きやすい環境整備）',
                '• 少子化対策への集中投資',
                '人手不足は本来、賃金が上昇し技術革新が進む好機です。安易な移民受け入れは、この機会を潰します。',
            ],
        },
        {
            question: 'Q6: 国民健康保険の外国人滞納率はどれくらいですか？',
            answer: [
                'A: 厚生労働省の調査によると、一部の地域では外国人の3割以上が国民健康保険料を滞納しており、日本人全体の滞納率を大幅に上回っています。',
                'さらに深刻なのは、制度の悪用（海外在住の親族を扶養に入れる、高額医療を受けて帰国など）が横行していることです。',
                'この負担は全て、正直に保険料を納める日本国民に転嫁されます。',
            ],
        },
        {
            question: 'Q7: クルド人問題とは何ですか？',
            answer: [
                'A: 埼玉県川口市を中心に、トルコ国籍のクルド人コミュニティによる社会問題が深刻化しています：',
                '• 病院への集団殺到事件',
                '• 性犯罪の再犯',
                '• 無免許運転によるひき逃げ死傷事件',
                '• 地域住民との摩擦',
                '一部データでは、トルコ国籍者の逮捕率は日本人の約15倍に上るとの指摘もあります。',
            ],
        },
        {
            question: 'Q8: 移民政策に賛成する人の意見は？',
            answer: [
                'A: 移民推進派の主な主張は以下の通りです：',
                '• 労働力不足の解消',
                '• 経済の活性化',
                '• 多文化共生の推進',
                '• 国際競争力の向上',
                'しかし、本レポートではこれらの主張が実際のデータと矛盾することを示しています。重要なのは、感情論ではなく事実とデータに基づいた議論です。',
            ],
        },
        {
            question: 'Q9: 他の先進国の移民政策はどうなっていますか？',
            answer: [
                'A: 欧米諸国では、安易な移民受け入れの弊害が顕在化しています：',
                '• イギリス：15万人規模の反移民デモ（2024年）',
                '• ドイツ：移民犯罪の増加と社会統合の失敗',
                '• スウェーデン：治安悪化と福祉制度の圧迫',
                '• フランス：移民コミュニティでの暴動',
                '多くの国が移民政策の見直しを迫られており、日本は同じ轍を踏むべきではありません。',
            ],
        },
        {
            question: 'Q10: このレポートは差別的ではないですか？',
            answer: [
                'A: 本レポートは特定の民族や国籍を差別するものではありません。',
                '公的統計データと具体的な事例に基づき、「政策」の問題点を指摘しています。',
                '問題なのは、国民に十分な説明をせず、なし崩し的に進められる移民政策そのものです。',
                'データと事実に基づく批判は、差別ではなく、民主主義社会における正当な言論活動です。',
            ],
        },
        {
            question: 'Q11: 既に日本に住んでいる外国人についてはどう考えますか？',
            answer: [
                'A: 既に日本に合法的に居住し、法律を守り、社会に貢献している外国人の方々については、尊重されるべきです。',
                '本レポートが問題視しているのは：',
                '• 制度を悪用する一部の外国人',
                '• 犯罪を犯す外国人',
                '• 日本の価値観を尊重しない行為',
                '• 政府のずさんな管理体制',
                '善良な外国人と、制度を悪用する者を区別することが重要です。',
            ],
        },
        {
            question: 'Q12: 少子化対策と移民政策、どちらを優先すべきですか？',
            answer: [
                'A: 少子化対策を最優先すべきです。理由：',
                '• 移民は少子化の根本的解決にならない',
                '• 安価な労働力が賃金を抑制し、少子化を悪化させる',
                '• 日本人への投資こそが持続可能な解決策',
                '具体策：子育て支援の大幅拡充、減税による可処分所得増加、働き方改革の真の実現など。',
            ],
        },
        {
            question: 'Q13: データに間違いがあった場合はどうすればいいですか？',
            answer: [
                'A: データの正確性には万全を期していますが、誤りを発見された場合は、お問い合わせページよりご連絡ください。',
                '具体的な出典と訂正内容を明記していただければ、速やかに確認・修正いたします。',
                '建設的なご指摘は歓迎いたします。',
            ],
        },
        {
            question: 'Q14: このレポートを引用・共有してもいいですか？',
            answer: [
                'A: はい、引用・共有は歓迎します。',
                '引用の際は、出典として当サイト名とURLを明記してください。',
                'SNSでのシェアも自由です。より多くの人に現実を知ってもらうことが目的です。',
                'ただし、内容の改変や誤解を招く引用はご遠慮ください。',
            ],
        },
        {
            question: 'Q15: 今後、私たちに何ができますか？',
            answer: [
                'A: 一人ひとりができること：',
                '• 正確な情報を知り、考える',
                '• 家族や友人と議論する',
                '• SNSで情報を共有する',
                '• 地方議員・国会議員に意見を伝える',
                '• 選挙で意思表示する',
                '政府やメディアが情報発信を控える中、国民一人ひとりの深い理解と議論こそが、この構造的な課題の連鎖を解き明かす唯一の力です。',
            ],
        },
    ];

    return (
        <MainLayout>
            <Helmet>
                <title>よくある質問（FAQ） | 日本の岐路</title>
                <meta
                    name="description"
                    content="外国人移民政策に関するよくある質問と回答。経済成長、犯罪統計、技能実習制度、少子化対策など、データに基づいた解説。"
                />
                <meta property="og:title" content="よくある質問（FAQ） | 日本の岐路" />
                <meta property="og:description" content="移民政策に関する疑問にデータと事実で答えます。経済、治安、制度など多角的に解説。" />
                <meta property="og:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
                <meta property="og:url" content="https://endearing-blini-b688ce.netlify.app/faq/" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="移民政策FAQ：疑問に答える | 日本の岐路" />
                <meta name="twitter:description" content="「移民は経済に必要？」「犯罪は増えてる？」公認統計に基づき、よくある疑問を解明。" />
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
                                よくある質問（FAQ）
                            </h1>
                            <p className="text-gray-400 text-lg">
                                移民政策に関する疑問にデータと事実で答えます
                            </p>
                        </div>

                        {/* FAQs */}
                        <div className="space-y-6">
                            {faqs.map((faq, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.05 }}
                                >
                                    <FAQCard faq={faq} index={index} />
                                </motion.div>
                            ))}
                        </div>

                        {/* CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                            className="mt-12 p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-3">他にご質問がありますか？</h3>
                            <p className="text-gray-300 mb-4">
                                上記で解決しない疑問や、データの訂正依頼などがございましたら、お気軽にお問い合わせください。
                            </p>
                            <a
                                href="/contact"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
                            >
                                お問い合わせ
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </a>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </MainLayout>
    );
};

const FAQCard: React.FC<{ faq: FAQItem; index: number }> = ({ faq, index }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-6 text-left flex items-start justify-between gap-4 hover:bg-white/5 transition-colors"
            >
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{faq.question}</h3>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0"
                >
                    <svg
                        className="w-6 h-6 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </motion.div>
            </button>

            <motion.div
                initial={false}
                animate={{
                    height: isOpen ? 'auto' : 0,
                    opacity: isOpen ? 1 : 0,
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
            >
                <div className="px-6 pb-6 pt-2">
                    <div className="pl-4 border-l-2 border-blue-500/30">
                        {Array.isArray(faq.answer) ? (
                            <div className="space-y-3">
                                {faq.answer.map((paragraph, i) => (
                                    <p key={i} className="text-gray-300 leading-relaxed">
                                        {paragraph}
                                    </p>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

