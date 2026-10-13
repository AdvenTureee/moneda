import type { InstallmentInfo, TransactionType } from './types';

/**
 * Marcadores de parcela comuns em extratos:
 *   "Parcela 1/2", "PARC 02/05", "PARC. 3 DE 10", "PAR 1/12"
 * A barra/"de" exige o prefixo PARC/PARCELA/PAR para não confundir com datas
 * ("12/10") ou frações dentro de títulos.
 */
const INSTALLMENT_RE = /\b(?:parc(?:ela)?|par)\.?\s*(\d{1,2})\s*(?:\/|de|-)\s*(\d{1,2})\b/i;
const INSTALLMENT_RE_GLOBAL = new RegExp(INSTALLMENT_RE.source, 'gi');
const MAX_INSTALLMENTS = 120;

export function parseInstallmentMarker(description: string): InstallmentInfo | null {
  const match = description.match(INSTALLMENT_RE);
  if (!match) return null;

  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isInteger(current) || !Number.isInteger(total)) return null;
  if (total < 2 || total > MAX_INSTALLMENTS) return null;
  if (current < 1 || current > total) return null;

  return { current, total };
}

/** Remove o marcador de parcela e separadores que sobram ("Loja - NuPay - Parcela 1/2" -> "Loja - NuPay"). */
export function stripInstallmentMarker(description: string): string {
  return description
    .replace(INSTALLMENT_RE_GLOBAL, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(\s-){2,}/g, ' -')
    .replace(/\s*-\s*$/, '')
    .trim();
}

/** Chave estável do estabelecimento: sem parcela, sem acentos, caixa alta, só alfanuméricos. */
export function merchantKey(description: string): string {
  return stripInstallmentMarker(description)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

export interface SeriesInput {
  date: string;
  amountCents: number;
  description: string;
  type: TransactionType;
  installment?: InstallmentInfo | null;
}

export type SeriesGroupKind = 'single' | 'installment' | 'recurring';

export interface SeriesGroup<T extends SeriesInput> {
  kind: SeriesGroupKind;
  /** Itens cobertos por esta série (ou o próprio item, em "single"). */
  members: T[];
}

function monthOf(date: string): string {
  return date.slice(0, 7);
}

/**
 * Agrupa as transações que devem virar uma única série no app:
 *
 * - Parcelado: mesma compra (título + total de parcelas + valor). Uma série
 *   cobre todas as parcelas do extrato; o app gera as demais ocorrências.
 * - Recorrente: mesmo título + mesmo valor em pelo menos 2 meses diferentes.
 *   Uma série por título; se houver mais de uma compra no mesmo mês, as
 *   excedentes ficam como lançamentos avulsos.
 * - Demais itens: lançamentos avulsos, como antes.
 *
 * Receitas nunca entram em série.
 */
export function planSeriesGroups<T extends SeriesInput>(items: T[]): SeriesGroup<T>[] {
  const buckets = new Map<string, T[]>();
  const order: string[] = [];

  items.forEach((item, index) => {
    let key: string;
    if (item.type === 'expense' && item.installment) {
      key = `I|${merchantKey(item.description)}|${item.installment.total}|${item.amountCents}`;
    } else if (item.type === 'expense') {
      key = `R|${merchantKey(item.description)}|${item.amountCents}`;
    } else {
      key = `S|${index}`;
    }
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(item);
  });

  const groups: SeriesGroup<T>[] = [];

  for (const key of order) {
    const members = [...buckets.get(key)!].sort((a, b) => a.date.localeCompare(b.date));

    if (key.startsWith('I|')) {
      groups.push({ kind: 'installment', members });
      continue;
    }

    if (key.startsWith('R|')) {
      const firstPerMonth: T[] = [];
      const extras: T[] = [];
      const seenMonths = new Set<string>();
      for (const member of members) {
        const month = monthOf(member.date);
        if (seenMonths.has(month)) {
          extras.push(member);
        } else {
          seenMonths.add(month);
          firstPerMonth.push(member);
        }
      }

      if (firstPerMonth.length >= 2) {
        groups.push({ kind: 'recurring', members: firstPerMonth });
        for (const extra of extras) groups.push({ kind: 'single', members: [extra] });
        continue;
      }
    }

    for (const member of members) groups.push({ kind: 'single', members: [member] });
  }

  return groups;
}
