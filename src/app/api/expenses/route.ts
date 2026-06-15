import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getFeedExpensesPage, createExpense, updateExpense, deleteExpense } from '@/lib/expenses';
import type { ExpenseFilters, ExpenseInput, ExpensePaymentMethod } from '@/types';
import { createSessionClient } from '@/lib/supabase/server';
import { cacheTags } from '@/lib/cache';
import { noStoreJson } from '@/lib/http';

const PAYMENT_METHODS = new Set<ExpensePaymentMethod>([
  'pix',
  'debit',
  'credit',
  'cash',
  'boleto',
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

function readBooleanParam(value: string | null): boolean {
  return value === 'true' || value === '1';
}

function readFeedOrder(searchParams: URLSearchParams): ExpenseFilters['order'] {
  const raw = searchParams.get('order');
  if (raw === 'history' || raw === 'scheduled') return raw;
  return readBooleanParam(searchParams.get('onlyFuture')) ? 'scheduled' : 'history';
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

function expenseMutationErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Erro desconhecido';
  const isPaymentMethodConstraint =
    message.includes('expenses_payment_method_check') ||
    message.includes('expense_series_payment_method_check');

  if (isPaymentMethodConstraint) {
    return noStoreJson(
      { error: 'Forma de pagamento ainda não está habilitada no banco de dados.' },
      { status: 422 },
    );
  }

  return noStoreJson({ error: message }, { status: 500 });
}

export async function GET(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const order = readFeedOrder(searchParams);
  const filters: ExpenseFilters = {
    userId: user.id,
    category: searchParams.get('category') ?? undefined,
    paymentMethod: readPaymentMethod({
      paymentMethod: searchParams.get('paymentMethod') ?? searchParams.get('payment_method') ?? undefined,
    }),
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
    includeFuture: readBooleanParam(searchParams.get('includeFuture')),
    onlyFuture: order === 'scheduled' || readBooleanParam(searchParams.get('onlyFuture')),
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
    cursor: searchParams.get('cursor') ?? undefined,
    order,
    search: searchParams.get('search') ?? undefined,
  };

  const page = await getFeedExpensesPage(filters);
  return noStoreJson(page);
}

export async function POST(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  let body: ExpenseBody;
  try {
    body = await req.json();
  } catch {
    return noStoreJson({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.amount || !body.category) {
    return noStoreJson(
      { error: 'amount and category are required' },
      { status: 422 }
    );
  }

  if (hasInvalidPaymentMethod(body)) {
    return noStoreJson({ error: 'paymentMethod is invalid' }, { status: 422 });
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

  try {
    const expense = await createExpense(input);
    invalidateExpenseCaches(user.id);
    return noStoreJson({ data: expense }, { status: 201 });
  } catch (error) {
    return expenseMutationErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  let body: { id: string } & ExpenseBody;
  try {
    body = await req.json();
  } catch {
    return noStoreJson({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.id) {
    return noStoreJson({ error: 'id is required' }, { status: 422 });
  }

  if (hasInvalidPaymentMethod(body)) {
    return noStoreJson({ error: 'paymentMethod is invalid' }, { status: 422 });
  }

  try {
    const expense = await updateExpense(body.id, user.id, {
      amount: body.amount,
      category: body.category,
      description: body.description,
      occurredAt: body.occurredAt,
      isRecurring: body.isRecurring,
      paymentMethod: readPaymentMethod(body),
      creditDetails: readPaymentMethod(body) === 'credit' ? body.creditDetails ?? null : null,
    });
    invalidateExpenseCaches(user.id);
    return noStoreJson({ data: expense });
  } catch (error) {
    return expenseMutationErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return noStoreJson({ error: 'id query param is required' }, { status: 422 });
  }

  await deleteExpense(id, user.id);
  invalidateExpenseCaches(user.id);
  return noStoreJson({ ok: true });
}
