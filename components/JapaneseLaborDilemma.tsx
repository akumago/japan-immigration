
import React from 'react';
import { motion } from 'framer-motion';

const JapanesePolicy = {
  title: '日本人労働者への政策',
  description: '「働き方改革」を推進する一方で、「103万円の壁」などの制度が依然として存在します。',
  points: [
    { title: '収入の抑制', text: 'パートタイム労働者が年収を一定額に抑えようとするため、労働供給が制限され、世帯収入の増加が妨げられます。' },
    { title: 'キャリア形成の阻害', text: '就労時間を制限することで、スキルアップやキャリア形成の機会を失う可能性があります。' },
    { title: '少子化への影響', text: '世帯収入が伸び悩むことは、結婚や子育てといったライフプランの実現を困難にし、少子化を助長する一因となり得ます。' },
  ],
};

const ForeignerPolicy = {
  title: '外国人雇用への政策',
  description: '一方で、外国人労働者を雇用する企業に対しては、手厚い助成金や補助金が用意されています。',
  points: [
    { title: '業務改善助成金', text: '最低賃金引き上げと設備投資を条件に、最大70万円（過去の特例コース）などが助成されます。' },
    { title: '人材確保等支援助成金', text: '外国人労働者の職場定着支援で、最大72万円が支給される場合があります。' },
    { title: '地方自治体の補助金', text: '例として、社宅修繕費に最大70万円を補助する自治体も存在します。' },
  ],
};

const JapaneseLaborDilemma: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { x: -50, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 50 } },
  };

  const itemVariantsRight = {
    hidden: { x: 50, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 50 } },
  };

  const PolicyCard = ({ title, description, points, variants }) => (
    <motion.div variants={variants} className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 flex-1">
      <h3 className="text-2xl font-serif font-bold text-center text-gray-200 mb-4">{title}</h3>
      <p className="text-center text-gray-400 mb-6 h-20">{description}</p>
      <div className="space-y-4">
        {points && points.map((point, index) => (
          <div key={index} className="bg-gray-900/70 p-4 rounded-lg">
            <h4 className="font-bold text-blue-400">{point.title}</h4>
            <p className="text-sm text-gray-400">{point.text}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
      className="my-12"
    >
      <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch">
        <PolicyCard {...JapanesePolicy} variants={itemVariants} />
        <PolicyCard {...ForeignerPolicy} variants={itemVariantsRight} />
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ delay: 0.5 }}
        className="mt-12 p-6 bg-gray-800 border border-red-500/50 rounded-lg"
      >
        <h3 className="text-xl font-bold text-center text-red-400">考察：政策の矛盾と影響</h3>
        <p className="mt-4 text-gray-300 text-center max-w-3xl mx-auto">
          日本人労働者の収入を抑制する制度が温存される一方で、外国人雇用には補助金が投入されるという構造は、多くの国民にとって「政策の不均衡」と映りかねません。この政策の矛盾は、国内の労働市場における賃金上昇圧力を削ぎ、結果として「自国窮乏化」をさらに深刻化させる要因となっている可能性があります。
        </p>
      </motion.div>
    </motion.div>
  );
};

export default JapaneseLaborDilemma;
