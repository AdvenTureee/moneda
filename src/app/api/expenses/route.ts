import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '@/lib/expenses';
import type { ExpenseFilters, ExpenseInput, ExpensePaymentMethod } from '@/types';
import { createSessionClient } from '@/lib/supabase/server';
import { cacheTags } from '@/lib/cache';

const PAYMENT_METHODS = new Set<ExpensePaymentMethod>([
  'pix',
  'debit',
  'credit',
  'cash',
  'transfer',
  'other',
]);

type ExpenseBody = Omit<Partial<ExpenseInput>, 'paymentMethod'> & {
  paymentMethod?: unknown;
  payment_method?: unknown;
  creditDetails?: ExpenseInput['creditDetails'];
};

function readPaymentMethod(body: ExpenseBody): ExpensePaymentMethod | undefined {
  const raw = body.paymentMethod ?? body.payment_method;
  if (raw === undefined || raw === null || raw === '') return undefined;
  return typeof raw === 'string' && PAYMENT_METHODS.has(raw as ExpensePaymentMethod)
    ? (raw as ExpensePaymentMethod)
    : undefined;
}

function hasInvalidPaymentMethod(body: ExpenseBody): boolean {
  const raw = body.paymentMethod ?? body.payment_method;
  return raw !== undefined && raw !== null && raw !== '' && readPaymentMethod(body) === undefined;
}

function invalidateExpenseCaches(userId: string) {
  // Toda mutation de expense mexe em métricas/insights/monthly totals do usuário.
  // expire: 0 → invalida imediato (read-your-own-writes em Route Handler).
  const opts = { expire: 0 } as const;
  revalidateTag(cacheTags.expenses(userId), opts);
  revalidateTag(cacheTags.metrics(userId), opts);
  revalidateTag(cacheTags.insights(userId), opts);
  revalidateTag(cacheTags.monthlyTotals(userId), opts);
  revalidateTag(cacheTags.profile(userId), opts);
}

export async function GET(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filters: ExpenseFilters = {
    userId: user.id,
    category: searchParams.get('category') ?? undefined,
    paymentMethod: readPaymentMethod({
      paymentMethod: searchParams.get('paymentMethod') ?? searchParams.get('payment_method') ?? undefined,
    }),
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

  let body: ExpenseBody;
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

  if (hasInvalidPaymentMethod(body)) {
    return NextResponse.json({ error: 'paymentMethod is invalid' }, { status: 422 });
  }

  const input: ExpenseInput = {
    userId: user.id,
    amount: body.amount,
    category: body.category,
    description: body.description ?? 'Gasto',
    source: body.source ?? 'manual',
    paymentMethod: readPaymentMethod(body) ?? 'other',
    creditDetails: readPaymentMethod(body) === 'credit' ? body.creditDetails ?? null : null,
    tags: body.tags ?? [],
    occurredAt: body.occurredAt,
    isRecurring: body.isRecurring,
  };

  const expense = await createExpense(input);
  invalidateExpenseCaches(user.id);
  return NextResponse.json({ data: expense }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { id: string } & ExpenseBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 422 });
  }

  if (hasInvalidPaymentMethod(body)) {
    return NextResponse.json({ error: 'paymentMethod is invalid' }, { status: 422 });
  }

  const expense = await updateExpense(body.id, {
    amount: body.amount,
    category: body.category,
    description: body.description,
    occurredAt: body.occurredAt,
    isRecurring: body.isRecurring,
    paymentMethod: readPaymentMethod(body),
    creditDetails: readPaymentMethod(body) === 'credit' ? body.creditDetails ?? null : null,
  });
  invalidateExpenseCaches(user.id);
  return NextResponse.json({ data: expense });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id query param is required' }, { status: 422 });
  }

  await deleteExpense(id);
  invalidateExpenseCaches(user.id);
  return NextResponse.json({ ok: true });
}
