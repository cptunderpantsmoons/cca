import { GoogleGenAI, Type, Modality } from '@google/genai';
import jsPDF from 'jspdf';
import type { ReportData, VerificationResult } from '../types';

// This tells TypeScript that a global variable `XLSX` will exist at runtime.
// It is loaded via the script tag in index.html, not as a module.
declare const XLSX: any;

interface ApiConfig {
    provider: 'gemini' | 'openrouter';
    apiKey: string;
    model: string;
    voiceModel?: string;
}

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
        noteRef: { type: Type.NUMBER, description: "A unique number referencing a detailed note.", nullable: true },
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
            noteRef: { type: Type.NUMBER, description: "A unique number referencing a detailed note.", nullable: true },
        },
        required: ['item', 'amount2025', 'amount2024'],
    },
};

const notesSchema = {
    type: Type.ARRAY,
    description: 'A list of numbered notes providing details for specific line items in this statement. Each note must have a unique ID referenced by the `noteRef` field.',
    items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.NUMBER, description: 'The unique numeric identifier for the note, starting from 1.' },
            content: { type: Type.STRING, description: 'The detailed content of the note.' },
        },
        required: ['id', 'content'],
    }
};

const KNOWLEDGE_BASE = `
You are an expert financial analyst. Before you begin your main task, you MUST study and use the following knowledge base to ensure 100% accuracy in your calculations and terminology.

### Financial Formulas and Calculations
Use these standard formulas for all calculations.

- **Current Ratio:** Current Ratio = Current Assets / Current Liabilities
  - Explanation: Measures a company's ability to pay short-term obligations.
- **Quick Ratio (Acid-Test Ratio):** Quick Ratio = (Current Assets - Inventories) / Current Liabilities
  - Explanation: A more stringent liquidity test that excludes less liquid inventory.
- **Debt-to-Equity Ratio:** Debt-to-Equity Ratio = Total Liabilities / Shareholders' Equity
  - Explanation: Indicates the relative proportion of shareholders' equity and debt used to finance a company's assets.
- **Return on Assets (ROA):** ROA = (Net Income / Total Assets) × 100
  - Explanation: An indicator of how profitable a company is relative to its total assets.
- **Return on Equity (ROE):** ROE = (Net Income / Shareholder's Equity) × 100
  - Explanation: Measures the rate of return on the ownership interest (shareholders' equity) of the common stock owners.
- **Inventory Turnover:** Inventory Turnover = Cost of Goods Sold / Average Inventory
  - Explanation: Shows how many times a company has sold and replaced inventory during a given period.

### Glossary of Financial Terms
Refer to these definitions for precise terminology.

- **Cost of Revenue:** The aggregate cost of goods produced and sold and services rendered during the reporting period.
- **Goodwill:** An asset representing the future economic benefits arising from other assets acquired in a business combination that are not individually identified and separately recognized.
- **Accrued Liabilities:** Amount of obligations incurred and payable, pertaining to costs that are statutory in nature, incurred on contractual obligations, or accumulate over time and for which invoices have not yet been received or will not be rendered.
- **Retained Earnings:** The amount of net income left over for the business after it has paid out dividends to its shareholders.
- **Capital Expenditures (Capex):** Funds used by a company to acquire, upgrade, and maintain physical assets such as property, plants, buildings, technology, or equipment. In a cash flow statement, this is typically represented by 'Purchases of property, plant and equipment'.

### Financial Benchmarking Examples
Here are examples of how to answer financial questions based on provided text. Use these as a guide for accuracy.

**Example 1:**
- **Question:** What is the FY2018 capital expenditure amount (in USD millions) for 3M?
- **Evidence:** "Cash Flows from Investing Activities... Purchases of property, plant and equipment (PP&E)... (1,577)"
- **Answer:** 1577

**Example 2:**
- **Question:** what is the year end FY2018 net PPNE for 3M? Answer in USD billions.
- **Evidence:** "Property, plant and equipment – net... 8,738" (in millions)
- **Answer:** 8.7

**Example 3:**
- **Question:** Does 3M have a reasonably healthy liquidity profile based on its quick ratio for Q2 of FY2023?
- **Evidence:** "Total current assets 15,754... Total inventories 5,280... Total current liabilities 10,936" (in millions)
- **Calculation:** (Current Assets - Inventories) / Current Liabilities = (15,754 - 5,280) / 10,936 = 0.96
- **Answer:** "No. The quick ratio for 3M was 0.96 by Jun'23 close, which needs a bit of an improvement to touch the 1x mark"

---
`;

