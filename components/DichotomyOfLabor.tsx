
import React from 'react';
import { motion } from 'framer-motion';

const HopeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const DespairIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const japanHope = {
  title: '日本の「人手不足」希望：本来の姿',
  items: ['賃金上昇の好機', '技術革新の促進', '生産性向上のチャンス'],
  icon: <HopeIcon />,
};

const foreignDespair = {
  title: '海外の「人手余り」絶望：その国の現実',
  items: ['生存競争の激化', '犯罪増加・命の軽視', '「残忍な常識」の形成'],
  icon: <DespairIcon />,
};

const DichotomyOfLabor = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  const Side = ({ title, items, icon }) => (
    <motion.div variants={itemVariants} className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 flex-1">
      <div className="flex items-center justify-center mb-6">{icon}</div>
      <h3 className="text-2xl font-serif font-bold text-center text-gray-200 mb-6">{title}</h3>
      <ul className="space-y-4">
        {items && items.map((item, index) => (
          <li key={index} className="flex items-center">
            <span className="text-lg text-gray-300">{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      className="my-12"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl font-serif font-bold text-blue-400">
          「人手不足」と「人手余り」：労働需給のミスマッチと社会構造への影響
        </h2>
        <p className="mt-4 text-lg text-gray-400 max-w-4xl mx-auto">
          政府と経済界が意図的に混同する「人手不足」と「人手余り」。この二つは全く逆の現実を指し示す。前者は日本の賃金上昇と技術革新の好機であるが、後者は海外における犯罪と絶望の温床である。
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-8 justify-center">
        <Side {...japanHope} />
        <Side {...foreignDespair} />
      </div>
      <div className="text-center mt-12">
        <p className="text-2xl font-serif font-bold text-red-500 animate-pulse">
          亡国への分岐点：日本の「希望」を潰し、海外の「絶望」を輸入している
        </p>
      </div>
    </motion.div>
  );
};

export default DichotomyOfLabor;
