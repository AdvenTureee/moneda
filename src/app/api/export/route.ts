import { NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';
import { getExpenses } from '@/lib/expenses';
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

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvLine(values: unknown[]): string {
  return values.map(csvEscape).join(',');
}

function formatAmount(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

export async function GET() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expenses = await getExpenses({ userId: user.id });

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
      'Cache-Control': 'no-store',
    },
  });
}
