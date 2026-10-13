import Papa from 'papaparse';
import type { ParsedTransaction, TransactionType } from './types';

function generateTempId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DATE_HEADERS = [
  'data', 'data mov', 'data movimento', 'data transacao',
  'data lancamento', 'data pgto', 'data pagamento',
  'data operacao', 'dia', 'data compra', 'data da transacao',
  'date', 'transaction date', 'post date', 'posting date', 'value date',
];

const AMOUNT_HEADERS = [
  'valor', 'amount', 'value', 'valor r$', 'valor operacao',
  'valor transacao', 'valor lancamento', 'valor da transacao',
  'transaction amount', 'montante', 'quantia',
];

const DESCRIPTION_HEADERS = [
  'historico', 'descricao', 'description', 'title', 'titulo', 'text',
  'estabelecimento', 'nome', 'memo', 'detalhe', 'origem', 'lancamento',
  'payee', 'contraparte', 'favorecido', 'historico da transacao',
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
      h.length >= 3 && (
        h.includes(normCandidate) || normCandidate.includes(h)
      ),
    );
    if (partial !== -1) return partial;
  }
  return -1;
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().normalize('NFKC');
  if (!trimmed) return null;

  // DD/MM/YYYY (ou MM/DD/YYYY quando o segundo campo passa de 12)
  const dmy = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (dmy) {
    const [, a, b, y] = dmy;
    // Padrão DD/MM por default; vira MM/DD apenas quando o segundo campo > 12.
    const day = Number(b) > 12 && Number(a) <= 12 ? Number(b) : Number(a);
    const month = Number(b) > 12 && Number(a) <= 12 ? Number(a) : Number(b);
    const iso = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!Number.isNaN(new Date(iso).getTime())) return iso;
  }

  const ymd = trimmed.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (!Number.isNaN(new Date(iso).getTime())) return iso;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function looksLikeDate(raw: string): boolean {
  return parseDate(raw) !== null;
}

/**
 * Converte um valor monetário bruto para centavos (sempre em módulo).
 * Aceita formatos pt-BR ("1.234,56"), en ("1,234.56"), sufixos D/C,
 * parênteses para negativos e símbolos de moeda.
 */
function parseAmount(raw: string): number {
  if (!raw) return 0;
  let s = raw.trim().normalize('NFKC');
  if (!s) return 0;

  s = s.replace(/[\u2212\u2013\u2014]/g, '-');
  s = s.replace(/[R$€£\s]/g, '');
  s = s.replace(/(brl|usd|eur)$/i, '');
  s = s.replace(/^\((.*)\)$/, '-$1');
  if (/[dc]$/i.test(s) && /\d$/.test(s.slice(0, -1))) {
    s = s.slice(0, -1);
  }

  if (s.startsWith('-')) s = s.slice(1);
  else if (s.startsWith('+')) s = s.slice(1);

  if (!/\d/.test(s)) return 0;

  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) {
    // Milhar com separador de grupo: 1.234 ou 1,234
    s = s.replace(/[.,]/g, '');
  } else if (/^\d{1,3}([.,]\d{3})+[.,]\d{1,2}$/.test(s)) {
    // Milhar + decimal: 1.234,56 ou 1,234.56 — o último separador é decimal
    const match = s.match(/^([\d.,]+?)[.,](\d{1,2})$/)!;
    s = match[1].replace(/[.,]/g, '') + '.' + match[2];
  } else if (/^\d+[.,]\d{1,2}$/.test(s)) {
    // Decimal simples: 67,26 ou 67.26
    s = s.replace(',', '.');
  } else if (!/^\d+$/.test(s)) {
    return 0;
  }

  const value = parseFloat(s);
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.abs(value) * 100);
}

function looksLikeAmount(raw: string): boolean {
  return parseAmount(raw) > 0;
}

const INCOME_REFUND_RE = /estorn|cashback|devolu|reembols|ressarc|restitui/i;
const INCOME_RE = /recebid|deposit|rendiment|sal[aá]rio|provento|creditad/i;

/**
 * Classifica o tipo da transação. Palavras-chave fortes (estorno, recebido,
 * etc.) vêm antes do sinal, porque nem todos os bancos usam o mesmo
 * convencional de sinal (conta: débito negativo; cartão: compra positiva).
 */
function detectType(raw: string, description: string): TransactionType {
  const value = (raw ?? '').trim();
  const lower = description.toLowerCase();

  if (INCOME_REFUND_RE.test(lower)) return 'income';
  if (INCOME_RE.test(lower)) return 'income';

  if (value.startsWith('-') || value.startsWith('(')) return 'expense';
  if (value.startsWith('+')) return 'income';

  const suffix = value.match(/([dc])$/i);
  if (suffix && value.length > 1 && /\d/.test(value[value.length - 2])) {
    return suffix[1].toLowerCase() === 'c' ? 'income' : 'expense';
  }

  return 'expense';
}

