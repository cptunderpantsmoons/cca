
import React, { useState } from 'react';
import type { ReportData } from './types';
import { generateFinancialReport } from './services/geminiService';
import Header from './components/Header';
import ReportDisplay from './components/ReportDisplay';
import FileUpload from './components/FileUpload';

const App: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file2024, setFile2024] = useState<File | null>(null);
  const [file2025, setFile2025] = useState<File | null>(null);

  const handleGenerateReport = async () => {
    if (!file2024 || !file2025) {
      setError("Please upload both financial documents.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setReportData(null);
    try {
      const data = await generateFinancialReport(file2024, file2025);
      setReportData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate report. ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setReportData(null);
    setError(null);
    setFile2024(null);
    setFile2025(null);
    setIsLoading(false);
  };

  const isGeneratorDisabled = !file2024 || !file2025 || isLoading;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        {reportData ? (
          <>
            <ReportDisplay data={reportData} onReset={handleReset} />
          </>
        ) : (
          <>
            {/* Initial Upload View */}
            {!isLoading && (
              <div className="text-center max-w-4xl mx-auto mt-8 animate-fade-in">
                <h2 className="text-3xl font-bold text-white mb-4">Financial Report Generation</h2>
                <p className="text-lg text-gray-400 mb-8">
                  Upload the full financial reports for 2024 and 2025. 
                  The AI will perform a comparative analysis and generate a detailed managerial report.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <FileUpload 
                    label="Upload 2024 Full Financial Report"
                    selectedFile={file2024}
                    onFileSelect={setFile2024}
                    onFileRemove={() => setFile2024(null)}
                    acceptedFormats="image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  />
                  <FileUpload 
                    label="Upload 2025 Full Financial Report"
                    selectedFile={file2025}
                    onFileSelect={setFile2025}
                    onFileRemove={() => setFile2025(null)}
                    acceptedFormats="image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  />
                </div>
                
                <button
                  onClick={handleGenerateReport}
                  disabled={isGeneratorDisabled}
                  className={`
                    bg-sky-600 text-white font-bold py-3 px-8 rounded-lg transition-all transform 
                    ${isGeneratorDisabled 
                      ? 'bg-sky-900/50 text-gray-400 cursor-not-allowed' 
                      : 'hover:bg-sky-700 hover:scale-105 shadow-lg shadow-sky-900/50'
                    }
                  `}
                >
                  {isLoading ? 'Analyzing...' : 'Generate Report'}
                </button>
              </div>
            )}

            {/* Loading View */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center mt-24">
                <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-lg text-gray-300">Generating financial report...</p>
                <p className="mt-2 text-sm text-gray-500">This may take a moment.</p>
              </div>
            )}

            {/* Error View */}
            {error && !isLoading && (
              <div className="text-center max-w-2xl mx-auto mt-16 bg-red-900/50 border border-red-700 p-6 rounded-lg">
                <h3 className="text-2xl font-bold text-red-400 mb-2">Error</h3>
                <p className="text-red-300">{error}</p>
                 <button
                  onClick={handleGenerateReport}
                  className="mt-6 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105"
                 >
                  Retry
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
