import React, { useRef } from 'react';
import type { VerificationResult, VerificationCheck } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface VerificationCertificateProps {
  certificate: VerificationResult;
}

const VerificationCheckRow: React.FC<{ check: VerificationCheck }> = ({ check }) => {
    const statusColor = check.passed ? 'text-green-400' : 'text-red-400';
    const statusBgColor = check.passed ? 'bg-green-900/50' : 'bg-red-900/50';
    const StatusIcon = check.passed ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
    );

    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-white">{check.name}</h3>
                    <p className="text-sm text-gray-400 italic">Principle: {check.principle}</p>
                </div>
                <div className={`flex items-center gap-2 font-bold text-sm py-1 px-3 rounded-full ${statusColor} ${statusBgColor}`}>
                    {StatusIcon}
                    {check.passed ? 'Passed' : 'Failed'}
                </div>
            </div>
            <div className="mt-4 border-t border-gray-700 pt-4 text-sm space-y-2">
                {check.notes ? (
                    <p className="text-yellow-400 bg-yellow-900/50 p-2 rounded-md"><span className="font-bold">Note:</span> {check.notes}</p>
                ) : (
                    <>
                        <div className="flex justify-between">
                            <span className="text-gray-400 font-medium">Calculation:</span>
                            <code className="text-gray-200 font-mono">{check.calculation}</code>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400 font-medium">Reported Value:</span>
                            <code className="text-gray-200 font-mono">{check.reported}</code>
                        </div>
                         <div className={`flex justify-between font-semibold ${statusColor}`}>
                            <span className="font-medium">Discrepancy:</span>
                            <code className="font-mono">{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(check.discrepancy)}</code>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


const VerificationCertificate: React.FC<VerificationCertificateProps> = ({ certificate }) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    const input = certificateRef.current;
    if (!input) return;

    html2canvas(input, { 
        useCORS: true,
        scale: 1.5,
        backgroundColor: '#1f2937'
    }).then((canvas) => {
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save('financial-verification-certificate.pdf');
    });
  };

  const getStatusInfo = () => {
    switch(certificate.overallStatus) {
        case 'Passed': return { 
            color: 'text-green-400', 
            text: 'All mathematical checks passed successfully within tolerance.',
            interpretation: 'The figures in the AI-generated report are internally consistent and mathematically sound according to standard accounting principles. You can proceed with confidence in the data\'s integrity.'
        };
        case 'Passed with Warnings': return { 
            color: 'text-yellow-400', 
            text: 'Core checks passed, but some could not be completed due to missing data.',
            interpretation: 'The AI model did not provide all the necessary summary totals (e.g., Total Assets, Net Profit) to perform a full verification. While the checks that could be performed have passed, the report is incomplete.'
        };
        case 'Failed': return { 
            color: 'text-red-400', 
            text: 'One or more critical mathematical checks failed.',
            interpretation: 'This failure indicates that the AI model generated financially inconsistent numbers. For example, Assets may not equal Liabilities + Equity. This is a known limitation of generative AI models, which can sometimes struggle with precise, multi-step calculations. This verification step is designed specifically to detect these errors. The report should be reviewed with caution or regenerated.'
        };
        default: return { color: 'text-gray-400', text: '', interpretation: ''};
    }
  }

  const statusInfo = getStatusInfo();

  return (
    <div className="animate-fade-in">
      <div className="flex justify-end mb-4">
          <button
              onClick={handleDownloadPdf}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Certificate
          </button>
      </div>

      <div ref={certificateRef} className="bg-gray-800 p-8 rounded-lg border-2 border-sky-800/50 shadow-2xl shadow-sky-900/20">
        <header className="text-center border-b-2 border-gray-700 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-sky-400">Certificate of Mathematical Verification</h1>
          <p className="text-sm text-gray-400 mt-2">Issued on: {certificate.timestamp}</p>
        </header>

        <section className="text-center my-8">
            <h2 className="text-xl font-semibold text-gray-300">Overall Status</h2>
            <p className={`text-4xl font-bold mt-2 ${statusInfo.color}`}>{certificate.overallStatus}</p>
            <p className="text-gray-400 mt-2 max-w-2xl mx-auto">{statusInfo.text}</p>
        </section>

        <section className="my-8">
            <h2 className="text-xl font-semibold text-white mb-3">Interpretation</h2>
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <p className="text-gray-300 text-sm leading-relaxed">{statusInfo.interpretation}</p>
            </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">Verification Details</h2>
          <div className="space-y-4">
            {certificate.checks.map((check, index) => (
                <VerificationCheckRow key={index} check={check} />
            ))}
          </div>
        </section>

        <footer className="text-center mt-8 pt-4 border-t-2 border-gray-700">
            <p className="text-xs text-gray-500">
                This certificate confirms that the AI-generated report has been subjected to automated mathematical checks based on standard accounting principles.
                A discrepancy tolerance of {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(1.0)} is applied to account for potential rounding.
            </p>
        </footer>
      </div>
    </div>
  );
};

export default VerificationCertificate;