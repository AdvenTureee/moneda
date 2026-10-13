export type TransactionType = 'expense' | 'income';

export interface InstallmentInfo {
  /** Número da parcela no extrato (ex.: 2 em "Parcela 2/5"). */
  current: number;
  /** Total de parcelas da compra (ex.: 5 em "Parcela 2/5"). */
  total: number;
}

export interface ParsedTransaction {
  id: string;
  date: string;
  amountCents: number;
  description: string;
  type: TransactionType;
  suggestedCategoryId: string | null;
  confidence: 'high' | 'low' | 'none';
  selected: boolean;
  /** Preenchido quando o título traz marcador de parcela (ex.: "PARC 02/05"). */
  installment?: InstallmentInfo | null;
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
  installment?: InstallmentInfo | null;
}

export interface ConfirmResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export const MAX_TRANSACTIONS_PER_IMPORT = 500;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
