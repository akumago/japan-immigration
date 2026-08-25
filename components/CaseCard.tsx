import React from 'react';
import { Case, CaseType } from '../types';

interface CaseCardProps {
  caseItem: Case;
}

const getBorderColor = (type: CaseType): string => {
    switch (type) {
        case CaseType.Violent:
            return 'border-red-600';
        case CaseType.Theft:
            return 'border-blue-500';
        case CaseType.Fraud:
            return 'border-purple-500';
        case CaseType.Community:
            return 'border-yellow-500';
        case CaseType.NationalSecurity:
            return 'border-gray-400';
        case CaseType.Infrastructure:
            return 'border-green-600';
        case CaseType.Cultural:
            return 'border-pink-500';
        default:
            return 'border-gray-500';
    }
}

const CaseCard: React.FC<CaseCardProps> = ({ caseItem }) => {
  const borderColorClass = getBorderColor(caseItem.type);

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden border-l-8 ${borderColorClass}`}>
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h4 className="text-xl font-bold text-gray-200">{caseItem.title}</h4>
          <span className="text-sm font-semibold bg-gray-600 text-gray-200 px-3 py-1 rounded-full whitespace-nowrap">{caseItem.year}</span>
        </div>
        <p className="text-gray-400 leading-relaxed mb-4">{caseItem.description}</p>
        {caseItem.source && (
          <div className="text-right text-xs text-gray-400 italic">
              Source: {caseItem.source.name} [{caseItem.source.number}]
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseCard;