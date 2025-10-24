import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ReportData, VerificationResult } from '../types';
import { generateAudioSummary, generateOpenRouterAudioSummary } from '../services/geminiService';
import { generateAASBPdf } from '../services/pdfGenerator';
import KPICard from './KPICard';
import ComparisonChart from './ComparisonChart';
import ComparisonTable from './ComparisonTable';
import VerificationCertificate from './VerificationCertificate';

interface ReportDisplayProps {
  data: ReportData;
  verification: VerificationResult;
  onReset: () => void;
  apiConfig: {
      provider: 'gemini' | 'openrouter';
      apiKey: string;
      model: string;
      voiceModel?: string;
  };
}

const SummaryRow: React.FC<{ title: string; values: any; isEditing: boolean }> = ({ title, values, isEditing }) => {
    if (!values) return null;
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    const editableClass = isEditing ? 'p-1 rounded outline-dashed outline-1 outline-sky-500' : '';
    return (
      <div className="bg-gray-700/50 rounded-b-lg">
        <table className="w-full text-sm">
          <tbody>
            <tr className="font-bold">
              <th scope="row" className="px-6 py-3 text-left font-semibold text-gray-200 whitespace-nowrap">
                <span contentEditable={isEditing} suppressContentEditableWarning={true} className={editableClass}>
                    {title}
                </span>
                {values.noteRef && (
                  <a href={`#note-${values.noteRef}`} className="ml-2 text-sky-400 hover:text-sky-300 no-underline">
                    <sup className="text-xs font-mono p-1 rounded-sm bg-sky-900/50">[{values.noteRef}]</sup>
                  </a>
                )}
              </th>
              <td 
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                className={`px-6 py-3 text-right font-mono ${values.amount2025 < 0 ? 'text-red-300' : 'text-white'} ${editableClass}`}
              >
                {formatCurrency(values.amount2025)}
              </td>
              <td 
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                className={`px-6 py-3 text-right font-mono ${values.amount2024 < 0 ? 'text-red-300' : 'text-gray-300'} ${editableClass}`}
              >
                {formatCurrency(values.amount2024)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
};

const NotesSection: React.FC<{ notes: any[] | undefined, title: string }> = ({ notes, title }) => {
    if (!notes || notes.length === 0) {
      return null;
    }
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
        <div className="space-y-3 pl-4 border-l-2 border-gray-700">
          {notes.sort((a, b) => a.id - b.id).map((note) => (
            <div key={note.id} id={`note-${note.id}`} className="flex items-start">
              <div className="flex-shrink-0 pt-1 text-sm font-bold text-sky-500 mr-2">{note.id}.</div>
              <p className="text-gray-400 text-sm leading-relaxed">{note.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
};

const ReportDisplay: React.FC<ReportDisplayProps> = ({ data, verification, onReset, apiConfig }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingAASBPdf, setIsGeneratingAASBPdf] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'verification'>('report');

  const { incomeStatement, balanceSheet, cashFlowStatement } = data;

  const handleDownloadPdf = () => {
    const input = reportRef.current;
    if (!input) return;

    // Temporarily set editing to false to hide outlines during PDF generation
    const wasEditing = isEditing;
    if (wasEditing) setIsEditing(false);

    // Allow state to update before capturing
    setTimeout(() => {
        html2canvas(input, { 
            useCORS: true,
            scale: 1.5,
            backgroundColor: '#111827'
        }).then((canvas) => {
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
            pdf.save('financial-report.pdf');

            // Restore editing state
            if (wasEditing) setIsEditing(true);
        });
    }, 100);
  };

  const handleDownloadAASBPdf = async () => {
    setIsGeneratingAASBPdf(true);
    try {
      // Use a timeout to allow the UI to update to the loading state before the blocking PDF generation begins
      await new Promise(resolve => setTimeout(resolve, 50));
      generateAASBPdf(data);
    } catch (e) {
      console.error("Failed to generate AASB PDF", e);
      // You could set an error state here to show a message to the user
    } finally {
      setIsGeneratingAASBPdf(false);
    }
  };

  const handleDownloadAudio = async () => {
    setIsGeneratingAudio(true);
    setAudioError(null);
    try {
        let audioBlob: Blob;
        let fileExtension = 'wav';
        if (apiConfig.provider === 'openrouter') {
            audioBlob = await generateOpenRouterAudioSummary(data.summary, apiConfig);
            // Infer extension from blob type or default
            fileExtension = audioBlob.type.split('/')[1] || 'mp3';
        } else {
            audioBlob = await generateAudioSummary(data.summary);
            fileExtension = 'wav';
        }

        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-summary.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        setAudioError(message);
    } finally {
        setIsGeneratingAudio(false);
    }
  };

  const getVerificationStatusColor = () => {
    switch(verification.overallStatus) {
        case 'Passed': return 'text-green-400';
        case 'Passed with Warnings': return 'text-yellow-400';
        case 'Failed': return 'text-red-400';
        default: return 'text-gray-400';
    }
  }

  return (
    <div className="animate-fade-in">
        {/* Top Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">Generated Report</h2>
                <div className={`text-sm font-semibold py-1 px-3 rounded-full flex items-center gap-2 ${getVerificationStatusColor().replace('text-', 'bg-').replace('-400', '-900/50')}`}>
                   <span className={getVerificationStatusColor()}>●</span>
                   Verification: {verification.overallStatus}
                </div>
            </div>
            <div className="flex flex-wrap justify-end gap-4">
                <button
                    onClick={onReset}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Analyze New Reports
                </button>
                <button
                    onClick={handleDownloadAudio}
                    disabled={isGeneratingAudio}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:bg-teal-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                     {isGeneratingAudio ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Generating...
                        </>
                     ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM15 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z" />
                            </svg>
                            Download Audio
                        </>
                     )}
                </button>
                {activeTab === 'report' && (
                    <>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                          >
                            {isEditing ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                            )}
                            {isEditing ? 'Finish Editing' : 'Edit Report'}
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            Download Report PDF
                        </button>
                         <button
                            onClick={handleDownloadAASBPdf}
                            disabled={isGeneratingAASBPdf}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:bg-indigo-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isGeneratingAASBPdf ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                    Download AASB PDF (2025)
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
        {audioError && <div className="text-center mb-4 bg-red-900/50 border border-red-700 p-3 rounded-lg text-red-300 text-sm">{`Audio Error: ${audioError}`}</div>}

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                    onClick={() => setActiveTab('report')}
                    className={`${activeTab === 'report' ? 'border-sky-500 text-sky-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                    Financial Report
                </button>
                <button
                    onClick={() => setActiveTab('verification')}
                    className={`${activeTab === 'verification' ? 'border-sky-500 text-sky-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                >
                    Verification Certificate
                    {verification.overallStatus === 'Failed' && <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>}
                    {verification.overallStatus === 'Passed with Warnings' && <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>}
                </button>
            </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'report' ? (
             <div ref={reportRef} className="space-y-8 p-4 bg-gray-900">
              {/* Summary Section */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h2 className="text-2xl font-bold text-sky-400 mb-3">Financial Summary</h2>
                <p 
                  contentEditable={isEditing}
                  suppressContentEditableWarning={true}
                  className={`text-gray-300 leading-relaxed ${isEditing ? 'p-2 rounded outline-dashed outline-1 outline-sky-500' : ''}`}
                >
                  {data.summary}
                </p>
              </div>
              
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
                    <ComparisonTable items={incomeStatement.revenue} isEditing={isEditing} />
                    <SummaryRow title="Gross Profit" values={incomeStatement.grossProfit} isEditing={isEditing} />
                    <h3 className="text-lg font-semibold text-sky-400 mt-6 mb-2">Operating Expenses</h3>
                    <ComparisonTable items={incomeStatement.expenses} isEditing={isEditing} />
                    <SummaryRow title="Operating Income" values={incomeStatement.operatingIncome} isEditing={isEditing} />
                    <SummaryRow title="Net Profit/Loss" values={incomeStatement.netProfit} isEditing={isEditing} />
                    <NotesSection notes={incomeStatement.notes} title="Notes to Income Statement" />
                </div>

                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4">Balance Sheet</h2>
                    <h3 className="text-lg font-semibold text-sky-400 mt-4 mb-2">Assets</h3>
                    <p className="text-md font-semibold text-gray-300 mt-4 mb-2 pl-4">Current Assets</p>
                    <ComparisonTable items={balanceSheet.currentAssets} isEditing={isEditing} />
                    <p className="text-md font-semibold text-gray-300 mt-4 mb-2 pl-4">Non-Current Assets</p>
                    <ComparisonTable items={balanceSheet.nonCurrentAssets} isEditing={isEditing} />
                    <SummaryRow title="Total Assets" values={balanceSheet.totalAssets} isEditing={isEditing} />

                    <h3 className="text-lg font-semibold text-sky-400 mt-6 mb-2">Liabilities & Equity</h3>
                     <p className="text-md font-semibold text-gray-300 mt-4 mb-2 pl-4">Current Liabilities</p>
                    <ComparisonTable items={balanceSheet.currentLiabilities} isEditing={isEditing} />
                     <p className="text-md font-semibold text-gray-300 mt-4 mb-2 pl-4">Non-Current Liabilities</p>
                    <ComparisonTable items={balanceSheet.nonCurrentLiabilities} isEditing={isEditing} />
                    <SummaryRow title="Total Liabilities" values={balanceSheet.totalLiabilities} isEditing={isEditing} />
                     <p className="text-md font-semibold text-gray-300 mt-4 mb-2 pl-4">Equity</p>
                    <ComparisonTable items={balanceSheet.equity} isEditing={isEditing} />
                    <SummaryRow title="Total Equity" values={balanceSheet.totalEquity} isEditing={isEditing} />
                    <NotesSection notes={balanceSheet.notes} title="Notes to Balance Sheet" />
                </div>

                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4">Statement of Cash Flows</h2>
                    <h3 className="text-lg font-semibold text-sky-400 mt-4 mb-2">Operating Activities</h3>
                    <ComparisonTable items={cashFlowStatement.operatingActivities} isEditing={isEditing} />
                    <h3 className="text-lg font-semibold text-sky-400 mt-6 mb-2">Investing Activities</h3>
                    <ComparisonTable items={cashFlowStatement.investingActivities} isEditing={isEditing} />
                    <h3 className="text-lg font-semibold text-sky-400 mt-6 mb-2">Financing Activities</h3>
                    <ComparisonTable items={cashFlowStatement.financingActivities} isEditing={isEditing} />
                    <SummaryRow title="Net Change in Cash" values={cashFlowStatement.netChangeInCash} isEditing={isEditing} />
                    <NotesSection notes={cashFlowStatement.notes} title="Notes to Statement of Cash Flows" />
                </div>
            </div>
        ) : (
            <VerificationCertificate certificate={verification} />
        )}
    </div>
  );
};

export default ReportDisplay;