const getBasePrompt = () => `
    You are a meticulous and expert senior accountant acting as a Certified Public Accountant (CPA). I am providing you with two financial documents for a company.
    - Document 1: The complete and final financial statement for the year 2024.
    - Document 2: The current, raw financial data for the 2025 period.

    Your primary task is to construct the full 2025 financial statements, perform a comparative analysis against 2024, and output the result as a single, perfectly structured JSON object.

    **CRITICAL ACCURACY INSTRUCTIONS:**
    Your output WILL BE programmatically verified for mathematical integrity. It is IMPERATIVE that the numbers you generate are consistent and balanced. The following equations MUST hold true for both 2025 and 2024 data within your final JSON output. Failure to adhere to these will result in an error.
    1.  **Balance Sheet Equation:** The value for 'totalAssets' MUST equal the sum of 'totalLiabilities' and 'totalEquity'.
    2.  **Income Statement Logic:** The value for 'netProfit' MUST equal the sum of all 'revenue' items minus the sum of all 'expenses' items. The value for 'grossProfit' must equal 'revenue' minus 'cost of goods sold' (or its equivalent).
    3.  **Cash Flow Summation:** The 'netChangeInCash' MUST equal the sum of all items in 'operatingActivities', 'investingActivities', and 'financingActivities'.

    **MAIN TASK & INSTRUCTIONS:**

    1.  **Analyze and Construct:** Thoroughly analyze both documents. Use the 2025 data to construct a full, formal set of 2025 financial statements.
    2.  **Mimic 2024 Structure:** It is critical that the structure, layout, and style of the 2025 statements and notes closely mimic the 2024 document. If the 2024 income statement lists 'Revenue from services' and 'Revenue from products' separately, you must do the same for 2025. Pay close attention to the ordering of items and the level of detail.
    3.  **MANDATORY Cash Flow Statement**: A detailed Statement of Cash Flows for 2025 is NOT optional. If cash flow data is not explicit, you MUST derive it using the indirect method from the 2025 income statement and the changes between the 2024 and 2025 balance sheets.
    4.  **MANDATORY Financial Notes:** The 2024 document contains detailed notes. You MUST replicate this for 2025.
        -   For any significant line item (e.g., 'Inventory', 'Goodwill', 'Long-term Debt'), create a corresponding note in the 'notes' array of the relevant financial statement object.
        -   Link the line item to its note by adding a 'noteRef' field with a unique number (e.g., 'noteRef: 1').
        -   The 'notes' array must contain an object with a matching 'id' and the detailed 'content'. For example, if 'Inventory' has 'noteRef: 1', the 'balanceSheet.notes' array must contain '{ "id": 1, "content": "Inventory is valued at the lower of cost..." }'.
        -   The content of the notes should be professionally written and consistent with the style and information provided in the 2024 notes.
    5.  **Calculate KPIs and Summarize:** Calculate standard financial KPIs comparing 2025 to 2024. Write a professional executive summary covering performance, position, and a detailed cash flow analysis.
    
    Now, based on the provided documents, generate a single JSON object that strictly adheres to the provided schema. Ensure all monetary values are represented as numbers (no currency symbols, commas, or parentheses) and use negative signs for losses or negative cash flows.
    `;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: 'A concise, professional summary of the company\'s financial performance, position, and cash flows, highlighting significant changes and potential areas of concern.',
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
        incomeStatement: {
            type: Type.OBJECT,
            properties: {
                revenue: financialItemsArraySchema,
                expenses: financialItemsArraySchema,
                grossProfit: singleFinancialValueSchema,
                operatingIncome: singleFinancialValueSchema,
                netProfit: singleFinancialValueSchema,
                notes: notesSchema,
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
                notes: notesSchema,
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
                notes: notesSchema,
            },
            required: ['operatingActivities', 'investingActivities', 'financingActivities', 'netChangeInCash'],
        }
    },
    required: ['summary', 'kpis', 'incomeStatement', 'balanceSheet', 'cashFlowStatement'],
};

