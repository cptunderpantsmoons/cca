
import React from 'react';
import type { FinancialItem } from '../types';

interface ComparisonTableProps {
  items: FinancialItem[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};


const ComparisonTable: React.FC<ComparisonTableProps> = ({ items }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-400">
        <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
          <tr>
            <th scope="col" className="px-6 py-3">
              Item
            </th>
            <th scope="col" className="px-6 py-3 text-right">
              2025
            </th>
            <th scope="col" className="px-6 py-3 text-right">
              2024
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.item} className="border-b border-gray-700 hover:bg-gray-800/50">
              <th scope="row" className="px-6 py-4 font-medium text-gray-200 whitespace-nowrap">
                {item.item}
              </th>
              <td className={`px-6 py-4 text-right font-mono ${item.amount2025 < 0 ? 'text-red-400' : 'text-white'}`}>
                {formatCurrency(item.amount2025)}
              </td>
              <td className={`px-6 py-4 text-right font-mono ${item.amount2024 < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {formatCurrency(item.amount2024)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;