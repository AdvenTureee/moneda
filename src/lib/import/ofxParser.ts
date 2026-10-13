import { parse as parseOFX } from 'ofx-parser';
import type { ParsedTransaction } from './types';

function generateTempId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseOFXDate(dateStr: string): string | null {
  if (!dateStr || dateStr.length < 8) return null;
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  const iso = `${year}-${month}-${day}`;
  if (Number.isNaN(new Date(iso).getTime())) return null;
  return iso;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d.-]/g, '');
  const value = parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.abs(value) * 100);
}

export function parseOFXContent(content: string): {
  transactions: ParsedTransaction[];
  bankName?: string;
  accountLast4?: string;
} {
  try {
    const result = parseOFX(content);
    const bankMsgs = result.body?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS;
    if (!bankMsgs) {
      return { transactions: [] };
    }

    const bankId = bankMsgs.BANKACCTFROM?.BANKID;
    const acctId = bankMsgs.BANKACCTFROM?.ACCTID;
    const accountLast4 = acctId ? acctId.slice(-4) : undefined;

    const tranList = bankMsgs.BANKTRANLIST;
    const rawTxns = tranList?.STMTTRN;
    if (!rawTxns) {
      return { transactions: [], accountLast4 };
    }

    const txns = Array.isArray(rawTxns) ? rawTxns : [rawTxns];

    const transactions: ParsedTransaction[] = txns
      .map((tx): ParsedTransaction | null => {
        const date = parseOFXDate(tx.DTPOSTED ?? '');
        const amountCents = parseAmount(tx.TRNAMT ?? '0');
        const rawName = (tx.NAME ?? '').trim();
        const rawMemo = (tx.MEMO ?? '').trim();
        const description = rawName || rawMemo || 'Transação';

        if (!date || amountCents === 0) return null;

        const rawAmount = parseFloat((tx.TRNAMT ?? '0').replace(/[^\d.-]/g, ''));
        const type: 'expense' | 'income' = rawAmount < 0 ? 'expense' : 'income';

        return {
          id: generateTempId(),
          date,
          amountCents,
          description,
          type,
          suggestedCategoryId: null,
          confidence: 'none',
          selected: true,
        };
      })
      .filter((tx): tx is ParsedTransaction => tx !== null);

    return {
      transactions,
      accountLast4,
      bankName: bankId,
    };
  } catch (err) {
    console.error('[ofxParser] parse error:', err);
    throw new Error('Não foi possível ler o arquivo OFX. Verifique se o formato é válido.');
  }
}
