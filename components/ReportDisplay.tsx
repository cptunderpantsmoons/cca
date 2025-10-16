import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ReportData, SingleFinancialValue, FinancialItem } from '../types';
import KPICard from './KPICard';
import ComparisonChart from './ComparisonChart';
import ComparisonTable from './ComparisonTable';

interface ReportDisplayProps {
  data: ReportData;
  onReset: () => void;
}

const SummaryRow: React.FC<{ title: string; values: SingleFinancialValue }> = ({ title, values }) => {
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    return (
      <div className="bg-gray-700/50 rounded-b-lg">
        <table className="w-full text-sm">
          <tbody>
            <tr className="font-bold">
              <th scope="row" className="px-6 py-3 text-left font-semibold text-gray-200 whitespace-nowrap">
                {title}
              </th>
              <td className={`px-6 py-3 text-right font-mono ${values.amount2025 < 0 ? 'text-red-300' : 'text-white'}`}>
                {formatCurrency(values.amount2025)}
              </td>
              <td className={`px-6 py-3 text-right font-mono ${values.amount2024 < 0 ? 'text-red-300' : 'text-gray-300'}`}>
                {formatCurrency(values.amount2024)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
};

const ReportDisplay: React.FC<ReportDisplayProps> = ({ data, onReset }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const { incomeStatement, balanceSheet, cashFlowStatement } = data;

  const handleDownloadPdf = () => {
    const input = reportRef.current;
    if (!input) return;

    html2canvas(input, { 
        useCORS: true,
        scale: 2, // Higher scale for better quality
        backgroundColor: '#111827' // Match the app's dark background
    }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('financial-report.pdf');
    });
  };


  return (
    <div className="animate-fade-in">
        <div className="flex justify-end gap-4 mb-4">
            <button
                onClick={onReset}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Analyze New Reports
            </button>
            <button
                onClick={handleDownloadPdf}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download PDF
            </button>
        </div>
        <div ref={reportRef} className="space-y-8 p-4 bg-gray-900">
          {/* Summary Section */}
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold text-sky-400 mb-3">AI Financial Summary</h2>
            <p className="text-gray-300 leading-relaxed">{data.summary}</p>
          </div>
          
          {/* Detailed Notes Section */}
          {data.notes && data.notes.length > 0 && (
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
              <h2 className="text-2xl font-bold text-sky-400 mb-4">Detailed Analyst Notes</h2>
              <div className="space-y-4">
                {data.notes.map((note, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-8 pt-1 text-lg font-bold text-sky-500">{index + 1}.</div>
                    <div className="flex-grow">
                      <h3 className="text-lg font-semibold text-gray-100">{note.title}</h3>
                      <p className="text-gray-300 leading-relaxed mt-1">{note.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KPIs Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Key Performance Indicators</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.kpis.map((kpi) => (
                <KPICard key={kpi.name} kpi={kpi} />
              ))}
            </div>
          </div>

          {/* Visualizations Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h2 className="text-2xl font-bold text-center mb-4">Income Statement</h2>
                <ComparisonChart data={[ { item: 'Revenue', ...incomeStatement.revenue.reduce((acc, cv) => ({ amount2024: acc.amount2024 + cv.amount2024, amount2025: acc.amount2025 + cv.amount2025 }), {amount2024: 0, amount2025: 0})}, { item: 'Net Profit', ...incomeStatement.netProfit } ]} />
            </div>
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h2 className="text-2xl font-bold text-center mb-4">Balance Sheet</h2>
                 <ComparisonChart data={[ { item: 'Total Assets', ...balanceSheet.totalAssets }, { item: 'Total Liabilities', ...balanceSheet.totalLiabilities }, { item: 'Total Equity', ...balanceSheet.totalEquity } ]} />
            </div>
             <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h2 className="text-2xl font-bold text-center mb-4">Cash Flow</h2>
                 <ComparisonChart data={[ { item: 'Operating', ...cashFlowStatement.operatingActivities.reduce((acc, cv) => ({ amount2024: acc.amount2024 + cv.amount2024, amount2025: acc.amount2025 + cv.amount2025 }), {amount2024: 0, amount2025: 0}) }, { item: 'Investing', ...cashFlowStatement.investingActivities.reduce((acc, cv) => ({ amount2024: acc.amount2024 + cv.amount2024, amount2025: acc.amount2025 + cv.amount2025 }), {amount2024: 0, amount2025: 0}) }, { item: 'Financing', ...cashFlowStatement.financingActivities.reduce((acc, cv) => ({ amount2024: acc.amount2024 + cv.amount2024, amount2025: acc.amount2025 + cv.amount2025 }), {amount2024: 0, amount2025: 0}) } ]} />
            </div>
          </div>
          
          {/* Data Tables Section */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h2 className="text-2xl font-bold mb-4">Income Statement</h2>
                <h3 className="text-lg font-semibold text-sky-400 mt-4 mb-2">Revenue</h3>
                <ComparisonTable items={incomeStatement.revenue} />
                <SummaryRow title="Gross Profit" values={incomeStatement.grossProfit} />
                <h3 className="text-lg font-semibold text-sky-400 mt-6 mb-2">Operating Expenses</h3>
                <ComparisonTable items={incomeStatement.expenses} />
                <SummaryRow title="Operating Income" values={incomeStatement.operatingIncome} />
                <SummaryRow title="Net Profit/Loss" values={incomeStatement.netProfit} />
            </div>

            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h2 className="text-2xl font-bold mb-4">Balance Sheet</h2>
                <h3 className="text-lg font-semibold text-sky-400 mt-4 mb-2">Assets</h3>
                <p className="text-md font-semibold text-gray-300 mt-4 mb-2 pl-4">Current Assets</p>
                <ComparisonTable items={balanceSheet.currentAssets} />
                <p className="text-md font-semibold text-gray-300 mt-4 mb-2 pl-4">Non-Current Assets</p>
                <ComparisonTable items={balanceSheet.nonCurrentAssets} />
                <SummaryRow title="Total Assets" values={balanceSheet.totalAssets} />

                <h3 className="text-lg font-semibold text-sky-400 mt-6 mb-2">Liabilities & Equity</h3>
                 <p className="text-md font-semibold text-gray-300 mt-4 mb-2 pl-4">Current Liabilities</p>
                <ComparisonTable items={balanceSheet.currentLiabilities} />
                 <p className="text-md font-semibold text-gray-300 mt-4 mb-2 pl-4">Non-Current Liabilities</p>
                <ComparisonTable items={balanceSheet.nonCurrentLiabilities} />
                <SummaryRow title="Total Liabilities" values={balanceSheet.totalLiabilities} />
                 <p className="text-md font-semibold text-gray-300 mt-4 mb-2 pl-4">Equity</p>
                <ComparisonTable items={balanceSheet.equity} />
                <SummaryRow title="Total Equity" values={balanceSheet.totalEquity} />
            </div>

            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h2 className="text-2xl font-bold mb-4">Statement of Cash Flows</h2>
                <h3 className="text-lg font-semibold text-sky-400 mt-4 mb-2">Operating Activities</h3>
                <ComparisonTable items={cashFlowStatement.operatingActivities} />
                <h3 className="text-lg font-semibold text-sky-400 mt-6 mb-2">Investing Activities</h3>
                <ComparisonTable items={cashFlowStatement.investingActivities} />
                <h3 className="text-lg font-semibold text-sky-400 mt-6 mb-2">Financing Activities</h3>
                <ComparisonTable items={cashFlowStatement.financingActivities} />
                <SummaryRow title="Net Change in Cash" values={cashFlowStatement.netChangeInCash} />
            </div>
        </div>
    </div>
  );
};

export default ReportDisplay;