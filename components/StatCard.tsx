
import React from 'react';
import type { Stat } from '../types';

interface StatCardProps {
  stat: Stat;
}

const StatCard: React.FC<StatCardProps> = ({ stat }) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 flex flex-col items-center text-center transition-all duration-300 hover:border-blue-500 hover:bg-gray-800">
      <div className="text-blue-400 mb-4">{stat.icon}</div>
      <h3 className="text-lg font-bold text-gray-200">{stat.title}</h3>
      <p className="text-4xl font-serif font-extrabold text-blue-400 my-2">{stat.value}</p>
      <p className="text-sm text-gray-400">{stat.description}</p>
    </div>
  );
};

export default StatCard;