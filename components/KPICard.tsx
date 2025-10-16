
import React from 'react';
import type { KPI } from '../types';

interface KPICardProps {
  kpi: KPI;
}

const KPICard: React.FC<KPICardProps> = ({ kpi }) => {
  const isPositive = kpi.changePercentage >= 0;
  const isInfinite = !isFinite(kpi.changePercentage);

  const TrendIcon = () => {
    if (isInfinite) return <span className="text-gray-400">-</span>;
    return isPositive ? (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.707-4.293a1 1 0 00-1.414-1.414l-3-3a1 1 0 000-1.414l3-3a1 1 0 101.414 1.414L6.414 9H11a1 1 0 100-2H6.414l2.293-2.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414 0z" clipRule="evenodd" />
         <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM8.707 12.293l3-3a1 1 0 00-1.414-1.414L9 10.586V7a1 1 0 10-2 0v3.586L5.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0z" clipRule="evenodd" />
      </svg>
    );
  };
  
  const formattedChange = isInfinite ? 'N/A' : `${isPositive ? '+' : ''}${kpi.changePercentage.toFixed(1)}%`;

  return (
    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 shadow-md">
      <p className="text-sm text-gray-400">{kpi.name}</p>
      <p className="text-2xl font-bold text-white mt-1">{kpi.value2025}</p>
      <div className="flex items-center justify-between mt-2 text-sm">
        <p className="text-gray-500">vs {kpi.value2024}</p>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${isPositive ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
          <TrendIcon />
          <span className={`${isPositive ? 'text-green-400' : 'text-red-400'}`}>{formattedChange}</span>
        </div>
      </div>
    </div>
  );
};

export default KPICard;