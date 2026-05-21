import { NextRequest, NextResponse } from 'next/server';
import { getExpenses, createExpense } from '@/lib/expenses';
import type { ExpenseFilters, ExpenseInput } from '@/types';
import { createSessionClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filters: ExpenseFilters = {
    userId: user.id,
    category: searchParams.get('category') ?? undefined,
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
    search: searchParams.get('search') ?? undefined,
  };

  const expenses = await getExpenses(filters);
  return NextResponse.json({ data: expenses, count: expenses.length });
}

export async function POST(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Partial<ExpenseInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.amount || !body.category) {
    return NextResponse.json(
      { error: 'amount and category are required' },
      { status: 422 }
    );
  }

  const input: ExpenseInput = {
    userId: user.id,
    amount: body.amount,
    category: body.category,
    description: body.description ?? 'Gasto',
    source: body.source ?? 'manual',
    tags: body.tags ?? [],
  };

  const expense = await createExpense(input);
  return NextResponse.json({ data: expense }, { status: 201 });
}
