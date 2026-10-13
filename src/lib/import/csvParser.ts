import Papa from 'papaparse';
import type { ParsedTransaction } from './types';

function generateTempId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DATE_HEADERS = [
  'data', 'data mov', 'data movimento', 'data transacao',
  'data lancamento', 'data pgto', 'data pagamento',
  'data operacao', 'dia',
];

const AMOUNT_HEADERS = [
  'valor', 'amount', 'valor r$', 'valor operacao',
  'valor transacao', 'valor lancamento',
];

const DESCRIPTION_HEADERS = [
  'historico', 'descricao', 'description', 'estabelecimento',
  'nome', 'memo', 'detalhe', 'origem', 'lancamento',
  'desc历史', 'historicoDescription'.toLowerCase(),
];

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findColumnIndex(
  headers: string[],
  candidates: string[],
): number {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const normCandidate = normalizeHeader(candidate);
    const exact = normalized.indexOf(normCandidate);
    if (exact !== -1) return exact;
  }
  for (const candidate of candidates) {
    const normCandidate = normalizeHeader(candidate);
    const partial = normalized.findIndex((h) =>
      h.includes(normCandidate) || normCandidate.includes(h),
    );
    if (partial !== -1) return partial;
  }
  return -1;
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  const ddMMyyyy = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (ddMMyyyy) {
    const [, d, m, y] = ddMMyyyy;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (!Number.isNaN(new Date(iso).getTime())) return iso;
  }

  const yyyyMMdd = trimmed.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
  if (yyyyMMdd) {
    const [, y, m, d] = yyyyMMdd;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (!Number.isNaN(new Date(iso).getTime())) return iso;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function parseAmount(raw: string): number {
  if (!raw) return 0;
  let cleaned = raw.trim();

  const isNegative =
    cleaned.startsWith('-') ||
    cleaned.startsWith('(') ||
    /D|C\s*$/.test(cleaned) === false && /debito/i.test(cleaned);

  cleaned = cleaned
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const value = parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.abs(value) * 100);
}

function detectType(raw: string, amountCents: number): 'expense' | 'income' {
  if (!raw) return 'expense';
  const lower = raw.toLowerCase().trim();

  if (lower.startsWith('-') || lower.startsWith('(')) return 'expense';
  if (lower.startsWith('+')) return 'income';

  if (/credito|cr|entrada|receb/i.test(lower)) return 'income';
  if (/debito|db|saida|pagamento/i.test(lower)) return 'expense';

  return 'expense';
}

function hasExtraAmountColumn(
  headers: string[],
  rows: Record<string, string>[],
): { expenseIdx: number; incomeIdx: number } | null {
  const normalized = headers.map(normalizeHeader);
  const expenseIdx = normalized.findIndex((h) =>
    /saida|debito|valor pago|valor deb/.test(h),
  );
  const incomeIdx = normalized.findIndex((h) =>
    /entrada|credito|valor receb/.test(h),
  );

  if (expenseIdx === -1 && incomeIdx === -1) return null;
  return { expenseIdx, incomeIdx };
}

export function parseCSVContent(content: string): {
  transactions: ParsedTransaction[];
} {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    delimiter: '',
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type === 'Delimiter');
    if (fatal) {
      console.error('[csvParser] parse error:', fatal);
    }
  }

  const rows = result.data.filter((r) =>
    Object.values(r).some((v) => v && v.trim()),
  );

  if (rows.length === 0) {
    return { transactions: [] };
  }

  const headers = result.meta.fields ?? Object.keys(rows[0]);
  const dateIdx = findColumnIndex(headers, DATE_HEADERS);
  const amountIdx = findColumnIndex(headers, AMOUNT_HEADERS);
  const descIdx = findColumnIndex(headers, DESCRIPTION_HEADERS);
  const extraCols = hasExtraAmountColumn(headers, rows);

  if (dateIdx === -1 || (amountIdx === -1 && !extraCols)) {
    throw new Error(
      'Não foi possível identificar as colunas de data e valor no CSV. ' +
      'Verifique se o arquivo possui colunas como "Data", "Valor" e "Histórico".',
    );
  }

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const dateRaw = row[headers[dateIdx]] ?? '';
    const date = parseDate(dateRaw);
    if (!date) continue;

    let amountCents = 0;
    let type: 'expense' | 'income' = 'expense';

    if (extraCols) {
      if (extraCols.expenseIdx !== -1) {
        const expRaw = row[headers[extraCols.expenseIdx]] ?? '';
        const expCents = parseAmount(expRaw);
        if (expCents > 0) {
          amountCents = expCents;
          type = 'expense';
        }
      }
      if (extraCols.incomeIdx !== -1) {
        const incRaw = row[headers[extraCols.incomeIdx]] ?? '';
        const incCents = parseAmount(incRaw);
        if (incCents > 0) {
          amountCents = incCents;
          type = 'income';
        }
      }
    } else if (amountIdx !== -1) {
      const amountRaw = row[headers[amountIdx]] ?? '';
      amountCents = parseAmount(amountRaw);
      type = detectType(amountRaw, amountCents);
    }

    if (amountCents === 0) continue;

    let description = 'Transação';
    if (descIdx !== -1) {
      const desc = (row[headers[descIdx]] ?? '').trim();
      if (desc) description = desc;
    }

    transactions.push({
      id: generateTempId(),
      date,
      amountCents,
      description,
      type,
      suggestedCategoryId: null,
      confidence: 'none',
      selected: true,
    });
  }

  return { transactions };
}
