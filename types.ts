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
}

export interface SingleFinancialValue {
    amount2025: number;
    amount2024: number;
}

export interface NoteItem {
  title: string;
  content: string;
}

export interface IncomeStatement {
    revenue: FinancialItem[];
    expenses: FinancialItem[];
    grossProfit: SingleFinancialValue;
    operatingIncome: SingleFinancialValue;
    netProfit: SingleFinancialValue;
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
}

export interface CashFlowStatement {
    operatingActivities: FinancialItem[];
    investingActivities: FinancialItem[];
    financingActivities: FinancialItem[];
    netChangeInCash: SingleFinancialValue;
}

export interface ReportData {
  summary: string;
  kpis: KPI[];
  notes: NoteItem[];
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  cashFlowStatement: CashFlowStatement;
}