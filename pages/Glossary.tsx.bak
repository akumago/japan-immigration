import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

interface GlossaryTerm {
    term: string;
    reading?: string;
    definition: string;
    relatedTerms?: string[];
}

export const Glossary: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const glossaryTerms: GlossaryTerm[] = [
        {
            term: '技能実習制度',
            reading: 'ぎのうじっしゅうせいど',
            definition:
                '発展途上国への技能移転を目的とした制度。実態は安価な労働力の確保手段として機能しており、転職の自由がなく、劣悪な労働環境や人権侵害が問題視されている。2027年に「育成就労制度」へ移行予定。',
            relatedTerms: ['育成就労制度', '特定技能'],
        },
        {
            term: '育成就労制度',
            reading: 'いくせいしゅうろうせいど',
            definition:
                '2027年から技能実習制度に代わって開始される新制度。一定条件下での転籍を認めるが、事実上の単純労働者受け入れ拡大であり、根本的な問題は解決していないとの批判がある。',
            relatedTerms: ['技能実習制度', '特定技能'],
        },
        {
            term: '特定技能',
            reading: 'とくていぎのう',
            definition:
                '人手不足が深刻な14分野（介護、建設、農業など）で外国人材を受け入れる在留資格。1号（最長5年）と2号（更新可能、家族帯同可）がある。2023年時点で約20万人が在留。',
            relatedTerms: ['技能実習制度', '育成就労制度'],
        },
        {
            term: '在留資格',
            reading: 'ざいりゅうしかく',
            definition:
                '外国人が日本に滞在するための法的資格。就労系（技術・人文知識・国際業務、技能実習など）、身分系（永住者、日本人の配偶者など）、その他（留学、研修など）に分類される。',
            relatedTerms: ['永住権', '帰化'],
        },
        {
            term: '永住権',
            reading: 'えいじゅうけん',
            definition:
                '日本に永住できる在留資格。原則として10年以上の在留実績が必要。永住者は在留期間の制限がなく、活動制限もないが、日本国籍は取得していない。',
            relatedTerms: ['在留資格', '帰化'],
        },
        {
            term: '帰化',
            reading: 'きか',
            definition:
                '外国人が日本国籍を取得すること。最低5年の在留実績で申請可能（永住権より短い）。日本では国家への忠誠宣誓が不要で、簡易な手続きで取得できるため「ザル制度」との批判がある。',
            relatedTerms: ['永住権', '在留資格'],
        },
        {
            term: '来日外国人犯罪',
            reading: 'らいにちがいこくじんはんざい',
            definition:
                '日本に短期滞在または不法滞在している外国人による犯罪。永住者や特別永住者（在日韓国・朝鮮人など）による犯罪は含まれない。警察庁が年次統計を公表している。',
            relatedTerms: ['検挙率', '共犯事件'],
        },
        {
            term: '検挙率',
            reading: 'けんきょりつ',
            definition:
                '発生した犯罪のうち、犯人が検挙された割合。日本の検挙率は世界的に高水準だが、外国人犯罪の組織化・巧妙化により低下傾向にある分野もある。',
            relatedTerms: ['来日外国人犯罪'],
        },
        {
            term: '共犯事件',
            reading: 'きょうはんじけん',
            definition:
                '複数人で実行される犯罪。警察庁のデータによると、来日外国人による刑法犯の共犯事件の割合は日本人の約2.8〜3倍で、組織的犯行が多いことを示している。',
            relatedTerms: ['来日外国人犯罪', '組織犯罪'],
        },
        {
            term: '不法就労',
            reading: 'ふほうしゅうろう',
            definition:
                '在留資格で認められていない就労活動を行うこと。留学生が許可時間を超えて働く、観光ビザで働くなど。雇用主も処罰対象となる。',
            relatedTerms: ['在留資格', '不法滞在'],
        },
        {
            term: '不法滞在',
            reading: 'ふほうたいざい',
            definition:
                '在留期限を超えて日本に滞在すること、または不法に入国すること。2023年時点で約7万人の不法滞在者がいると推計されている。',
            relatedTerms: ['不法就労', '在留資格'],
        },
        {
            term: '国民健康保険',
            reading: 'こくみんけんこうほけん',
            definition:
                '日本の公的医療保険制度の一つ。3ヶ月以上の在留資格を持つ外国人も加入義務がある。一部外国人による滞納率の高さや制度悪用（海外親族の扶養、医療目的入国など）が問題視されている。',
            relatedTerms: ['社会保障制度'],
        },
        {
            term: '社会保障制度',
            reading: 'しゃかいほしょうせいど',
            definition:
                '医療、年金、介護、失業保険などの公的支援制度。外国人も一定条件で利用可能だが、保険料未納や制度悪用が問題となっている。',
            relatedTerms: ['国民健康保険'],
        },
        {
            term: 'DX（デジタルトランスフォーメーション）',
            reading: 'ディーエックス',
            definition:
                'デジタル技術を活用した業務効率化や生産性向上。人手不足の解決策として、安易な移民受け入れよりもDX推進が推奨される。',
            relatedTerms: ['生産性向上', '高度な自律・自動化技術'],
        },
        {
            term: '生産性向上',
            reading: 'せいさんせいこうじょう',
            definition:
                '同じ労働時間でより多くの成果を生み出すこと。技術革新、業務改善、教育投資などで実現される。安価な労働力に依存すると、生産性向上のインセンティブが失われる。',
            relatedTerms: ['DX（デジタルトランスフォーメーション）', '高度な自律・自動化技術'],
        },
        {
            term: '高度な自律・自動化技術',
            reading: 'こうどなじりつ・じどうかぎじゅつ',
            definition:
                '高度な自律型プログラムとロボット工学を活用した自動化技術。製造業、物流、介護など多分野で人手不足の解決に貢献できる。日本は技術力があるにもかかわらず、安価な外国人労働力に依存する傾向がある。',
            relatedTerms: ['DX（デジタルトランスフォーメーション）', '生産性向上'],
        },
        {
            term: '少子化',
            reading: 'しょうしか',
            definition:
                '出生率が低下し、子どもの数が減少する現象。日本の合計特殊出生率は1.26（2022年）で、人口維持に必要な2.07を大きく下回る。安価な外国人労働力は賃金を抑制し、少子化を悪化させる。',
            relatedTerms: ['人口減少', '合計特殊出生率'],
        },
        {
            term: '合計特殊出生率',
            reading: 'ごうけいとくしゅしゅっせいりつ',
            definition:
                '一人の女性が生涯に産む子どもの数の平均値。人口維持には2.07が必要だが、日本は1.26（2022年）と低迷している。',
            relatedTerms: ['少子化', '人口減少'],
        },
        {
            term: '人口減少',
            reading: 'じんこうげんしょう',
            definition:
                '総人口が減少すること。日本は2008年をピークに減少局面に入り、2050年には1億人を割ると予測されている。移民ではなく少子化対策が根本的解決策。',
            relatedTerms: ['少子化', '合計特殊出生率'],
        },
        {
            term: '賃金停滞',
            reading: 'ちんぎんていたい',
            definition:
                '賃金が長期間上昇しない状態。日本では1990年代後半から続いている。安価な外国人労働力の流入が、賃金上昇圧力を弱める要因の一つとされる。',
            relatedTerms: ['デフレーション', '実質賃金'],
        },
        {
            term: '実質賃金',
            reading: 'じっしつちんぎん',
            definition:
                '物価変動を考慮した賃金。名目賃金が上がっても物価上昇がそれを上回れば、実質賃金は低下する。日本では長期間マイナスが続いている。',
            relatedTerms: ['賃金停滞', 'デフレーション'],
        },
        {
            term: 'デフレーション',
            reading: 'デフレーション',
            definition:
                '物価が持続的に下落する経済現象。需要不足が原因で、賃金低下や経済停滞を招く。日本は1990年代後半から長期デフレに陥った。',
            relatedTerms: ['賃金停滞', '実質賃金'],
        },
        {
            term: '多文化共生',
            reading: 'たぶんかきょうせい',
            definition:
                '異なる文化背景を持つ人々が共に生きる社会。理想論として語られるが、実際には価値観の衝突、社会的摩擦、治安悪化などの問題が生じることが多い。',
            relatedTerms: ['文化的摩擦', '社会統合'],
        },
        {
            term: '文化的摩擦',
            reading: 'ぶんかてきまさつ',
            definition:
                '異なる文化・価値観を持つ集団間の対立や軋轢。ゴミ出しルール、騒音、宗教的慣習（土葬、ハラル給食など）を巡るトラブルが典型例。',
            relatedTerms: ['多文化共生', '社会統合'],
        },
        {
            term: '社会統合',
            reading: 'しゃかいとうごう',
            definition:
                '移民が受け入れ国の社会に適応し、一体化すること。言語習得、法律遵守、文化理解が必要だが、欧州諸国では統合の失敗が深刻な問題となっている。',
            relatedTerms: ['多文化共生', '文化的摩擦'],
        },
        {
            term: 'PKK（クルド労働者党）',
            reading: 'ピーケーケー',
            definition:
                'トルコ政府と対立するクルド人武装組織。トルコ、米国、EUなどがテロ組織に指定。日本在住のクルド人リーダーがPKKメンバーとしてトルコで逮捕された事例がある。',
            relatedTerms: ['クルド人問題', '国家安全保障'],
        },
        {
            term: 'クルド人問題',
            reading: 'クルドじんもんだい',
            definition:
                '埼玉県川口市を中心に、トルコ国籍のクルド人コミュニティによる社会問題。病院への集団殺到、性犯罪、無免許運転事故などが発生し、地域住民との摩擦が深刻化している。',
            relatedTerms: ['PKK（クルド労働者党）', '地域社会との軋轢'],
        },
        {
            term: '地域社会との軋轢',
            reading: 'ちいきしゃかいとのあつれき',
            definition:
                '外国人コミュニティと地域住民との対立。生活習慣の違い、言語の壁、犯罪への不安などが原因。川口市のクルド人問題が典型例。',
            relatedTerms: ['クルド人問題', '文化的摩擦'],
        },
        {
            term: '国家安全保障',
            reading: 'こっかあんぜんほしょう',
            definition:
                '国家の独立、主権、領土を守ること。スパイ防止法がない日本は「スパイ天国」と呼ばれ、外国勢力の諜報活動や土地買収が問題視されている。',
            relatedTerms: ['スパイ防止法', '土地買収問題'],
        },
        {
            term: 'スパイ防止法',
            reading: 'スパイぼうしほう',
            definition:
                'スパイ活動を取り締まる法律。日本には存在せず、機密情報の漏洩や外国勢力の工作活動を防ぐ法的手段が不十分。',
            relatedTerms: ['国家安全保障', '機密情報'],
        },
        {
            term: '土地買収問題',
            reading: 'とちばいしゅうもんだい',
            definition:
                '外国資本による日本の土地買収。北海道の水源地、自衛隊基地周辺などが買収され、安全保障上の脅威となっている。',
            relatedTerms: ['国家安全保障', '外国資本'],
        },
    ];

    const categories = [
        { id: 'all', name: '全て' },
        { id: 'system', name: '制度・政策' },
        { id: 'crime', name: '犯罪・治安' },
        { id: 'economy', name: '経済' },
        { id: 'society', name: '社会・文化' },
        { id: 'security', name: '安全保障' },
    ];

    const getCategoryForTerm = (term: GlossaryTerm): string => {
        const systemTerms = ['技能実習制度', '育成就労制度', '特定技能', '在留資格', '永住権', '帰化'];
        const crimeTerms = ['来日外国人犯罪', '検挙率', '共犯事件', '不法就労', '不法滞在'];
        const economyTerms = ['DX', '生産性向上', '高度な自律・自動化技術', '少子化', '合計特殊出生率', '人口減少', '賃金停滞', '実質賃金', 'デフレーション', '国民健康保険', '社会保障制度'];
        const societyTerms = ['多文化共生', '文化的摩擦', '社会統合', 'クルド人問題', '地域社会との軋轢'];
        const securityTerms = ['PKK', '国家安全保障', 'スパイ防止法', '土地買収問題'];

        if (systemTerms.includes(term.term)) return 'system';
        if (crimeTerms.includes(term.term)) return 'crime';
        if (economyTerms.includes(term.term)) return 'economy';
        if (societyTerms.includes(term.term)) return 'society';
        if (securityTerms.includes(term.term)) return 'security';
        return 'all';
    };

    const filteredTerms = glossaryTerms.filter((term) => {
        const matchesSearch =
            searchQuery === '' ||
            term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
            term.reading?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            term.definition.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory =
            selectedCategory === 'all' || getCategoryForTerm(term) === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    return (
        <>
            <Helmet>
                <title>用語集 | 日本の岐路</title>
                <meta
                    name="description"
                    content="外国人移民政策に関する専門用語を解説。技能実習制度、特定技能、在留資格、来日外国人犯罪など、30以上の重要用語を網羅。"
                />
                <meta property="og:title" content="用語集 | 日本の岐路" />
                <meta property="og:description" content="移民政策に関する専門用語をわかりやすく解説。30以上の重要用語を網羅。" />
                <meta property="og:image" content="https://endearing-blini-b688ce.netlify.app/ogp-image-2.png" />
                <meta property="og:url" content="https://endearing-blini-b688ce.netlify.app/glossary/" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="移民政策用語集 | 日本の岐路" />
                <meta name="twitter:description" content="技能実習、特定技能、犯罪統計など、議論の土台となる重要用語を徹底解説。" />
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
                                用語集
                            </h1>
                            <p className="text-gray-400 text-lg">
                                移民政策に関する専門用語をわかりやすく解説
                            </p>
                        </div>

                        {/* Search and Filter */}
                        <div className="mb-8 space-y-4">
                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="用語を検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-3 pl-12 bg-[#161b22] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                />
                                <svg
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>

                            {/* Category Filter */}
                            <div className="flex flex-wrap gap-2">
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => setSelectedCategory(category.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${selectedCategory === category.id
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-[#161b22] text-gray-400 hover:text-white hover:bg-white/5 border border-white/10'
                                            }`}
                                    >
                                        {category.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="mb-6 text-gray-400 text-sm">
                            {filteredTerms.length}件の用語が見つかりました
                        </div>

                        {/* Glossary Terms */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {filteredTerms.map((term, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.03 }}
                                    className="bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-xl border border-white/10 p-6 hover:border-white/20 transition-all duration-300"
                                >
                                    <div className="mb-3">
                                        <h3 className="text-xl font-bold text-white mb-1">{term.term}</h3>
                                        {term.reading && (
                                            <p className="text-sm text-gray-400">（{term.reading}）</p>
                                        )}
                                    </div>
                                    <p className="text-gray-300 leading-relaxed mb-4">{term.definition}</p>
                                    {term.relatedTerms && term.relatedTerms.length > 0 && (
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2">関連用語:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {term.relatedTerms.map((related, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20"
                                                    >
                                                        {related}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>

                        {filteredTerms.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-400">該当する用語が見つかりませんでした</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </>
    );
};

