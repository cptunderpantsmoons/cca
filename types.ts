export interface KPI {
  name: string;
  value2025: string;
  value2024: string;
  changePercentage: number;
}

export interface FinancialItem {
  item: string;
  amount2025: number;
  amount2024: number;
  noteRef?: number; // Optional reference to a note ID
}

export interface SingleFinancialValue {
    amount2025: number;
    amount2024: number;
    noteRef?: number; // Optional reference to a note ID
}

export interface NoteItem {
  id: number;
  content: string;
}

export interface IncomeStatement {
    revenue: FinancialItem[];
    expenses: FinancialItem[];
    grossProfit: SingleFinancialValue;
    operatingIncome: SingleFinancialValue;
    netProfit: SingleFinancialValue;
    notes?: NoteItem[];
}

export interface BalanceSheet {
    currentAssets: FinancialItem[];
    nonCurrentAssets: FinancialItem[];
    currentLiabilities: FinancialItem[];
    nonCurrentLiabilities: FinancialItem[];
    equity: FinancialItem[];
    totalAssets: SingleFinancialValue;
    totalLiabilities: SingleFinancialValue;
    totalEquity: SingleFinancialValue;
    notes?: NoteItem[];
}

export interface CashFlowStatement {
    operatingActivities: FinancialItem[];
    investingActivities: FinancialItem[];
    financingActivities: FinancialItem[];
    netChangeInCash: SingleFinancialValue;
    notes?: NoteItem[];
}

export interface ReportData {
  summary: string;
  kpis: KPI[];
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  cashFlowStatement: CashFlowStatement;
}

// Types for the mathematical verification certificate
export interface VerificationCheck {
  name: string;
  principle: string;
  calculation: string;
  reported: string;
  discrepancy: number;
  passed: boolean;
  notes?: string;
}

export interface VerificationResult {
  overallStatus: 'Passed' | 'Failed' | 'Passed with Warnings';
  checks: VerificationCheck[];
  timestamp: string;
}