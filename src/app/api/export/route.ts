import { NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';
import { getExpenses } from '@/lib/expenses';

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
    'data',
    'descricao',
    'categoria_id',
    'categoria',
    'valor',
    'fonte',
    'tags',
  ];

  const lines = [toCsvLine(header)];
  for (const e of expenses) {
    lines.push(
      toCsvLine([
        new Date(e.createdAt).toISOString(),
        e.description,
        e.category,
        e.categoryData?.name ?? '',
        formatAmount(e.amount),
        e.source,
        e.tags.join(';'),
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
