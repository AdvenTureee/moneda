export type TransactionType = 'expense' | 'income';

export interface ParsedTransaction {
  id: string;
  date: string;
  amountCents: number;
  description: string;
  type: TransactionType;
  suggestedCategoryId: string | null;
  confidence: 'high' | 'low' | 'none';
  selected: boolean;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  source: 'ofx' | 'csv';
  bankName?: string;
  accountLast4?: string;
}

export interface ConfirmTransaction {
  date: string;
  amountCents: number;
  description: string;
  type: TransactionType;
  categoryId: string;
}

export interface ConfirmResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export const MAX_TRANSACTIONS_PER_IMPORT = 500;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
