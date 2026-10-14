/**
 * Formatadores e parsers de moeda brasileira.
 *
 * - O Moneda armazena valores em centavos (inteiro) — isso evita float issues.
 * - `formatBRL(cents)` devolve "R$ 35,90" no padrão brasileiro.
 * - `parseBRLToCents(input)` aceita "1.234,56", "R$ 35,90", "35,90" e devolve cents.
 */

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Recebe centavos (inteiro) e devolve "R$ 1.234,56". */
export function formatBRL(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return brlFormatter.format(safe / 100);
}

/** Recebe centavos (inteiro) e devolve "1.234,56" sem prefixo de moeda. */
export function formatDecimal(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return decimalFormatter.format(safe / 100);
}

/**
 * Converte string pt-BR em centavos.
 * Aceita "1.234,56", "R$ 35,90", "35,90", "35.90" (tolerante) e afins.
 * Retorna null se não conseguir parsear.
 */
export function parseBRLToCents(input: string): number | null {
  if (typeof input !== 'string') return null;
  const cleaned = input
    .replace(/[R$\s]/gi, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '') // remove separador de milhar
    .replace(',', '.') // vírgula decimal → ponto
    .trim();

  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Sanitiza string crua devolvendo cents (0 se inválida). */
export function safeParseBRLToCents(input: string): number {
  return parseBRLToCents(input) ?? 0;
}
