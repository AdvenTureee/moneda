/**
 * Tipos de domínio compartilhados.
 *
 * Espelha src/types/index.ts no web Next.js. Mantemos estes tipos aqui para
 * que o mobile (Expo) e o web concordem na estrutura de Expense, Category,
 * Budget, etc. — sem precisar importar nada de Next.
 */

export type ExpenseSource = 'whatsapp' | 'manual' | 'import';
export type ExpensePaymentMethod =
  | 'pix'
  | 'debit'
  | 'credit'
  | 'cash'
  | 'boleto'
  | 'transfer'
  | 'other';
export type CreditPurchaseType = 'single' | 'installment';
export type ExpenseSeriesKind = 'recurring' | 'installment';
export type AIInsightType = 'monthly_summary' | 'category_alert' | 'spending_pattern';
export type WhatsAppMessageStatus = 'received' | 'parsed' | 'failed' | 'responded';

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

export type IncomeSource =
  | 'salary'
  | 'freelance'
  | 'investment'
  | 'rent'
  | 'gift'
  | 'other';

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
