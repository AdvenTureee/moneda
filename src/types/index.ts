export type ExpenseSource = 'whatsapp' | 'manual' | 'import';
export type ExpensePaymentMethod = 'pix' | 'debit' | 'credit' | 'cash' | 'boleto' | 'transfer' | 'other';
export type CreditPurchaseType = 'single' | 'installment';
export type ExpenseSeriesKind = 'recurring' | 'installment';
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
  /** Resolved from the categories table at the API boundary — preferred source for UI. */
  categoryData?: { id: string; name: string; icon: string; color: string };
  description: string;
  source: ExpenseSource;
  paymentMethod: ExpensePaymentMethod;
  creditDetails?: {
    purchaseType: CreditPurchaseType;
    installmentCurrent?: number;
    installmentTotal?: number;
  } | null;
  tags: string[];
  isRecurring?: boolean;
  seriesId?: string | null;
  seriesKind?: ExpenseSeriesKind | null;
  seriesOccurrenceIndex?: number | null;
  seriesTotalOccurrences?: number | null;
  receipt?: {
    path: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: Date;
  } | null;
  createdAt: Date;
}

export interface ExpenseInput {
  userId?: string;
  amount: number;
  category: string;
  description: string;
  source: ExpenseSource;
  paymentMethod?: ExpensePaymentMethod;
  creditDetails?: Expense['creditDetails'];
  tags: string[];
  /** ISO timestamp for when the expense happened. Defaults to now on create. */
  occurredAt?: string;
  isRecurring?: boolean;
}


export interface AIInsight {
  id: string;
  userId: string;
  type: AIInsightType;
  message: string;
  period: string;
  metadata: Record<string, unknown>;
  generatedAt: Date;
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
  /** Despesas do período agrupadas por categoryId — alimenta o modal de detalhe sem nova query. */
  expensesByCategory: Record<string, Expense[]>;
}

export type SpendingTimelineMode = 'year' | 'month' | 'day';

export interface SpendingTimelineBucket {
  key: string;
  label: string;
  amount: number;
  planned?: number;
}

export interface SpendingTimelineData {
  period: string;
  selectedDay: string;
  monthlyPlanned: number;
  annualPlanned: number;
  year: SpendingTimelineBucket[];
  month: SpendingTimelineBucket[];
  hourlyByDate: Record<string, SpendingTimelineBucket[]>;
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

export interface PendingEmailChange {
  id: string;
  userId: string;
  newEmail: string;
  expiresAt: Date;
  createdAt: Date;
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
  paymentMethod?: ExpensePaymentMethod;
  startDate?: string;
  endDate?: string;
  includeFuture?: boolean;
  onlyFuture?: boolean;
  limit?: number;
  search?: string;
}

export type IncomeSource = 'salary' | 'freelance' | 'investment' | 'rent' | 'gift' | 'other';

export interface Income {
  id: string;
  userId: string;
  amount: number; // in cents
  description: string;
  source: IncomeSource;
  isRecurring: boolean;
  recurringRule: any | null;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncomeInput {
  userId?: string;
  amount: number; // in cents
  description: string;
  source: IncomeSource;
  isRecurring: boolean;
  recurringRule?: any | null;
  receivedAt?: Date;
}
