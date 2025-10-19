import React, { useState, useRef } from 'react';
import type { ReportData, VerificationResult } from './types';
import { generateFinancialReport, fixFinancialReport } from './services/geminiService';
import { verifyReportData } from './services/verificationService';
import Header from './components/Header';
import ReportDisplay from './components/ReportDisplay';
import FileUpload from './components/FileUpload';
import ApiConfig from './components/ApiConfig';

type ApiProvider = 'gemini' | 'openrouter';

const App: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file2024, setFile2024] = useState<File | null>(null);
  const [file2025, setFile2025] = useState<File | null>(null);

  // New state for API config
  const [apiProvider, setApiProvider] = useState<ApiProvider>('gemini');
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [voiceModel, setVoiceModel] = useState<string>('elevenlabs/eleven-multilingual-v2');

  const [retryAttempt, setRetryAttempt] = useState(0);
  const isGenerationCancelledRef = useRef(false);


  const handleGenerateReport = async () => {
    if (!file2024 || !file2025) {
      setError("Please upload both financial documents.");
      return;
    }
    
    if (apiProvider === 'openrouter' && !apiKey) {
      setError("API Key is required for OpenRouter.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setReportData(null);
    setVerificationResult(null);
    setRetryAttempt(0);
    isGenerationCancelledRef.current = false;

    try {
        let attempt = 1;
        setRetryAttempt(attempt);

        const apiConfig = { provider: apiProvider, apiKey, model, voiceModel };

        // --- First Attempt ---
        let currentReportData = await generateFinancialReport(file2024, file2025, apiConfig);
        if (isGenerationCancelledRef.current) {
            setError("Report generation was cancelled by the user.");
            setIsLoading(false);
            return;
        }
        
        let currentVerification = verifyReportData(currentReportData);

        // --- Correction Loop ---
        while (!isGenerationCancelledRef.current && currentVerification.overallStatus === 'Failed') {
            attempt++;
            if (attempt > 5) { // Safety break to prevent infinite loops
                throw new Error("Failed to correct the report after 5 attempts. Please try again or use different source documents.");
            }
            setRetryAttempt(attempt);

            console.log(`Verification failed on attempt ${attempt - 1}. Attempting correction...`);
            
            // Pass the failed report and verification result to the fix function
            currentReportData = await fixFinancialReport(currentReportData, currentVerification, apiConfig);

            if (isGenerationCancelledRef.current) {
                setError("Report generation was cancelled by the user.");
                setIsLoading(false);
                return;
            }

            currentVerification = verifyReportData(currentReportData);
        }

        if (currentVerification.overallStatus !== 'Failed') {
            setReportData(currentReportData);
            setVerificationResult(currentVerification);
        } else if (!isGenerationCancelledRef.current) {
             setError("The AI was unable to generate a mathematically consistent report after several attempts.");
        }

    } catch (err) {
        if (!isGenerationCancelledRef.current) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate report. ${errorMessage}`);
            console.error(err);
        } else {
             setError("Report generation was cancelled by the user.");
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleCancel = () => {
    isGenerationCancelledRef.current = true;
  };

  const handleReset = () => {
    isGenerationCancelledRef.current = true; // Cancel any ongoing generation
    setReportData(null);
    setVerificationResult(null);
    setError(null);
    setFile2024(null);
    setFile2025(null);
    setIsLoading(false);
    setRetryAttempt(0);
  };

  const isGeneratorDisabled = !file2024 || !file2025 || isLoading;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        {reportData && verificationResult ? (
          <>
            <ReportDisplay 
              data={reportData} 
              verification={verificationResult}
              onReset={handleReset}
              apiConfig={{ provider: apiProvider, apiKey, model, voiceModel }}
            />
          </>
        ) : (
          <>
            {/* Initial Upload View */}
            {!isLoading && (
              <div className="text-center max-w-4xl mx-auto mt-8 animate-fade-in">
                <h2 className="text-3xl font-bold text-white mb-4">Financial Statement Generation</h2>
                <p className="text-lg text-gray-400 mb-8">
                  Configure your API, then upload the 2024 and 2025 financial documents.
                  The AI will analyze them and generate a comparative report.
                </p>

                <ApiConfig 
                  provider={apiProvider}
                  apiKey={apiKey}
                  model={model}
                  voiceModel={voiceModel}
                  onProviderChange={setApiProvider}
                  onApiKeyChange={setApiKey}
                  onModelChange={setModel}
                  onVoiceModelChange={setVoiceModel}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <FileUpload 
                    label="Upload 2024 Full Financial Statement"
                    selectedFile={file2024}
                    onFileSelect={setFile2024}
                    onFileRemove={() => setFile2024(null)}
                    acceptedFormats="image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  />
                  <FileUpload 
                    label="Upload 2025 Current Financial Data"
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
                <p className="mt-4 text-lg text-gray-300">
                  {retryAttempt <= 1 ? 'Generating Report...' : `Correcting Report (Attempt ${retryAttempt})`}
                </p>
                {retryAttempt > 1 && (
                    <p className="mt-2 text-sm text-yellow-400">Previous attempt failed verification. Attempting to fix errors...</p>
                )}
                <p className="mt-2 text-sm text-gray-500 max-w-md text-center">The AI is working to create a mathematically consistent report. This may take a few attempts.</p>
                <button
                  onClick={handleCancel}
                  className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors transform hover:scale-105"
                >
                  Cancel Generation
                </button>
              </div>
            )}

            {/* Error View */}
            {error && !isLoading && (
              <div className="text-center max-w-2xl mx-auto mt-16 bg-red-900/50 border border-red-700 p-6 rounded-lg">
                <h3 className="text-2xl font-bold text-red-400 mb-2">Error</h3>
                <p className="text-red-300">{error}</p>
                 <button
                  onClick={handleReset}
                  className="mt-6 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105"
                 >
                  Start Over
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
