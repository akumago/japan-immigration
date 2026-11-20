import React from 'react';
import { Link } from 'react-router-dom';
import notionAddendumFaqs from '../data/notionAddendumFaqs.json';

export type NotionAddendumKey =
  | 'social-security'
  | 'summary-statistics'
  | 'crime-statistics'
  | 'non-prosecution'
  | 'labor-mismatch'
  | 'economic-impact'
  | 'simulation-model'
  | 'uk-immigration-lesson'
  | 'burial-controversy'
  | 'conclusion'
  | 'national-security'
  | 'symbiosis'
  | 'borderless-welfare';

interface MetricCard {
  label: string;
  value: string;
  sub: string;
  accent?: 'red' | 'amber' | 'sky' | 'emerald' | 'purple';
}

interface SubBlock {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

interface AddendumTable {
  caption: string;
  headers: string[];
  rows: string[][];
}

interface SourceRef {
  label: string;
  url: string;
}

interface InternalRef {
  label: string;
  to: string;
}

interface AddendumConfig {
  badge: string;
  title: string;
  lead: string;
  metrics: MetricCard[];
  blocks: SubBlock[];
  table?: AddendumTable;
  methodologyNote: string;
  sources?: SourceRef[];
  relatedLinks: InternalRef[];
}

const ACCENT_MAP: Record<NonNullable<MetricCard['accent']>, string> = {
  red: 'border-red-700/50 text-red-400',
  amber: 'border-amber-700/50 text-amber-300',
  sky: 'border-sky-700/50 text-sky-300',
  emerald: 'border-emerald-700/50 text-emerald-300',
  purple: 'border-purple-700/50 text-purple-300'
};

const ADDENDUM_DATA: Record<NotionAddendumKey, AddendumConfig> = {
  'social-security': {
    badge: '2026年最新一次資料増設｜国保収納率・医療財政検証',
    title: '【厚労省約150自治体集計】外国人世帯主の国保収納率63%（未納率5.29倍）と医療保険財政への波及試算',
    lead: '内閣官房資料および衆議院令和7年5月20日内閣答弁書で公表された国民健康保険料の自治体別集計データに基づき、収納率格差の実数と、将来人口比が拡大した場合の医療保険財政・救急医療への影響を整理します。',
    metrics: [
      { label: '外国人世帯主世帯 国保収納率', value: '63%', sub: '未収納率 37%（令和6年12月末基準・約150自治体集計）', accent: 'red' },
      { label: '同一自治体全体の国保収納率', value: '93%', sub: '未収納率 7%（総賦課額に対する収納金額ベース）', accent: 'emerald' },
      { label: '外国人世帯の未収納率倍率', value: '約5.29倍', sub: '未収納率37% ÷ 全体未収納率7%（公的一次資料ベース）', accent: 'amber' }
    ],
    blocks: [
      {
        heading: '1. 公表された国保収納率の一次データと実務負担',
        paragraphs: [
          '厚生労働省が約150自治体を対象に集計（令和6年12月末基本時点）し内閣官房資料・衆議院答弁書でも確認されている統計では、外国人世帯主世帯の国民健康保険料収納率は63%（未収納率37%）にとどまり、同自治体全体の収納率93%（未収納率7%）を大きく下回っています。',
          '単なる保険料収入の不足にとどまらず、未納者への督促・徴収事務、在留審査連携、資格取消しや退去強制に伴う行政コストまで日本の自治体と納税者が負担する二重構造が生じています。'
        ]
      },
      {
        heading: '2. 医療保険財政の圧迫が救急医療・日本人の受診機会へ及ぶ経路',
        paragraphs: [
          '収納率格差（63% vs 93%）を解消しないまま受け入れ人数・構成比が拡大すると、不足分は他の加入者の保険料引き上げや税金（公費投入）で補填せざるを得なくなります。',
          '財源圧迫が進めば地域医療提供体制や救急輸送インフラの維持コストを押し上げ、将来的に救急車の有料化や自己負担増など「費用を懸念して受診・救急要請をためらう」医療アクセス悪化リスクへつながります。既存の未納解消と制度基盤防衛を受け入れ拡大の議論より優先すべきです。'
        ]
      }
    ],
    table: {
      caption: '仮定モデル：日本人側93%・外国人側63%の収納率差のまま人口・賦課構成比が50%ずつになった場合（賦課総額=100）',
      headers: ['区分', '賦課額比', '設定収納率', '収納額', '未収納額'],
      rows: [
        ['日本人側', '50', '93%', '46.5', '3.5'],
        ['外国人側', '50', '63%', '31.5', '18.5'],
        ['合算全体', '100', '78%（低下）', '78.0', '22.0（全員93%時7.0の約3.14倍）']
      ]
    },
    methodologyNote: '区分注記：63%／93%は約150自治体集計の公的実績値、50%合算表は構成比変化の影響を示す算術比較モデルです。',
    sources: [
      { label: '内閣官房「外国人の国保保険料収納状況の把握・入管庁との連携について」(PDF)', url: 'https://www.cas.go.jp/jp/seisaku/symbiotic_society/pdf/Health_insurance.pdf' },
      { label: '衆議院 令和7年5月20日 内閣答弁書（質問第180号）', url: 'https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b217180.htm' }
    ],
    relatedLinks: [
      { label: 'オランダ1,700万人財政研究の原典', to: '/analysis/borderless-welfare-state/' },
      { label: '外国人比率1%案と財政負担試算', to: '/analysis/simulation-model/' },
      { label: '2026年最新主要指標まとめ', to: '/analysis/summary-statistics/' }
    ]
  },

  'summary-statistics': {
    badge: '2026年10月〜11月 最新基準値アップデート',
    title: '【2026年最新統計一覧】在留外国人428万1,026人（総人口約3.5%）と分野別主要ファクト',
    lead: 'サイト内の過去年次統計を補完するため、2026年6月末時点の在留外国人数（過去最多更新）および直近の治安・社会保障・安全保障における最新基準値を横断整理しました。',
    metrics: [
      { label: '在留外国人数（2026年6月末）', value: '428万1,026人', sub: '総人口比 約3.5%（過去最多更新・永住審査厳格化動向あり）', accent: 'amber' },
      { label: '定住外国人の刑法犯検挙率', value: '0.323%', sub: '日本人0.188%比 約1.72倍（2025年11月参院内閣委警察庁答弁）', accent: 'red' },
      { label: '国保収納率格差（150自治体）', value: '63% vs 93%', sub: '外国人世帯未納37%は全体未納7%の約5.29倍', accent: 'sky' }
    ],
    blocks: [
      {
        heading: '「在留428万人（約3.5%）」が示す政策転換の分岐点',
        paragraphs: [
          '2026年10月17日付報道（AFP＝時事）で確認された2026年6月末の在留外国人数は428万1,026人となり、日本の総人口に占める割合は約3.5%に達しています。同報道では永住許可ガイドラインの審査厳格化も伝えられています。',
          'この水準は「少数の例外的受け入れ」から「社会構造・自治体財政・治安インフラ・学校現場に直接影響する規模」へ移行したことを意味し、受け入れ人数の上限検討や在留厳格化が急務となっています。'
        ]
      }
    ],
    table: {
      caption: '2026年時点で確認されている各分野の最新一次データ指標',
      headers: ['分野', '最新確認指標', '基準・比較水準', '主な出典・時期'],
      rows: [
        ['在留規模', '在留外国人数 428万1,026人', '総人口比 約3.5%（過去最多）', '2026年6月末実績（2026/10報道）'],
        ['治安・検挙', '定住外国人検挙率 0.323%', '日本人 0.188%の約1.72倍', '2025年11月参院内閣委・警察庁答弁'],
        ['医療財政', '外国人世帯 国保収納率 63%', '同自治体全体 93%（未納率5.29倍）', '内閣官房PDF・衆院令和7年答弁書'],
        ['南西防衛', '尖閣接続水域連続確認 335日', '2024/11〜2025/10の長期圧力', '2026年版防衛白書'],
        ['対中関係', '中国側の対日否定印象 87.7%', '前年比 +24.8pt / 関係不要 59.6%', '第20回日中共同世論調査']
      ]
    },
    methodologyNote: '区分注記：統計は公表基準日・集計対象が異なるため、出典ごとに原資料の範囲を維持して掲載しています。',
    relatedLinks: [
      { label: '外国人国保収納率63%の詳細検証', to: '/analysis/social-security/' },
      { label: '参院法務委：国籍別犯罪構成比データ', to: '/analysis/crime-statistics/' },
      { label: '沖縄影響工作・邦人拘束データ', to: '/analysis/national-security/' }
    ]
  },

  'crime-statistics': {
    badge: '2026年10月27日 参議院法務委員会 質疑整理',
    title: '【国会質疑・国籍別構成比】ベトナム人検挙構成比32.6% vs 在留18.2%と罪種別比較・入国審査の議論',
    lead: '全体平均としての「検挙率1.72倍」だけでなく、2026年10月27日の参議院法務委員会（文字起こし記録）で取り上げられた国籍別・出身地域別の偏在データと政府答弁内容を区別して整理します。',
    metrics: [
      { label: 'ベトナム人 検挙人員構成比', value: '32.6%', sub: '在留外国人構成比 18.2%（議員提示資料1・令和7年警察庁資料基）', accent: 'red' },
      { label: '中国人 検挙人員構成比', value: '16.1%', sub: 'ベトナム人と合わせ外国籍検挙の約半数規模（同資料1）', accent: 'amber' },
      { label: '1万人当たり倍率（議員試算）', value: '全体約1.8倍', sub: '殺人3.5倍・強盗3.3倍・傷害2.1倍（令和6年統計基・議員資料8）', accent: 'purple' }
    ],
    blocks: [
      {
        heading: '1. 参院法務委員会で問われた「国籍・出身地域別リスク分析」',
        paragraphs: [
          '質疑では、在留外国人構成比18.2%に対し検挙人員構成比が32.6%を占めるベトナム出身者について、特定出身地域別の偏り調査や韓国の過去停止事例を踏まえた審査厳格化・受け入れ停止の選択肢が提起されました。',
          '山下法務大臣は、特定地域出身のみを理由とする一律入国制限は困難としつつ、出入国在留管理庁が問題となるおそれのある外国人の類型化と上陸審査での慎重審査を実施していること、ベトナム出身者比率が高い原因の調査・情報収集の必要性を答弁しました。'
        ]
      },
      {
        heading: '2. 政府公式数値と議員提示試算の厳格な区別',
        paragraphs: [
          '資料8で示された「刑法犯・特別法犯含む1万人当たり検挙人員：全体約1.8倍、殺人約3.5倍、強盗約3.3倍、傷害約2.1倍」は、質問者が短期滞在者の扱いに触れた上で令和6年警察庁統計等から作成した議員試算であり、警察庁公式の定住外国人比率（0.323% vs 0.188%＝1.72倍）とは定義・分母が異なります。',
          'また内閣官房側は日本の外国人受け入れ基本方針について治安への影響を含めて政府全体で年度内にとりまとめる旨を答弁しています。'
        ]
      }
    ],
    methodologyNote: '資料精度注記：上記質疑は動画文字起こしに基づく参院法務委員会（2026年10月27日想定）の整理です。会議録原本・資料1/8算出式の最終照合前のため、議員試算と大臣答弁を明確に分けて記載しています。',
    relatedLinks: [
      { label: '「外国人犯罪率デマ vs 1.72倍」徹底検証', to: '/analysis/crime-rate-factcheck/' },
      { label: '外国人事件「不起訴」と通訳負担の実録', to: '/analysis/non-prosecution/' },
      { label: '国内一次報道アーカイブ（470件超）', to: '/analysis/crime-news/' }
    ]
  },

  'non-prosecution': {
    badge: '国会委員会質疑・刑事司法と入管行政の連動論点',
    title: '【国会質疑整理】外国人事件の通訳・翻訳負担、不起訴比較統計の不在と「退去強制事由拡大」の検討',
    lead: '実録アーカイブの数値に加え、検察の取調べ・通訳負荷・不起訴処分と入管行政の判断基準をめぐる国会質疑における政府側公式答弁と法改正論点を補足します。',
    metrics: [
      { label: '通訳・翻訳負荷の政府見解', value: '負担を認定', sub: '希少言語通訳・スマホ外国語翻訳・文化差が捜査上の困難になり得る', accent: 'amber' },
      { label: '外国人不起訴率の比較統計', value: '網羅把握なし', sub: '政府答弁「個別事情が異なり比較結論は困難」と回答', accent: 'red' },
      { label: '入管法上の措置見直し', value: '拡大を検討中', sub: '総合的対応策に基づき退去強制事由・上陸拒否事由の拡大検討', accent: 'sky' }
    ],
    blocks: [
      {
        heading: '1. 通訳を介した捜査・翻訳と身柄拘束期間の制度課題',
        paragraphs: [
          '政府側答弁では、外国人被疑者事件において通訳を介した取調べに時間を要すること、スマートフォン内の外国語メッセージの翻訳・分析が必要になること、法制度や文化の違いが捜査上の障害となり得ることが公式に認められました。',
          '質問者からは、意思疎通に類型的な時間を要する外国人被疑者について実態を統計調査し、必要に応じて身柄拘束期間の特例を設ける刑事訴訟法改正の検討も提起されました（法務省側は現状で網羅的な比較統計把握はしていない旨を答弁）。'
        ]
      },
      {
        heading: '2. 「刑事裁判の無罪・不起訴」と「入管行政上の在留判断」の分離',
        paragraphs: [
          '政府参考人は、入管当局は刑事裁判の結果だけでなく他の情報も収集し、退去強制事由・上陸拒否事由・在留更新時の素行等を個別判断していると説明するとともに、同年1月の政府「外国人の受入れ・秩序ある共生のための総合的対応策」に基づく退去強制・上陸拒否事由の拡大検討に言及しました。',
          '質問者は「刑事事件では疑わしきは罰せず、入管行政では疑わしい方は入れない」という判断軸の違いを提起しています（議員の政策意見として整理）。'
        ]
      }
    ],
    methodologyNote: '資料精度注記：この記録は国会委員会質疑の動画文字起こしに基づく整理であり、開催日・委員会名・会議録原本は別途照合対象です。政府答弁の現行運用・検討段階と議員提案を区別しています。',
    relatedLinks: [
      { label: '参院法務委：国籍別構成比データ', to: '/analysis/crime-statistics/' },
      { label: '「不起訴」専用リアルタイム抽出ハブ', to: '/analysis/crime-news/stage/non-prosecution/' },
      { label: '外国人犯罪率ファクトチェック', to: '/analysis/crime-rate-factcheck/' }
    ]
  },

  'labor-mismatch': {
    badge: '2026年11月最新対比｜「人手不足」の6分解＆南アフリカ労働統計',
    title: '【国際比較】「人手不足」と「人手あまり」の本質的対比――南アフリカ失業率33.7%(LU3 44%)が示す構造',
    lead: '「人手不足」の一言で企業の採用難と日本全体の労働供給不足を混同してはなりません。人手不足の6つの定義分解と、深刻な「人手あまり」状態にある南アフリカ公式統計（2026年11月公表）を対照します。',
    metrics: [
      { label: '南アフリカ公式失業率（Q3 2026）', value: '33.7%', sub: '失業者860万人（Stats SA 2026年11月10日公表）', accent: 'red' },
      { label: '労働力未活用率 LU3（Q3 2026）', value: '44.0%', sub: '求職断念者370万人含む1,320万人が就業機会外', accent: 'amber' },
      { label: '若年層（15〜24歳）失業率', value: '60.9%', sub: 'NEET率 37.6%（Stats SA Q1 2026・Q2若年失業率も悪化）', accent: 'purple' }
    ],
    blocks: [
      {
        heading: '「人手不足」を議論する前に分解すべき6つの状態',
        paragraphs: [
          '企業が「人が集まらない」と訴える局面でも、①働く人の総数不足、②特定資格・技能人材の不足、③特定地域・時間帯の不足、④提示した賃金・労働条件では応募が来ない採用難、⑤企業が望む従来事業規模を維持するための人員不足、⑥医療・介護・物流・防災等の必須機能不足は全く異なる問題です。',
          '日本が優先すべきは、企業の希望事業規模や低賃金ビジネスを安価な労働力追加で延命することではなく、賃上げ・省人化投資を促し国内労働者の所得を引き上げることです。'
        ]
      }
    ],
    table: {
      caption: '「人手不足の局面」と「人手あまりの局面」の労働市場メカニズム比較',
      headers: ['比較項目', '人手不足の局面（日本が活かすべき圧力）', '人手あまりの局面（南アフリカ等の例）'],
      rows: [
        ['労働者の交渉力', '強まりやすい（売り手市場）', '弱まりやすい（買い手市場）'],
        ['賃金・労働条件', '引き上げ・改善圧力が生まれやすい', '上がりにくく改善が後回しになりやすい'],
        ['企業の投資行動', '賃上げ・省人化・AI自動化投資の誘因', '安価な人員確保に頼り投資が遅れやすい'],
        ['家計所得と消費', '実質賃金上昇→国内消費拡大へつながり得る', '所得停滞→雇用不安・社会不安へ波及し得る']
      ]
    },
    methodologyNote: '統計出典：南アフリカ統計局（Stats SA）Quarterly Labour Force Survey Q3 2026（2026年11月10日公表）およびQ1/Q2 2026資料に基づく一次数値です。',
    sources: [
      { label: 'Statistics South Africa QLFS Q3 2026 (2026-11-10)', url: 'https://www.statssa.gov.za/?PPN=P0211&SCH=74513&page_id=1856' },
      { label: 'Stats SA Q1 2026 若年層労働統計', url: 'https://www.statssa.gov.za/?p=19526' }
    ],
    relatedLinks: [
      { label: '賃金回復を先行させる6段階戦略', to: '/analysis/economic-impact/' },
      { label: '外国人比率1%案と期待リスク試算', to: '/analysis/simulation-model/' }
    ]
  },

  'economic-impact': {
    badge: '2026年11月整理｜賃金回復先行の日本再生戦略（6段階順序）',
    title: '「人手不足は賃金上昇のゴールデンタイム」――総GDPと一人当たりGDPを混同しない6段階の政策順序',
    lead: '人口水増しによる総GDP増加ではなく、40年間停滞してきた国内労働者の実質賃金・時間当たり賃金・一人当たりGDPを最優先で回復させ、若年層の少子化障壁を取り除く政策順序を提示します。',
    metrics: [
      { label: '優先順位 第1段階', value: '実質賃金・待遇改善', sub: '人手不足の市場圧力を追加労働供給で消さず賃上げに直結させる', accent: 'emerald' },
      { label: '評価指標の中心軸', value: '一人当たりGDP', sub: '人口総数や見かけの総GDPではなく国民1人当たりの豊かさを基準化', accent: 'sky' }
    ],
    blocks: [
      {
        heading: '日本人の所得回復を起点とする6段階の政策順序',
        paragraphs: [
          '賃上げが少し始まった段階で「人手不足だから」と労働供給を外部から追加すれば、せっかく発生した実質賃金上昇と省力化投資の誘因が削がれます。以下の順序を崩さないことが日本経済再生の鍵となります。'
        ],
        bullets: [
          '① 人手不足によって生じる賃上げ圧力を、まず国内労働者の賃金・待遇改善へ最大限つなげる',
          '② 長期賃金停滞からの回復度を実質賃金・賃金中央値・時間当たり賃金・実質可処分所得で検証する',
          '③ AI・ロボット・自動化投資・工程改善を並行し、一人当たり付加価値と労働生産性を引き上げる',
          '④ その成果として一人当たりGDPと日本人の生活水準を底上げする（総GDPとの混同を排す）',
          '⑤ 若年層の所得・雇用・住宅・子育て障壁を下げ、結婚・希望する出生の実現を後押しする',
          '⑥ 上記を経てもなお社会必須分野に不足が残るかを確認してから、限定的な補充要否を検討する'
        ]
      }
    ],
    methodologyNote: '区分注記：本セクションは賃金・生産性・少子化を一体の因果経路として検証するための政策体系フレームワークです。',
    relatedLinks: [
      { label: '「人手不足 vs 人手あまり」国際比較', to: '/analysis/labor-mismatch/' },
      { label: '国保収納率63%の医療財政検証', to: '/analysis/social-security/' }
    ]
  },

  'simulation-model': {
    badge: '数量と事前予防の数理検証｜外国人比率1%案・C=J+F・みかん理論',
    title: '「外国人比率1%案（3.48%→1%）」の期待リスク71.3%減試算と『C = J + F』・みかん理論の正確な数理構造',
    lead: '「受け入れゼロか現状維持か」の二者択一ではなく、在留規模の上限・引き下げによる数量的効果を算術比較し、事後処罰では被害を取り戻せない事前予防の原則を整理します。',
    metrics: [
      { label: '3.48%（428万人）→ 1%（123万人）', value: '約305万人減', sub: '総人口1億2,302万人想定での人数削減率 約71.3%', accent: 'sky' },
      { label: '単純比例モデル上の期待件数', value: '約71.3%減', sub: '1人当たり発生率が一定なら期待リスクも同率縮小', accent: 'amber' },
      { label: '国内犯罪総数の算術関係', value: 'C = J + F', sub: '日本人件数Jに外国籍件数Fが加算され相殺されない構造', accent: 'red' }
    ],
    blocks: [
      {
        heading: '1. C = J + F と「事後処罰」より「事前予防」を優先すべき理由',
        paragraphs: [
          '国内の犯罪総数 C は日本人による件数 J に外国籍者による件数 F を加えた合計（C = J + F）であり、両者は相殺関係にありません。したがって受け入れ規模・審査・管理能力を超えて人数が増えれば、その発生率に応じた追加リスクが国内社会・警察・司法へ上乗せされます。',
          '被害が起きてからの逮捕・起訴・退去強制という「事後対応」では、失われた命や被害者の損害を取り戻すことはできません。入国・受け入れ段階の審査実効性と受け入れ総数の抑制こそが事前予防の中核になります。'
        ]
      },
      {
        heading: '2. みかん理論が示す「数量構造」と「波及・評価低下構造」',
        paragraphs: [
          '数理比喩として用いる「みかん理論」は、外国人個人や特定国籍を指す表現ではなく、「事象の発生確率（腐敗）と投入数量の関係」および「一つの事象が周囲へ波及し全体の信頼・価値を押し下げる構造」の2点を表すモデルです。',
          '割合が同じでも母数を3.48%から1%目安へ抑えることで期待件数が約71.3%減る「数量の効果」と、局地的なトラブルや不正が社会全体の信用・安心感を損なう「波及の効果」を切り分けて評価する必要があります。'
        ]
      }
    ],
    methodologyNote: '算術モデルの注意：71.3%減は「1人当たり発生率一定」を置いた単純比例比較であり、実際の件数は在留形態・年齢構成・地域集中・取締りで変動します。1%は検証上の政策目安です。',
    relatedLinks: [
      { label: '2026年最新428万人の数値まとめ', to: '/analysis/summary-statistics/' },
      { label: '英国・イタリア・スウェーデンの比較', to: '/analysis/uk-immigration-lesson/' }
    ]
  },

  'uk-immigration-lesson': {
    badge: '2026年欧州最新追跡｜イタリア・スウェーデン・フランスの一次資料',
    title: '【欧州最新比較】イタリア・メストレ「レッドゾーン」警察資料＆スウェーデン「まっとうな生活」法案が示す警告',
    lead: 'イギリスだけでなく、イタリア北東部メストレでの治安対策・特別取締、スウェーデンでの在留許可取消要件厳格化、フランスの公共サービス危機を各国の公的公表資料から比較します。',
    metrics: [
      { label: 'ヴェネツィア警察 年間報告（2025年）', value: '逮捕244人', sub: '告発2,040人・国外退去206人・女性暴力措置増加（RAI News報道）', accent: 'red' },
      { label: 'スウェーデン法案発表（2026年3月）', value: '追放厳格化', sub: '税・罰金滞納や社会保障悪用を理由に在留取消を容易化する法案発表', accent: 'amber' }
    ],
    blocks: [
      {
        heading: '1. イタリア・メストレの特定地区集中と「レッドゾーン」対応',
        paragraphs: [
          'ヴェネツィア警察本部（Questura di Venezia）は2023年11月および2026年7月、メストレとマルゲーラの重点地区において違法占有・街頭犯罪・薬物問題への特別取締を連続実施しました。ヴェネツィア県庁（2025年7月）でも財産犯・薬物・移民の社会的影響を議論し「レッドゾーン」措置が扱われています。',
          '国全体の平均統計では隠れてしまっても、特定駅周辺や住宅地区に問題が集中すると、夜間移動への不安や商店街・学校環境の変化を通じて住民の安心感が急速に損なわれます（※2025年年間数値は警察本部管内全体の実績であり、メストレ単独割合ではありません）。'
        ]
      },
      {
        heading: '2. スウェーデンの在留取消法案と日本への示唆',
        paragraphs: [
          '2026年3月のAFP報道では、スウェーデン政府が税金・罰金滞納、行政決定不服従、社会保障悪用などを「まっとうな生活（honest living）」要件に紐づけ在留許可取消を容易にする法案提出を発表しました（※法案発表段階であり施行実績と区別）。',
          'これらは日本が受け入れを続ける手本ではなく、「一度拡大した後に事後的に追放・引き締めを行うことの政治的・行政的コストがいかに重いか」を示す比較教訓です。'
        ]
      }
    ],
    table: {
      caption: '欧州主要事例における制度課題・地域実態の比較（一次報道・公的機関発表に基づく整理）',
      headers: ['国・地域', '確認された主な課題・措置', '段階・データ範囲', '主な出典'],
      rows: [
        ['イタリア・メストレ', '重点地区の特別取締・違法占有検挙・レッドゾーン検討', '2023〜2026年 警察・県庁実施', 'Questura / Prefettura di Venezia'],
        ['スウェーデン', '税・社会保障悪用等を要件に在留許可取消を容易化', '2026年3月 法案提出発表段階', 'AFP (2026-03-25)'],
        ['フランス等', '生活費・燃料高騰、教員不足・老朽化等への抗議・暴動', '地域別の抗議理由差異に留意', '国際報道比較資料'],
        ['日本（参考基準）', '2026年6月末 在留428万人（3.5%）＆永住審査厳格化', '現在進行中', 'AFP＝時事 (2026-10-17)']
      ]
    },
    methodologyNote: '検証ルール注記：世界の全諸国が一斉に停止したと一般化せず、各国ごとの法案段階・管内数値範囲を厳密に区別しています。',
    sources: [
      { label: 'Questura di Venezia 特別取締発表 (2026-07-24)', url: 'https://questure.poliziadistato.it/it/Venezia/articolo/21496a634bd2b7060158916983' },
      { label: 'Prefettura di Venezia 会議公表 (2025-07-22)', url: 'https://prefettura.interno.gov.it/it/prefetture/venezia/comunicati-stampa/conferenza-regionale-dei-prefetti-2272025' },
      { label: 'RAI News 2025年警察活動報告 (2025-12-20)', url: 'https://www.rainews.it/tgr/veneto/video/2025/12/questura-venezia-bilancio-attivita-polizia-2025-in-aumento-i-reati-connessi-alla-violenza-sulle-donne-e9370587-0a1e-430e-ab67-fa1a4f883257.html' }
    ],
    relatedLinks: [
      { label: '日本の団地・地域共生実態（緑町・蕨市）', to: '/analysis/symbiosis/' },
      { label: '宗教規範と日本法の優先順位', to: '/analysis/burial-controversy/' }
    ]
  },

  'burial-controversy': {
    badge: '国会質疑論点＆2023年神戸神社損壊事例の整理',
    title: '【法秩序 vs 宗教規範】土葬問題の背景にある「衝突時の優先順位」と神戸・瑞丘八幡神社損壊事例が示す課題',
    lead: '土葬をめぐる摩擦の根底には「宗教上の戒律と日本の法律・社会慣習が衝突した場合、どちらを最終基準にするのか」という制度設計の問題があります。国会質疑の問題提起と国内事例、教義上の非対称性を整理します。',
    metrics: [
      { label: '国会質疑での中心命題', value: '日本法の優先担保', sub: '宗教規範が法秩序を上回るリスクを入国前後にどう審査するか', accent: 'amber' },
      { label: '国内の神社設備損壊事例', value: '2023年5月 神戸', sub: '瑞丘八幡神社・地蔵3体損壊で逮捕（日本ムスリム協会は非難声明）', accent: 'red' }
    ],
    blocks: [
      {
        heading: '1. 国会質疑における「規範衝突」と動画提示数値の扱い',
        paragraphs: [
          '2026年10月の国会質疑（文字起こし記録）では、宗教上の教えと日本の法律が衝突した場合に日本法を優先する意思があるかを入国・在留段階でどう確認するかが追及されました。動画・質疑内では「約65%がコーランを法律より優先する」という主張が紹介されていますが、調査名・対象国・設問文等の原典照合を待って統計値として確定する扱いにしています。',
          '問題の本質は「合わない文化・ルールを持つ人に日本の慣習変更を迫るのではなく、入国・在留前に両立可否を評価し、衝突リスクの高い受け入れを無理に進めない」という予防視点にあります。'
        ]
      },
      {
        heading: '2. 神戸市垂水区・瑞丘八幡神社（2023年5月）および教義的非対称性',
        paragraphs: [
          '2023年5月3日には神戸市垂水区の瑞丘八幡神社で賽銭箱や手水舎・近隣の地蔵3体が壊され、ガンビア国籍の男が逮捕（地蔵については後に不起訴報道あり）、関係者からは「神様はアッラーしかいない」「ここで祈るな」といった発言があったと神戸新聞等で報じられました。一方、日本ムスリム協会（2023年5月25日）は居住国の法令遵守と他者信仰の尊重を掲げ、故意の損壊を非難する声明を公表しています。',
          'また「神社でアッラーに祈る」ことと「モスクで天照大神に祈る」ことは、唯一神以外の礼拝を認めない教義上対称ではありません。異なる規範体系を前提とする文化同士では、相互不干渉や事前適合確認なしに同居を進めることの危うさが現れています。'
        ]
      }
    ],
    methodologyNote: '区分注記：動画内で引用された「約65%」という主張は原典調査の照合項目として記載しており、特定宗教の全信者の態度や組織的関与を一括認定するものではありません。',
    sources: [
      { label: '神戸新聞報道 瑞丘八幡神社事件 (2023-05-23)', url: 'https://www.kobe-np.co.jp/news/jiken/202305/0016384108.shtml' },
      { label: '一般社団法人 日本ムスリム協会', url: 'https://www.muslim.or.jp/' },
      { label: '宗教情報リサーチセンター', url: 'https://www.rirc.or.jp/' }
    ],
    relatedLinks: [
      { label: '神道・日本の精神文化と「棲み分け」結論', to: '/analysis/conclusion/' },
      { label: '欧州・メストレとスウェーデン法案', to: '/analysis/uk-immigration-lesson/' }
    ]
  },

  'conclusion': {
    badge: '思想と秩序の基盤｜「相互尊重」の成立条件と守るべき日本文化',
    title: 'なぜ「相互尊重による共存」では解決しないのか――神道に根づく感謝・秩序の文化と海外からの評価',
    lead: '共通ルールに従う意思が前提とならない場面では、「互いに尊重し合えばよい」という抽象論は解決策になりません。日本社会が守り抜くべき高信頼社会の精神的土台を整理します。',
    metrics: [
      { label: '日本の治安・秩序を支える文化', value: '感謝・畏敬・和', sub: '八百万の神観、「いただきます」、日常の規律と共同体意識', accent: 'emerald' },
      { label: '海外インタビュー共通評価', value: '礼儀・清潔・安全', sub: '欧州・東南アジア複数国の取材で共通して称賛される無形資産', accent: 'sky' }
    ],
    blocks: [
      {
        heading: '1. 「相互尊重による共存」が成り立つ厳格な条件',
        paragraphs: [
          '「異なる文化を持つ人々がルールを尊重して暮らす形もあり得る」という議論は、双方がホスト国の法律と共通ルールを守る意思を持つケースに限り成立します。法や規律を守る意思がない主体、あるいは現地法より独自の規範を上位に置く主体が存在する条件では、理念としての相互尊重を掲げるだけでは違反と被害を防げません。'
        ]
      },
      {
        heading: '2. 西洋的一神教の枠を超えた日本の精神文化と世界の評価',
        paragraphs: [
          '日本の神道的な精神文化は、単一の教典や排他的教義への服従ではなく、自然の恵みや生命、道具、祖先への「感謝」（食前の「いただきます」、初詣、墓参り等）を行動として日常に組み込んできた点に特徴があります。',
          'スペイン（バルセロナ）、スウェーデン、ギリシャ、チェコ（プラハ）、インドネシア、フィリピン等で行われた海外インタビューでも、日本への評価として最も多く語られるのは「礼儀正しさ」「他者への敬意」「公共交通の静粛さや清潔さ」「共同体意識」です。この無形資産を急激な規模拡大によって損なわない政策選択こそが結論です。'
        ]
      }
    ],
    methodologyNote: '区分注記：海外評価は各国で行われたインタビュー動画記録（英語ASR要約等）で確認された共通評価軸であり、各国国民全体の統計的代表ではありません。',
    relatedLinks: [
      { label: '宗教規範と日本法の優先順位', to: '/analysis/burial-controversy/' },
      { label: '外国人比率1%案と事前予防モデル', to: '/analysis/simulation-model/' }
    ]
  },

  'national-security': {
    badge: '2026年11月最新 安保・経済安保・日中世論データ補強',
    title: '【2026安保最新】尖閣連続確認335日・JIIA沖縄影響工作分析・JTロシア法人一時管理・中国邦人拘束17人と世論データ',
    lead: '国内の土地・防諜法制の遅れに加え、2025〜2026年にかけて公的機関・外交青書・防衛白書等で明確化された最新の安全保障・対外リスクデータを体系的に追加します。',
    metrics: [
      { label: '尖閣接続水域 連続確認日数', value: '335日', sub: '2024年11月〜2025年10月（2026年版防衛白書記載）', accent: 'red' },
      { label: '中国「国家安全」邦人拘束数', value: '累計17人', sub: '2015年5月以降（2025年末時点5人拘束中・2026年外交青書）', accent: 'amber' },
      { label: '日中共同世論（対日否定・重要視）', value: '87.7% / 59.6%', sub: '中国側「日本に良くない印象」87.7%、「関係重要でない」59.6%', accent: 'purple' }
    ],
    blocks: [
      {
        heading: '1. 沖縄基地問題をめぐる複合リスク：JIIA分析とフィリピン撤退の教訓',
        paragraphs: [
          '日本国際問題研究所（JIIA・2026年11月6日）は、中国が2012〜13年ごろから沖縄の独自アイデンティティを利用したナラティブ工作（「曖昧性の創出」）を国営メディア・統一戦線工作部ネットワーク等で展開し、国際社会に沖縄主権の曖昧さを流布して日米同盟への対抗を図っている旨を指摘しています。',
          '1991年にフィリピン上院が米軍基地協定更新を否決し米軍が撤退（1992年完了）した後、1995年のミスチーフ礁占拠や2012年のスカボロー礁での実効排除に至った歴史的経緯は、前方抑止力の空白が周辺環境を変える教訓を示しています。一方、沖縄県内でも軍用地主約52,400人（約9割が県内在住）、駐留軍従業員8,922人、基地関連収入2,712億円（県民総所得の5.5%）という現実の経済利害が存在する点も見落とせません。'
        ]
      },
      {
        heading: '2. 権威主義国家での企業資産介入・邦人拘束・世論構造',
        paragraphs: [
          'ロシアでは2026年11月5日の大統領令によりJT傘下JTI製造会社4社が一時管理対象となったほか、サハリン1/2の運営体制変更や2025年8月の日本センター全閉鎖決定など、契約外の国家介入リスクが顕在化しています。',
          '中国では2025年7月のアステラス製薬社員への実刑判決（懲役3年6か月）を含め外務省2026年外交青書で2015年以降の拘束17人が記録されており、さらに第20回日中共同世論調査（2024年12月報道）では中国側の対日否定的印象が87.7%（前年比+24.8pt）、日中関係は「重要ではない」が過去最高の59.6%（+40.5pt）に達しています。'
        ]
      }
    ],
    methodologyNote: '区分注記：防衛白書・外交青書・JIIA・JT公式・沖縄県資料等の確認済み公的数値と、将来の戦略リスク評価（危険シナリオ）を区別して記載しています。',
    sources: [
      { label: 'JIIA『曖昧性の創出』沖縄アイデンティティ分析 (2026-11-06)', url: 'https://www.jiia.or.jp/jpn/report/2026/11/strategic_comment_2026-22.html' },
      { label: '外務省 2026年外交青書・中国の邦人拘束事案', url: 'https://www.mofa.go.jp/mofaj/gaiko/bluebook/2026/html/chapter2_02_02.html' },
      { label: 'JT公式プレスリリース ロシア子会社一時管理 (2026-11-06 PDF)', url: 'https://www.jti.co.jp/investors/library/press_releases/pdf/2026/20261106_01.pdf' },
      { label: 'CSIS AMTI Scarborough Shoal Analysis', url: 'https://amti.csis.org/scarborough-shoal-red-line/' },
      { label: '沖縄県「米軍基地と沖縄県の経済、財政」資料', url: 'https://www.pref.okinawa.lg.jp/_res/projects/default_project/_page_/001/040/380/11_20260331_qap20p21.pdf' }
    ],
    relatedLinks: [
      { label: '外国人・外国資本による土地買収規制の盲点', to: '/analysis/land-acquisition/' },
      { label: '帰化・永住要件の逆転と安保課題', to: '/analysis/naturalization-paradox/' }
    ]
  },

  'symbiosis': {
    badge: '地域生活環境・報道検証記録｜蕨市・川口市周辺の証言整理',
    title: '【生活環境の現場】埼玉県蕨市・川口市周辺の住民懸念と「短時間の街頭取材」だけで安全を断定する限界',
    lead: '愛知県西尾市・県営緑町住宅の事例に加え、埼玉県蕨市・川口市周辺の居住環境をめぐる動画文字起こし・住民証言の論点を「個別犯罪統計」とは明確に分離した生活環境記録として整理します。',
    metrics: [
      { label: '記録区分上の重要原則', value: '犯罪統計と別管理', sub: '警察発表ベースの犯罪件数（470件超DB）には混入させず独立記録', accent: 'sky' },
      { label: '住民証言で挙がる生活摩擦', value: '駅前・ごみ・滞留・学校', sub: '統計に表れにくい体感治安とコミュニティ維持負担の実態', accent: 'amber' }
    ],
    blocks: [
      {
        heading: '「被害はない」と印象づける短時間取材への批判と住民実感',
        paragraphs: [
          '2026年10月29日記録の現地検証動画では、一部メディアの短時間街頭取材で「問題なく住みやすい」と受け取れる映像が放送された点に対し、地域全体や夜間・生活現場の実態を代表していないとする批判的証言が示されました。',
          '住民側の懸念としては、①駅前での声かけ・ナンパへの恐怖感や不安、②ごみ出しルールをめぐる摩擦、③店舗・コンビニ・ゲームセンター周辺での滞留、④路上駐車・店舗、⑤学校における児童・生徒構成の変化による地域の安心感低下などが具体的に挙げられています。'
        ]
      },
      {
        heading: '個別犯罪数と「生活上の負荷」をどちらも切り捨てない視点',
        paragraphs: [
          '特定の事件日・警察発表・報道記事がない住民証言を犯罪データベースに加算すべきではありませんが、検挙件数に入らない段階の日常的摩擦や不安の存在もまた現実の政策評価対象です。両者を正確に分けて記録することが客観的な実態把握につながります。'
        ]
      }
    ],
    methodologyNote: '資料区分注記：本項は2026年10月29日受領の動画文字起こしに基づく地域生活実感・報道批判の整理であり、個別事件の確定犯罪件数へは加算していません。',
    relatedLinks: [
      { label: 'イタリア・メストレ等 欧州の集中地区事例', to: '/analysis/uk-immigration-lesson/' },
      { label: '埼玉県・国籍別の一次報道アーカイブ', to: '/analysis/crime-news/pref/saitama/' }
    ]
  },

  'borderless-welfare': {
    badge: '一次学術出典＆オランダ議会政府回答の直接参照補強',
    title: '【一次原典ガイド】IZA Discussion Paper 17569・オランダ議会政府回答と日本版長期純財政評価の必要性',
    lead: 'オランダ研究（Borderless Welfare State）を政策論議で検証できるよう、原著ディスカッションペーパー・PDF・オランダ議会の政府回答記録への一次リンクと、日本における推計設計上の要件を追記します。',
    metrics: [
      { label: '原著公開シリーズ', value: 'IZA DP 17569', sub: '入国動機・出身地域・第1/第2世代別 生涯純財政貢献推計', accent: 'sky' },
      { label: '議会公式記録', value: '2021Z13767', sub: 'オランダ下院質問（Kamervraag）と政府公式回答', accent: 'emerald' }
    ],
    blocks: [
      {
        heading: '「外国人全体の平均」ではなく動機・出身・世代・滞在期間で分ける意義',
        paragraphs: [
          'オランダ研究が示した最大の教訓は、外国人・移民の財政影響を「平均値一括り」にすると、労働移住のプラス効果と庇護・家族帯同・一部地域の長期マイナス効果が打ち消し合って実態が見えなくなる点です。',
          '日本の政策論議でも、オランダの数値を機械的に転用するのではなく、税・社会保険料納付から医療・年金・介護・教育・生活保護等の公的支出を差し引いた生涯純財政寄与を、在留資格・出身地域・世帯構成・滞在期間別に透明なモデルで公開・検証することが政府に求められます。'
        ]
      }
    ],
    methodologyNote: '出典ガイド：以下はディスカッションペーパーおよびオランダ議会質問記録の直接公開URLです。',
    sources: [
      { label: 'IZA Discussion Paper No. 17569 (RePEc / IDEAS)', url: 'https://ideas.repec.org/p/iza/izadps/dp17569.html' },
      { label: '原著PDF: Borderless Welfare State', url: 'https://assets.jungefreiheit.de/2023/12/Borderless_Welfare_State-2.pdf' },
      { label: 'オランダ議会質問・政府回答記録 (2021Z13767)', url: 'https://www.openkamer.org/kamervraag/2021Z13767/' }
    ],
    relatedLinks: [
      { label: '日本の国保収納率63% vs 全体93%検証', to: '/analysis/social-security/' },
      { label: '人手不足の6分解と南アフリカ比較', to: '/analysis/labor-mismatch/' }
    ]
  }
};

interface NotionSeoAddendumProps {
  pageKey: NotionAddendumKey;
}

export const NotionSeoAddendum: React.FC<NotionSeoAddendumProps> = ({ pageKey }) => {
  const cfg = ADDENDUM_DATA[pageKey];
  const faqs = (notionAddendumFaqs as Record<string, Array<{ q: string; a: string }>>)[pageKey] || [];

  if (!cfg) return null;

  return (
    <section
      id={`notion-addendum-${pageKey}`}
      aria-label={cfg.title}
      className="my-10 bg-slate-900/80 border border-slate-700/70 rounded-2xl p-6 sm:p-8 text-slate-200 shadow-2xl space-y-6"
    >
      <div className="border-b border-slate-700/80 pb-4">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-950/70 border border-amber-700/50 text-amber-300 text-xs font-semibold mb-3">
          {cfg.badge}
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug mb-2">
          {cfg.title}
        </h2>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          {cfg.lead}
        </p>
      </div>

      {cfg.metrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cfg.metrics.map((m, idx) => {
            const cls = ACCENT_MAP[m.accent || 'amber'];
            const [borderCls, textCls] = cls.split(' ');
            return (
              <div key={idx} className={`bg-slate-950/80 border ${borderCls} rounded-xl p-4`}>
                <div className="text-xs text-slate-400 mb-1">{m.label}</div>
                <div className={`text-2xl sm:text-3xl font-black ${textCls} mb-1`}>{m.value}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{m.sub}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-5">
        {cfg.blocks.map((block, idx) => (
          <div key={idx} className="space-y-2.5">
            <h3 className="text-base sm:text-lg font-bold text-amber-300">{block.heading}</h3>
            {block.paragraphs.map((p, pIdx) => (
              <p key={pIdx} className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {p}
              </p>
            ))}
            {block.bullets && block.bullets.length > 0 && (
              <ul className="space-y-1.5 pl-4 text-sm text-slate-300 list-disc">
                {block.bullets.map((b, bIdx) => (
                  <li key={bIdx} className="leading-relaxed">
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {cfg.table && (
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 overflow-x-auto">
          <div className="text-xs sm:text-sm font-bold text-slate-200 mb-3">{cfg.table.caption}</div>
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-300">
                {cfg.table.headers.map((h, idx) => (
                  <th key={idx} className="py-2.5 pr-4 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {cfg.table.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-2.5 pr-4 align-top ${cIdx === 0 ? 'font-semibold text-amber-200 whitespace-nowrap' : ''}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cfg.sources && cfg.sources.length > 0 && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            参照一次資料・公的出典リンク
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm">
            {cfg.sources.map((src, idx) => (
              <li key={idx}>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-300 hover:text-sky-200 underline decoration-sky-700/60 break-all"
                >
                  {src.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-400 bg-slate-950/50 border border-slate-800/80 rounded-lg px-3.5 py-2.5 leading-relaxed">
        {cfg.methodologyNote}
      </p>

      {faqs.length > 0 && (
        <div className="pt-2 border-t border-slate-800">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3">
            このデータ・論点に関するよくある質問（FAQ）
          </h3>
          <dl className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-slate-950/75 border border-slate-800 rounded-xl p-4">
                <dt className="font-bold text-amber-300 text-sm mb-1.5">Q. {faq.q}</dt>
                <dd className="text-slate-300 text-xs sm:text-sm leading-relaxed">A. {faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {cfg.relatedLinks.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {cfg.relatedLinks.map((lnk, idx) => (
            <Link
              key={idx}
              to={lnk.to}
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs text-sky-200 transition-colors"
            >
              {lnk.label} →
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};
