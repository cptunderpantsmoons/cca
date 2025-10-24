import jsPDF from 'jspdf';
import type { ReportData, FinancialItem } from '../types';

// Helper to find an item in an array by a string match, case-insensitive
const findItem = (items: FinancialItem[], name: string): FinancialItem | undefined => {
    return items.find(item => item.item.toLowerCase().includes(name.toLowerCase()));
}

export const generateAASBPdf = (data: ReportData) => {
    const doc = new jsPDF('p', 'pt', 'a4');
    let yPos = 80; // Start y-position
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);
    const rightMargin = pageWidth - margin;
    const col2 = rightMargin - 100;
    const col3 = rightMargin;

    const tocEntries: { title: string; page: number; indent: number }[] = [];
    let pageCounter = 1;

    const addPage = () => {
        doc.addPage();
        pageCounter++;
        yPos = margin;
    };

    const checkPageBreak = (spaceNeeded = 40) => {
        if (yPos > pageHeight - margin - spaceNeeded) {
            addPage();
        }
    };

    const formatCurrency = (value: number) => {
        // Formats to (123,456) for negative numbers
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(Math.abs(value));
        return value < 0 ? `(${formatted})` : formatted;
    };

    // --- 1. Cover Page ---
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('2025 Financial Statement Report', pageWidth / 2, 150, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Maki Planet Systems Pty Ltd', pageWidth / 2, 180, { align: 'center' });
    doc.text('For the Year Ended 30 June 2025', pageWidth / 2, 200, { align: 'center' });

    addPage();
    const tocPage = pageCounter;

    addPage();

    // --- 2. Content Generation ---
    const recordTocEntry = (title: string, indent: number) => {
        // Check if page number for this title already exists to avoid duplicates on same page
        const lastEntry = tocEntries[tocEntries.length - 1];
        if (!lastEntry || lastEntry.title !== title || lastEntry.page !== pageCounter) {
             tocEntries.push({ title, page: pageCounter, indent });
        }
    };
    
    const drawSectionHeader = (title: string, tocTitle: string) => {
        checkPageBreak(50);
        recordTocEntry(tocTitle, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, yPos);
        yPos += 20;
    };
    
    const drawTableHeader = (col2Header: string, col3Header: string) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(col2Header, col2, yPos, { align: 'right' });
        doc.text(col3Header, col3, yPos, { align: 'right' });
        yPos += 15;
    };

    const drawTableRow = (label: string, val1: number | string, val2: number | string, isBold = false, noteRef?: number) => {
        checkPageBreak();
        const finalLabel = noteRef ? `${label} (Note ${noteRef})` : label;
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.text(finalLabel, margin, yPos);
        doc.text(String(val1), col2, yPos, { align: 'right' });
        doc.text(String(val2), col3, yPos, { align: 'right' });
        yPos += 15;
    }

    // --- Income Statement ---
    drawSectionHeader("1. Income Statement", "1   Income Statement");
    drawTableHeader("2025", "2024");
    
    doc.setFont('helvetica', 'bold');
    doc.text("Income", margin, yPos);
    yPos += 15;
    data.incomeStatement.revenue.forEach(i => drawTableRow(i.item, formatCurrency(i.amount2025), formatCurrency(i.amount2024), false, i.noteRef));
    const totalIncome2025 = data.incomeStatement.revenue.reduce((s, i) => s + i.amount2025, 0);
    const totalIncome2024 = data.incomeStatement.revenue.reduce((s, i) => s + i.amount2024, 0);
    drawTableRow("Total Income", formatCurrency(totalIncome2025), formatCurrency(totalIncome2024), true);
    yPos += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text("Expenses", margin, yPos);
    yPos += 15;
    const nonTaxExpenses = data.incomeStatement.expenses.filter(i => !i.item.toLowerCase().includes('tax'));
    nonTaxExpenses.forEach(i => drawTableRow(i.item, formatCurrency(i.amount2025), formatCurrency(i.amount2024), false, i.noteRef));
    const totalExpenses2025 = nonTaxExpenses.reduce((s, i) => s + i.amount2025, 0);
    const totalExpenses2024 = nonTaxExpenses.reduce((s, i) => s + i.amount2024, 0);
    drawTableRow("Total Expenses", formatCurrency(totalExpenses2025), formatCurrency(totalExpenses2024), true);
    yPos += 10;

    const pbt2025 = totalIncome2025 - totalExpenses2025;
    const pbt2024 = totalIncome2024 - totalExpenses2024;
    drawTableRow("Profit/(Loss) Before Taxation", formatCurrency(pbt2025), formatCurrency(pbt2024), true);

    const taxItem = findItem(data.incomeStatement.expenses, 'tax');
    const tax2025 = taxItem?.amount2025 || 0;
    const tax2024 = taxItem?.amount2024 || 0;
    drawTableRow("Income Tax Expense/(Benefit)", formatCurrency(tax2025), formatCurrency(tax2024), false, taxItem?.noteRef);
    
    drawTableRow("Net Profit/(Loss) After Taxation", formatCurrency(data.incomeStatement.netProfit.amount2025), formatCurrency(data.incomeStatement.netProfit.amount2024), true, data.incomeStatement.netProfit.noteRef);


    // --- Appropriation Statement ---
    drawSectionHeader("2. Appropriation Statement", "2   Appropriation Statement");
    drawTableHeader("2025", "2024");
    const reItem = findItem(data.balanceSheet.equity, 'retained earnings');
    const re2024 = reItem?.amount2024 || 0;
    const re2025 = reItem?.amount2025 || 0;
    const re2023 = re2024 - data.incomeStatement.netProfit.amount2024; // Approximate for previous year
    drawTableRow("Retained Earnings At Start of Year", formatCurrency(re2024), formatCurrency(re2023));
    drawTableRow("Net Profit/(Loss) After Taxation", formatCurrency(data.incomeStatement.netProfit.amount2025), formatCurrency(data.incomeStatement.netProfit.amount2024), false, data.incomeStatement.netProfit.noteRef);
    drawTableRow("Retained Earnings After Appropriation", formatCurrency(re2025), formatCurrency(re2024), true, reItem?.noteRef);
    

    // --- Balance Sheet ---
    drawSectionHeader("3. Balance Sheet", "3   Balance Sheet");
    drawTableHeader("30 June 2025", "30 June 2024");
    doc.setFont('helvetica', 'bold');
    doc.text("Assets", margin, yPos);
    yPos += 15;
    doc.setFont('helvetica', 'normal');
    doc.text("Current Assets", margin, yPos);
    yPos += 15;
    data.balanceSheet.currentAssets.forEach(i => drawTableRow(`  ${i.item}`, formatCurrency(i.amount2025), formatCurrency(i.amount2024), false, i.noteRef));
    drawTableRow("Total Current Assets", formatCurrency(data.balanceSheet.currentAssets.reduce((s,i) => s + i.amount2025, 0)), formatCurrency(data.balanceSheet.currentAssets.reduce((s,i) => s + i.amount2024, 0)), true);
    yPos += 10;
    doc.text("Non-Current Assets", margin, yPos);
    yPos += 15;
    data.balanceSheet.nonCurrentAssets.forEach(i => drawTableRow(`  ${i.item}`, formatCurrency(i.amount2025), formatCurrency(i.amount2024), false, i.noteRef));
    drawTableRow("Total Non-Current Assets", formatCurrency(data.balanceSheet.nonCurrentAssets.reduce((s,i) => s + i.amount2025, 0)), formatCurrency(data.balanceSheet.nonCurrentAssets.reduce((s,i) => s + i.amount2024, 0)), true);
    yPos += 10;
    drawTableRow("Total Assets", formatCurrency(data.balanceSheet.totalAssets.amount2025), formatCurrency(data.balanceSheet.totalAssets.amount2024), true, data.balanceSheet.totalAssets.noteRef);
    yPos += 20;

    doc.setFont('helvetica', 'bold');
    doc.text("Liabilities", margin, yPos);
    yPos += 15;
    doc.setFont('helvetica', 'normal');
    doc.text("Current Liabilities", margin, yPos);
    yPos += 15;
    data.balanceSheet.currentLiabilities.forEach(i => drawTableRow(`  ${i.item}`, formatCurrency(i.amount2025), formatCurrency(i.amount2024), false, i.noteRef));
    drawTableRow("Total Current Liabilities", formatCurrency(data.balanceSheet.currentLiabilities.reduce((s,i) => s + i.amount2025, 0)), formatCurrency(data.balanceSheet.currentLiabilities.reduce((s,i) => s + i.amount2024, 0)), true);
    yPos += 10;
    doc.text("Non-Current Liabilities", margin, yPos);
    yPos += 15;
    data.balanceSheet.nonCurrentLiabilities.forEach(i => drawTableRow(`  ${i.item}`, formatCurrency(i.amount2025), formatCurrency(i.amount2024), false, i.noteRef));
    drawTableRow("Total Non-Current Liabilities", formatCurrency(data.balanceSheet.nonCurrentLiabilities.reduce((s,i) => s + i.amount2025, 0)), formatCurrency(data.balanceSheet.nonCurrentLiabilities.reduce((s,i) => s + i.amount2024, 0)), true);
    yPos += 10;
    drawTableRow("Total Liabilities", formatCurrency(data.balanceSheet.totalLiabilities.amount2025), formatCurrency(data.balanceSheet.totalLiabilities.amount2024), true, data.balanceSheet.totalLiabilities.noteRef);
    yPos += 10;
    
    const netAssets2025 = data.balanceSheet.totalAssets.amount2025 - data.balanceSheet.totalLiabilities.amount2025;
    const netAssets2024 = data.balanceSheet.totalAssets.amount2024 - data.balanceSheet.totalLiabilities.amount2024;
    // Net Assets conceptually equals Total Equity, so it can share the same note reference.
    drawTableRow("Net Assets", formatCurrency(netAssets2025), formatCurrency(netAssets2024), true, data.balanceSheet.totalEquity.noteRef);
    yPos += 20;

    doc.setFont('helvetica', 'bold');
    doc.text("Equity", margin, yPos);
    yPos += 15;
    data.balanceSheet.equity.forEach(i => drawTableRow(`  ${i.item}`, formatCurrency(i.amount2025), formatCurrency(i.amount2024), false, i.noteRef));
    drawTableRow("Total Equity", formatCurrency(data.balanceSheet.totalEquity.amount2025), formatCurrency(data.balanceSheet.totalEquity.amount2024), true, data.balanceSheet.totalEquity.noteRef);

    // --- Notes to the Financial Statements ---
    addPage();
    drawSectionHeader("4. Notes to the Financial Statements", "4   Notes to the Financial Statements");
    
    const drawNoteSection = (title: string, tocTitle: string, content: string[]) => {
        checkPageBreak(content.length * 15 + 20);
        recordTocEntry(tocTitle, 1);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, yPos);
        yPos += 15;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        content.forEach(line => {
             const splitText = doc.splitTextToSize(line, contentWidth);
             doc.text(splitText, margin, yPos);
             yPos += (splitText.length * 12);
             checkPageBreak();
        });
        yPos += 10;
    };

    drawNoteSection("4.1 Statement of Significant Accounting Policies", "4.1   Statement of Significant Accounting Policies", [
        "Maki Planet Systems Pty Ltd (the \"Company\") is a for-profit company that is domiciled in Australia. The parent and the ultimate parent is Corporate Carbon Group Pty Ltd.",
        "In the opinion of the directors, the Company is not publicly accountable nor a reporting entity, as it is unlikely there are users of these financial statements that exist who are not in a position to require the preparation of reports tailored to their information needs. The financial statements of the Company have been prepared as special purpose financial statements for distribution to the members."
    ]);

    drawNoteSection("4.2 Basis of Preparation", "4.2   Basis of Preparation", [
        "The significant accounting policies adopted in these special purpose financial statements are set out in the following notes. The special purpose financial statements include only the disclosure requirements of the following AASs and those disclosures considered necessary by the directors to meet the needs of members:",
        "  • AASB 101 Presentation of Financial Statements",
        "  • AASB 108 Accounting Policies, Changes in Accounting Estimates and Errors",
        "  • AASB 1048 Interpretation of Standards",
        "The financial statements have been prepared on the historical cost basis except for where specifically set out below. These financial statements are presented in Australian dollars, which is the Company's functional currency."
    ]);

    const allItemsWithNotes: {item: string, noteRef?: number}[] = [
        ...data.incomeStatement.revenue, ...data.incomeStatement.expenses,
        ...data.balanceSheet.currentAssets, ...data.balanceSheet.nonCurrentAssets,
        ...data.balanceSheet.currentLiabilities, ...data.balanceSheet.nonCurrentLiabilities,
        ...data.balanceSheet.equity,
    ];
    
    const allNotes = [
        ...(data.incomeStatement.notes || []),
        ...(data.balanceSheet.notes || []),
        ...(data.cashFlowStatement.notes || []),
    ];

    const uniqueNotes = [...new Map(allNotes.map(item => [item['id'], item])).values()].sort((a, b) => a.id - b.id);
    
    if (uniqueNotes.length > 0) {
        let noteCounter = 3;
        uniqueNotes.forEach(note => {
            const item = allItemsWithNotes.find(i => i.noteRef === note.id);
            const title = `4.${noteCounter} ${item ? item.item : 'Note ' + note.id}`;
            const tocTitle = `4.${noteCounter}   ${item ? item.item : 'Note ' + note.id}`;
            drawNoteSection(title, tocTitle, [note.content]);
            noteCounter++;
        });
    }

    // --- Directors' Declaration ---
    addPage();
    drawSectionHeader("5. Directors' Declaration", "5   Directors' Declaration");
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const declarationText = [
        "The directors have determined that the Company is not a reporting entity and that this special purpose financial report should be prepared in accordance with the accounting policies outlined in Note 1 to the financial statements. The directors of the Company declare that:",
        "1. The financial statements and notes present fairly the Company's financial position as at 30 June 2025 and its performance for the year ended on that date in accordance with the accounting policies described in Notes 1 to 3 to the financial statements; and",
        "2. In the directors' opinion there are reasonable grounds to believe that the Company will be able to pay its debts as and when they become due and payable.",
        "This declaration is made in accordance with a resolution of the Board of Directors."
    ];
    declarationText.forEach(line => {
         const splitText = doc.splitTextToSize(line, contentWidth);
         doc.text(splitText, margin, yPos);
         yPos += (splitText.length * 12) + 10;
         checkPageBreak();
    });
    yPos += 50;
    doc.text("Director (Chairman): Matthew Warnken", margin, yPos);
    yPos += 15;
    doc.text("Managing Director: Gary Wyatt", margin, yPos);
    yPos += 15;
    doc.text("Director: Julian Turecek", margin, yPos);
    yPos += 30;
    doc.text("Signed date:", margin, yPos);


    // --- 3. Go back and draw the TOC ---
    doc.setPage(tocPage);
    yPos = margin;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Contents', pageWidth / 2, yPos, { align: 'center' });
    yPos += 30;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const dotWidth = doc.getTextWidth('.');
    tocEntries.forEach(entry => {
        const xOffset = margin + (entry.indent * 20);
        doc.text(entry.title, xOffset, yPos);
        const textWidth = doc.getTextWidth(entry.title);
        const pageNumStr = String(entry.page);
        const pageNumWidth = doc.getTextWidth(pageNumStr);
        
        let availableWidth = rightMargin - xOffset - textWidth - pageNumWidth - 5;
        let dots = '.'.repeat(Math.max(0, Math.floor(availableWidth / dotWidth)));
        
        doc.text(dots, xOffset + textWidth + 2, yPos, { baseline: 'bottom' });
        doc.text(pageNumStr, rightMargin, yPos, { align: 'right' });
        yPos += 20;
    });


    // --- 4. Add Page Numbers to all pages ---
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${i}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
    }

    doc.save('AASB_Financial_Report_2025.pdf');
};