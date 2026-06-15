import { type NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';
import { getExpenses } from '@/lib/expenses';
import { noStoreJson, SENSITIVE_RESPONSE_HEADERS } from '@/lib/http';
import type { ExpensePaymentMethod } from '@/types';

const PAYMENT_LABELS: Record<ExpensePaymentMethod, string> = {
  pix: 'PIX',
  debit: 'Débito',
  credit: 'Crédito',
  cash: 'Dinheiro',
  boleto: 'Boleto',
  transfer: 'Transferência',
  other: 'Outro',
};

const CREDIT_PURCHASE_LABELS = {
  single: 'À vista',
  installment: 'Parcelado',
} as const;

const SERIES_KIND_LABELS = {
  recurring: 'Recorrente',
  installment: 'Parcelamento',
} as const;

const SOURCE_LABELS = {
  whatsapp: 'WhatsApp',
  manual: 'Manual',
  import: 'Importação',
} as const;

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

function toCsvLine(values: unknown[]): string {
  return values.map(csvEscape).join(',');
}

function formatAmount(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

function parseDateRangeParam(value: string | null, boundary: 'start' | 'end'): string | null {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = boundary === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59, 999);
    return date.toISOString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function GET(request: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  const startParam = request.nextUrl.searchParams.get('startDate') ?? request.nextUrl.searchParams.get('from');
  const endParam = request.nextUrl.searchParams.get('endDate') ?? request.nextUrl.searchParams.get('to');
  const startDate = parseDateRangeParam(startParam, 'start');
  const endDate = parseDateRangeParam(endParam, 'end');

  if ((startParam && !startDate) || (endParam && !endDate)) {
    return noStoreJson({ error: 'Período inválido.' }, { status: 400 });
  }
  if (startDate && endDate && new Date(startDate).getTime() > new Date(endDate).getTime()) {
    return noStoreJson({ error: 'Data inicial maior que data final.' }, { status: 400 });
  }

  const expenses = await getExpenses({
    userId: user.id,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  });

  const header = [
    'Data',
    'Descrição',
    'Categoria',
    'Valor',
    'Forma de pagamento',
    'Tipo de compra no crédito',
    'Parcela atual',
    'Total de parcelas',
    'Recorrente',
    'Tipo da série',
    'Ocorrência da série',
    'Total da série',
    'Fonte',
    'Tags',
    'Nome do comprovante',
    'Tipo do comprovante',
    'Tamanho do comprovante (bytes)',
    'Comprovante enviado em',
  ];

  const lines = [toCsvLine(header)];
  for (const e of expenses) {
    lines.push(
      toCsvLine([
        new Date(e.createdAt).toISOString(),
        e.description,
        e.categoryData?.name ?? '',
        formatAmount(e.amount),
        PAYMENT_LABELS[e.paymentMethod],
        e.creditDetails?.purchaseType ? CREDIT_PURCHASE_LABELS[e.creditDetails.purchaseType] : '',
        e.creditDetails?.installmentCurrent ?? '',
        e.creditDetails?.installmentTotal ?? '',
        e.isRecurring ? 'sim' : 'não',
        e.seriesKind ? SERIES_KIND_LABELS[e.seriesKind] : '',
        e.seriesOccurrenceIndex ?? '',
        e.seriesTotalOccurrences ?? '',
        SOURCE_LABELS[e.source],
        e.tags.join(';'),
        e.receipt?.fileName ?? '',
        e.receipt?.mimeType ?? '',
        e.receipt?.sizeBytes ?? '',
        e.receipt?.uploadedAt ? e.receipt.uploadedAt.toISOString() : '',
      ]),
    );
  }

  const csv = '﻿' + lines.join('\n');
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="moneda-export-${today}.csv"`,
      ...SENSITIVE_RESPONSE_HEADERS,
    },
  });
}
