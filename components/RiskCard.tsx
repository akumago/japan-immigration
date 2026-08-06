
import React from 'react';
import { motion } from 'framer-motion';

const EconomyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4-4-6-6" /></svg>;
const SocietyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const LawIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const InsuranceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2" /></svg>;
const CompanyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;

export const iconMap: { [key: string]: React.ReactNode } = {
  '1. 経済・労働市場への致命的影響': <EconomyIcon />,
  '2. 社会・文化的摩擦の激化': <SocietyIcon />,
  '3. 法的リスクと制度の悪用': <LawIcon />,
  '4. 国民健康保険制度の維持課題': <InsuranceIcon />,
  '5. 企業側への負担転嫁': <CompanyIcon />,
};

interface RiskCardProps {
  icon: React.ReactNode;
  title: string;
  content: string[];
}

const RiskCard: React.FC<RiskCardProps> = ({ icon, title, content }) => {
  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      className="bg-gray-800/30 p-6 rounded-lg border border-gray-700/50 mb-8 flex gap-6 items-start"
    >
      <div className="mt-1 text-red-400">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-100 mb-3">{title}</h3>
        <ul className="list-disc list-outside space-y-2 pl-5 text-gray-400">
          {content.map((item, index) => (
            <li key={index} className="pl-2">{item}</li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
};

export default RiskCard;
