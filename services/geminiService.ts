import { GoogleGenAI, Type } from '@google/genai';
import jsPDF from 'jspdf';
import type { ReportData } from '../types';

// This tells TypeScript that a global variable `XLSX` will exist at runtime.
// It is loaded via the script tag in index.html, not as a module.
declare const XLSX: any;

// Helper function to convert a File object to a GoogleGenerativeAI.Part object.
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string; }; }> {
    const excelMimeTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (excelMimeTypes.includes(file.type)) {
        // Per user instruction: convert Excel file to a PDF first.
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);

        const pdf = new jsPDF();
        pdf.setFont('courier', 'normal'); // Use a monospaced font for table-like alignment
        pdf.setFontSize(8);

        const pageHeight = pdf.internal.pageSize.height;
        const margin = 10;
        let yPosition = margin;

        workbook.SheetNames.forEach((sheetName, index) => {
            if (index > 0) {
                pdf.addPage();
            }
            yPosition = margin;
            
            pdf.text(`Sheet: ${sheetName}`, margin, yPosition);
            yPosition += 10;

            const worksheet = workbook.Sheets[sheetName];
            // Convert sheet to an array of arrays for easier processing
            const data: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            data.forEach(row => {
                // Check if new line exceeds page height
                if (yPosition > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin;
                }
                const rowText = row.map(cell => cell !== null && cell !== undefined ? cell : '').join(' | ');
                pdf.text(rowText, margin, yPosition);
                yPosition += 5; // Move to the next line
            });
        });
        
        // Output the generated PDF as a base64 string
        const pdfDataUri = pdf.output('datauristring');
        const base64Data = pdfDataUri.split(',')[1];
        
        return {
            inlineData: {
                data: base64Data,
                mimeType: 'application/pdf', // Send the converted file as a PDF
            },
        };
    }

    // For other file types (PDF, images), process as before.
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // The result includes the Base64 prefix, which we need to remove.
        const base64Data = (reader.result as string).split(',')[1];
        resolve(base64Data);
      };
      reader.readAsDataURL(file);
    });
  
    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type,
      },
    };
}

const singleFinancialValueSchema = {
    type: Type.OBJECT,
    properties: {
        amount2025: { type: Type.NUMBER },
        amount2024: { type: Type.NUMBER },
    },
    required: ['amount2025', 'amount2024'],
};

const financialItemsArraySchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            item: { type: Type.STRING },
            amount2025: { type: Type.NUMBER },
            amount2024: { type: Type.NUMBER },
        },
        required: ['item', 'amount2025', 'amount2024'],
    },
};


export async function generateFinancialReport(file2024: File, file2025: File): Promise<ReportData> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description: 'A concise, professional summary of the company\'s financial performance and position, highlighting significant changes and potential areas of concern.',
      },
      kpis: {
        type: Type.ARRAY,
        description: 'Key Performance Indicators.',
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            value2025: { type: Type.STRING },
            value2024: { type: Type.STRING },
            changePercentage: { type: Type.NUMBER },
          },
          required: ['name', 'value2025', 'value2024', 'changePercentage'],
        },
      },
      notes: {
        type: Type.ARRAY,
        description: 'Detailed analyst notes explaining significant variances or providing context.',
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: 'The title of the note.' },
                content: { type: Type.STRING, description: 'The detailed content of the note.' },
            },
            required: ['title', 'content'],
        }
      },
      incomeStatement: {
        type: Type.OBJECT,
        properties: {
          revenue: financialItemsArraySchema,
          expenses: financialItemsArraySchema,
          grossProfit: singleFinancialValueSchema,
          operatingIncome: singleFinancialValueSchema,
          netProfit: singleFinancialValueSchema,
        },
        required: ['revenue', 'expenses', 'grossProfit', 'operatingIncome', 'netProfit'],
      },
      balanceSheet: {
        type: Type.OBJECT,
        properties: {
          currentAssets: financialItemsArraySchema,
          nonCurrentAssets: financialItemsArraySchema,
          currentLiabilities: financialItemsArraySchema,
          nonCurrentLiabilities: financialItemsArraySchema,
          equity: financialItemsArraySchema,
          totalAssets: singleFinancialValueSchema,
          totalLiabilities: singleFinancialValueSchema,
          totalEquity: singleFinancialValueSchema,
        },
        required: ['currentAssets', 'nonCurrentAssets', 'currentLiabilities', 'nonCurrentLiabilities', 'equity', 'totalAssets', 'totalLiabilities', 'totalEquity'],
      },
      cashFlowStatement: {
          type: Type.OBJECT,
          properties: {
              operatingActivities: financialItemsArraySchema,
              investingActivities: financialItemsArraySchema,
              financingActivities: financialItemsArraySchema,
              netChangeInCash: singleFinancialValueSchema,
          },
          required: ['operatingActivities', 'investingActivities', 'financingActivities', 'netChangeInCash'],
      }
    },
    required: ['summary', 'kpis', 'notes', 'incomeStatement', 'balanceSheet', 'cashFlowStatement'],
  };

  const prompt = `
    You are a meticulous and expert financial analyst. I am providing you with two financial report documents for a company.
    - The first document contains the financial data for the year 2024.
    - The second document contains the financial data for the year 2025.

    The documents are provided as PDFs or images. You must be able to parse the data accurately.

    Your task is to perform a comprehensive comparative analysis and generate a complete JSON report that includes a full set of financial statements: a multi-step Income Statement, a classified Balance Sheet, and a Statement of Cash Flows.

    Follow these steps with precision:
    1.  **Extract All Data:** Carefully parse both documents to extract all financial line items and their corresponding values for both 2024 and 2025.
    2.  **Structure the Report:** Populate the JSON object strictly according to the provided schema. Ensure you correctly map the data to 'amount2024' and 'amount2025' fields for all sections.
    3.  **Build a Multi-Step Income Statement:**
        -   List all revenue and expense items.
        -   Calculate and provide values for 'grossProfit', 'operatingIncome', and 'netProfit'.
    4.  **Build a Classified Balance Sheet:**
        -   Categorize all assets as either 'currentAssets' or 'nonCurrentAssets'.
        -   Categorize all liabilities as either 'currentLiabilities' or 'nonCurrentLiabilities'.
        -   Detail all items under 'equity'.
        -   Provide the calculated totals for 'totalAssets', 'totalLiabilities', and 'totalEquity'.
    5.  **Build a Statement of Cash Flows:**
        -   List all cash flow items under their respective categories: 'operatingActivities', 'investingActivities', and 'financingActivities'.
        -   Provide the final 'netChangeInCash'.
    6.  **Calculate KPIs:** Calculate key performance indicators (KPIs) comparing 2025 to 2024. This should include metrics from all three statements. Calculate the percentage change from 2024 to 2025.
    7.  **Write Summary:** In the 'summary' field, provide a concise, professional analysis comparing the company's performance in 2025 to 2024.
    8.  **Generate Detailed Notes:** Create a series of numbered detailed notes, as found in a formal financial statement. These notes must be comprehensive, cross-referencing and explaining significant items, variances, or accounting policies from all three financial statements.

    Now, based on the provided documents, generate a JSON object that strictly adheres to the provided schema. Ensure all monetary values are represented as numbers, removing currency symbols, commas, and parentheses, and representing losses with a negative sign.
    `;

    try {
        const part2024 = await fileToGenerativePart(file2024);
        const part2025 = await fileToGenerativePart(file2025);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [
                {text: prompt},
                part2024,
                part2025
            ]},
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText) as ReportData;
        return parsedData;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("The AI model failed to process the financial data. Please check if the uploaded documents are clear and valid financial reports.");
    }
}