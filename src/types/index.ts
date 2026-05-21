export type ExpenseSource = 'whatsapp' | 'manual' | 'import';
export type AIInsightType = 'monthly_summary' | 'category_alert' | 'spending_pattern';
export type WhatsAppMessageStatus = 'received' | 'parsed' | 'failed' | 'responded';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  keywords: string[];
}

export interface Expense {
  id: string;
  userId: string;
  /** Amount in centavos (e.g. 3500 = R$ 35,00) */
  amount: number;
  category: string;
  description: string;
  source: ExpenseSource;
  tags: string[];
  createdAt: Date;
}

export interface ExpenseInput {
  userId: string;
  amount: number;
  category: string;
  description: string;
  source: ExpenseSource;
  tags: string[];
}

export interface AIInsight {
  id: string;
  userId: string;
  type: AIInsightType;
  message: string;
  period: string;
  createdAt: Date;
}

export interface WhatsAppMessage {
  id: string;
  phone: string;
  rawText: string;
  parsedExpenseId: string | null;
  status: WhatsAppMessageStatus;
  createdAt: Date;
}

export interface DashboardMetrics {
  period: string;
  totalSpent: number;
  expenseCount: number;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    amount: number;
    percentage: number;
  }>;
  dailySpending: Array<{
    date: string;
    amount: number;
  }>;
  recentExpenses: Expense[];
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  /** '2026-05' = orçamento para maio/2026; 'default' = padrão mensal recorrente. */
  period: string;
  /** Amount in centavos (e.g. 50000 = R$ 500,00) */
  amountCents: number;
  createdAt: Date;
  updated_at: Date;
}

export interface BudgetInput {
  userId: string;
  categoryId: string;
  period: string;
  amountCents: number;
}

export interface ExpenseFilters {
  userId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  search?: string;
}