function hasExtraAmountColumn(
  headers: string[],
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

function columnRatio(
  rows: string[][],
  colIdx: number,
  predicate: (value: string) => boolean,
): { hits: number; total: number } {
  let hits = 0;
  let total = 0;
  for (const row of rows) {
    const value = row[colIdx]?.trim();
    if (!value) continue;
    total += 1;
    if (predicate(value)) hits += 1;
  }
  return { hits, total };
}

/**
 * Quando os nomes das colunas não batem com nenhum padrão conhecido,
 * infere as colunas pelo conteúdo das linhas.
 */
function inferColumnByContent(
  rows: string[][],
  colCount: number,
  kind: 'date' | 'amount' | 'description',
  excluded: number[] = [],
): number {
  const candidates: Array<{ idx: number; score: number }> = [];

  for (let i = 0; i < colCount; i += 1) {
    if (excluded.includes(i)) continue;
    if (kind === 'date') {
      const { hits, total } = columnRatio(rows, i, looksLikeDate);
      if (hits > 0 && hits / total >= 0.6) candidates.push({ idx: i, score: hits / total });
    } else if (kind === 'amount') {
      const { hits, total } = columnRatio(rows, i, (v) => looksLikeAmount(v) && !looksLikeDate(v));
      if (hits > 0 && hits / total >= 0.6) candidates.push({ idx: i, score: hits / total });
    } else {
      const { hits, total } = columnRatio(rows, i, (v) => /[a-zA-ZÀ-ú]/.test(v));
      if (hits > 0 && hits / total >= 0.3) candidates.push({ idx: i, score: hits / total });
    }
  }

  if (candidates.length === 0) return -1;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].idx;
}

/**
 * A primeira linha é cabeçalho apenas quando nenhuma célula parece dado
 * (data ou valor). Se parecer dado, o arquivo veio sem cabeçalho.
 */
function looksLikeHeaderRow(row: string[]): boolean {
  const filled = row.map((c) => c.trim()).filter(Boolean);
  if (filled.length === 0) return false;
  return filled.every((cell) => !looksLikeDate(cell) && !looksLikeAmount(cell));
}

export function parseCSVContent(content: string): {
  transactions: ParsedTransaction[];
} {
  const result = Papa.parse<string[]>(content.replace(/^\uFEFF/, ''), {
    header: false,
    skipEmptyLines: true,
    delimiter: '',
  });

  const matrix = (result.data as string[][]).filter((row) =>
    row.some((v) => v && v.trim()),
  );

  if (matrix.length === 0) {
    return { transactions: [] };
  }

  const hasHeader = looksLikeHeaderRow(matrix[0]);
  const headers = hasHeader ? matrix[0].map((h) => h.trim()) : [];
  const rows = hasHeader ? matrix.slice(1) : matrix;
  const colCount = matrix.reduce((max, row) => Math.max(max, row.length), 0);

  let dateIdx = hasHeader ? findColumnIndex(headers, DATE_HEADERS) : -1;
  let amountIdx = hasHeader ? findColumnIndex(headers, AMOUNT_HEADERS) : -1;
  let descIdx = hasHeader ? findColumnIndex(headers, DESCRIPTION_HEADERS) : -1;
  const extraCols = hasHeader ? hasExtraAmountColumn(headers) : null;

  const resolved: number[] = [dateIdx, amountIdx, descIdx].filter((i) => i !== -1);
  if (extraCols) {
    if (extraCols.expenseIdx !== -1) resolved.push(extraCols.expenseIdx);
    if (extraCols.incomeIdx !== -1) resolved.push(extraCols.incomeIdx);
  }

  if (dateIdx === -1) {
    dateIdx = inferColumnByContent(rows, colCount, 'date', resolved);
    if (dateIdx !== -1) resolved.push(dateIdx);
  }
  if (amountIdx === -1 && !extraCols) {
    amountIdx = inferColumnByContent(rows, colCount, 'amount', resolved);
    if (amountIdx !== -1) resolved.push(amountIdx);
  }
  if (descIdx === -1) {
    descIdx = inferColumnByContent(rows, colCount, 'description', resolved);
  }

  if (dateIdx === -1 || (amountIdx === -1 && !extraCols)) {
    throw new Error(
      'Não foi possível identificar as colunas de data e valor no CSV. ' +
      'Confira se o extrato tem colunas de data, descrição e valor.',
    );
  }

  const cell = (row: string[], idx: number): string => (idx >= 0 ? (row[idx] ?? '') : '');

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const date = parseDate(cell(row, dateIdx));
    if (!date) continue;

    let amountCents = 0;
    let type: TransactionType = 'expense';
    const description = descIdx !== -1 && cell(row, descIdx).trim()
      ? cell(row, descIdx).trim()
      : 'Transação';

    if (extraCols) {
      if (extraCols.expenseIdx !== -1) {
        const expCents = parseAmount(cell(row, extraCols.expenseIdx));
        if (expCents > 0) {
          amountCents = expCents;
          type = 'expense';
        }
      }
      if (extraCols.incomeIdx !== -1) {
        const incCents = parseAmount(cell(row, extraCols.incomeIdx));
        if (incCents > 0) {
          amountCents = incCents;
          type = 'income';
        }
      }
    } else {
      const amountRaw = cell(row, amountIdx);
      amountCents = parseAmount(amountRaw);
      type = detectType(amountRaw, description);
    }

    if (amountCents === 0) continue;

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
