import React from 'react';
import type { FinancialItem } from '../types';

interface ComparisonTableProps {
  items: FinancialItem[];
  isEditing: boolean;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};


const ComparisonTable: React.FC<ComparisonTableProps> = ({ items, isEditing }) => {
  const editableClass = isEditing ? 'p-1 rounded outline-dashed outline-1 outline-sky-500' : '';
  
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
                <span contentEditable={isEditing} suppressContentEditableWarning={true} className={editableClass}>
                    {item.item}
                </span>
                {item.noteRef && (
                  <a href={`#note-${item.noteRef}`} className="ml-2 text-sky-400 hover:text-sky-300 no-underline">
                    <sup className="text-xs font-mono p-1 rounded-sm bg-sky-900/50">[{item.noteRef}]</sup>
                  </a>
                )}
              </th>
              <td 
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                className={`px-6 py-4 text-right font-mono ${item.amount2025 < 0 ? 'text-red-400' : 'text-white'} ${editableClass}`}
               >
                {formatCurrency(item.amount2025)}
              </td>
              <td 
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                className={`px-6 py-4 text-right font-mono ${item.amount2024 < 0 ? 'text-red-400' : 'text-gray-400'} ${editableClass}`}
              >
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