export async function generateFinancialReport(file2024: File, file2025: File, config: ApiConfig): Promise<ReportData> {
  const prompt = KNOWLEDGE_BASE + getBasePrompt();

  if (config.provider === 'openrouter') {
    const jsonSchemaInstructions = `Your output MUST be a single, valid JSON object that strictly adheres to the structure I will describe. Do not include any text, markdown, or explanations before or after the JSON object.
    The JSON structure is as follows, please populate it completely:
    {
      "summary": "A concise, professional summary of the company's financial performance, position, and cash flows, highlighting significant changes.",
      "kpis": [ { "name": "string", "value2025": "string", "value2024": "string", "changePercentage": "number" } ],
      "incomeStatement": { 
          "revenue": [ { "item": "string", "amount2025": "number", "amount2024": "number", "noteRef": "number|null" } ], 
          "expenses": [ { "item": "string", "amount2025": "number", "amount2024": "number", "noteRef": "number|null" } ], 
          "grossProfit": { "amount2025": "number", "amount2024": "number" }, 
          "operatingIncome": { "amount2025": "number", "amount2024": "number" },
          "netProfit": { "amount2025": "number", "amount2024": "number" },
          "notes": [ { "id": "number", "content": "string" } ]
      },
      "balanceSheet": {
          "currentAssets": [ { "item": "string", "amount2025": "number", "amount2024": "number" } ],
          "nonCurrentAssets": [ { "item": "string", "amount2025": "number", "amount2024": "number" } ],
          "currentLiabilities": [ { "item": "string", "amount2025": "number", "amount2024": "number" } ],
          "nonCurrentLiabilities": [ { "item": "string", "amount2025": "number", "amount2024": "number" } ],
          "equity": [ { "item": "string", "amount2025": "number", "amount2024": "number" } ],
          "totalAssets": { "amount2025": "number", "amount2024": "number" },
          "totalLiabilities": { "amount2025": "number", "amount2024": "number" },
          "totalEquity": { "amount2025": "number", "amount2024": "number" },
          "notes": [ { "id": "number", "content": "string" } ]
      },
      "cashFlowStatement": {
          "operatingActivities": [ { "item": "string", "amount2025": "number", "amount2024": "number" } ],
          "investingActivities": [ { "item": "string", "amount2025": "number", "amount2024": "number" } ],
          "financingActivities": [ { "item": "string", "amount2025": "number", "amount2024": "number" } ],
          "netChangeInCash": { "amount2025": "number", "amount2024": "number" },
          "notes": [ { "id": "number", "content": "string" } ]
      }
    }
    Ensure all monetary values are numbers, removing currency symbols and using negative signs for losses.
    `;

    try {
        const part2024 = await fileToGenerativePart(file2024);
        const part2025 = await fileToGenerativePart(file2025);

        const apiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: config.model,
                response_format: { "type": "json_object" },
                messages: [
                    {
                        "role": "user",
                        "content": [
                            { "type": "text", "text": prompt + jsonSchemaInstructions },
                            { 
                                "type": "image_url", 
                                "image_url": { "url": `data:${part2024.inlineData.mimeType};base64,${part2024.inlineData.data}` }
                            },
                            { 
                                "type": "image_url", 
                                "image_url": { "url": `data:${part2025.inlineData.mimeType};base64,${part2025.inlineData.data}` }
                            },
                        ]
                    }
                ]
            })
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            throw new Error(`OpenRouter API error (${apiResponse.status}): ${errorBody}`);
        }

        const responseData = await apiResponse.json();
        const jsonText = responseData.choices[0].message.content;
        return JSON.parse(jsonText) as ReportData;

    } catch (error) {
        console.error("Error calling OpenRouter API:", error);
        throw new Error("The AI model failed to process the financial data via OpenRouter. Please check your API key, model selection, and that you are using image files.");
    }

  } else { // Gemini Provider
    const effectiveApiKey = config.apiKey || process.env.API_KEY as string;
    if (!effectiveApiKey) {
        throw new Error("Gemini API key is missing. Please provide one in the config or set the environment variable.");
    }
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
    
    try {
        const part2024 = await fileToGenerativePart(file2024);
        const part2025 = await fileToGenerativePart(file2025);

        const response = await ai.models.generateContent({
            model: config.model,
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
}

export async function fixFinancialReport(
    previousReport: ReportData,
    verificationErrors: VerificationResult,
    config: ApiConfig
): Promise<ReportData> {
    const correctionPrompt = `
    You are a meticulous and expert senior accountant acting as a Certified Public Accountant (CPA).
    I am providing you with a financial report you previously generated. It has failed a mathematical verification check.

    Your task is to analyze the provided report and the verification errors, correct ONLY the necessary figures to resolve the discrepancies, and output the entire, corrected report as a single JSON object.

    **CRITICAL INSTRUCTIONS:**
    1.  **Analyze the Errors:** The 'verificationCertificate' section below details the exact calculations that failed. For example, a discrepancy in the 'Balance Sheet Equation' means Assets != Liabilities + Equity.
    2.  **Targeted Corrections:** You MUST only change the minimum number of values necessary to make the report mathematically sound. Adjust summary totals or their constituent line items to make the equations balance. Do not regenerate the entire report from scratch or change the summary text, KPIs, or notes unless absolutely necessary to fix a calculation.
    3.  **Maintain Structure:** The output must be the complete JSON report, strictly adhering to the original schema. Do not add any explanatory text, markdown, or code block syntax before or after the JSON.
    4.  **Preserve Correct Data:** Do not change any numbers or text in sections that were not identified as erroneous.

    Here is the financial report that needs correction:
    \`\`\`json
    ${JSON.stringify(previousReport, null, 2)}
    \`\`\`

    Here is the verification certificate detailing the errors. Please fix them:
    \`\`\`json
    ${JSON.stringify(verificationErrors.checks.filter(c => !c.passed), null, 2)}
    \`\`\`

    Now, provide the corrected and complete JSON object.
    `;

    if (config.provider === 'openrouter') {
        const jsonSchemaInstructions = `Your output MUST be a single, valid JSON object that strictly adheres to the structure provided in the example report. Do not include any text, markdown, or explanations before or after the JSON object.`;
        try {
            const apiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${config.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: config.model,
                    response_format: { "type": "json_object" },
                    messages: [{
                        "role": "user",
                        "content": correctionPrompt + jsonSchemaInstructions
                    }]
                })
            });

            if (!apiResponse.ok) {
                const errorBody = await apiResponse.text();
                throw new Error(`OpenRouter API error during correction (${apiResponse.status}): ${errorBody}`);
            }

            const responseData = await apiResponse.json();
            const jsonText = responseData.choices[0].message.content;
            return JSON.parse(jsonText) as ReportData;

        } catch (error) {
            console.error("Error calling OpenRouter API for correction:", error);
            throw new Error("The AI model failed to correct the financial data via OpenRouter.");
        }
    } else { // Gemini Provider
        const effectiveApiKey = config.apiKey || process.env.API_KEY as string;
        if (!effectiveApiKey) throw new Error("Gemini API key is missing.");
        const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

        try {
            const response = await ai.models.generateContent({
                model: config.model,
                contents: { parts: [{ text: correctionPrompt }] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });
            const jsonText = response.text.trim();
            return JSON.parse(jsonText) as ReportData;
        } catch (error) {
            console.error("Error calling Gemini API for correction:", error);
            throw new Error("The AI model failed to correct the financial data.");
        }
    }
}


const createWavBlobFromPcm = (base64Pcm: string): Blob => {
    const decodeBase64 = (base64: string) => {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };

    const pcmData = decodeBase64(base64Pcm);
    const sampleRate = 24000;
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit audio
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.byteLength;
    const chunkSize = 36 + dataSize;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, chunkSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    new Uint8Array(buffer, 44).set(new Uint8Array(pcmData));

    return new Blob([view], { type: 'audio/wav' });
};


export async function generateAudioSummary(summaryText: string): Promise<Blob> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Provide a professional, verbal summary of the following financial report analysis: ${summaryText}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A professional and clear voice
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data was returned from the API.");
        }
        return createWavBlobFromPcm(base64Audio);
    } catch (error) {
        console.error("Error generating audio summary:", error);
        throw new Error("Failed to generate the audio summary.");
    }
}

export async function generateOpenRouterAudioSummary(summaryText: string, config: ApiConfig): Promise<Blob> {
    if (!config.apiKey) {
        throw new Error("OpenRouter API key is required for audio generation.");
    }
    if (!config.voiceModel) {
        throw new Error("An OpenRouter voice model must be specified.");
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: config.voiceModel,
                input: `Provide a professional, verbal summary of the following financial report analysis: ${summaryText}`
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`OpenRouter Audio API error (${response.status}): ${errorBody}`);
        }

        return await response.blob();

    } catch (error) {
        console.error("Error calling OpenRouter Audio API:", error);
        throw new Error("Failed to generate audio summary via OpenRouter.");
    }
}
