import type { Income, IncomeInput } from '@/types';
import type { Database } from '@/types/supabase';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { generateId } from '@/lib/utils';
import { unstable_cache } from 'next/cache';
import { cacheTags } from '@/lib/cache';
import { getBillingCycleForPeriod } from '@/lib/billingCycle';

type IncomesRow = Database['public']['Tables']['incomes']['Row'];
type IncomesInsert = Database['public']['Tables']['incomes']['Insert'];
type IncomesUpdate = Database['public']['Tables']['incomes']['Update'];

// In-memory store for fallback mode
let sessionIncomes: Income[] = [];

function rowToIncome(row: IncomesRow): Income {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount_cents,
    description: row.description,
    source: row.source as import('@/types').IncomeSource,
    isRecurring: row.is_recurring,
    recurringRule: row.recurring_rule,
    receivedAt: new Date(row.received_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getIncomes(userId: string): Promise<Income[]> {
  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const { data, error } = await db
      .from('incomes')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('received_at', { ascending: false });

    if (error) throw new Error(`getIncomes: ${error.message}`);
    return (data as IncomesRow[]).map(rowToIncome);
  }

  // Fallback
  return sessionIncomes.filter((i) => i.userId === userId);
}

async function getMonthlyIncomeTotalCentsImpl(
  userId: string,
  period: string,
  closingDay: number = 10,
): Promise<number> {
  const cycle = getBillingCycleForPeriod(period, closingDay);

  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const { data, error } = await db
      .from('incomes')
      .select('amount_cents')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('received_at', cycle.start.toISOString())
      .lte('received_at', cycle.end.toISOString());

    if (error) throw new Error(`getMonthlyIncomeTotalCents: ${error.message}`);
    return (data ?? []).reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
  }

  return sessionIncomes
    .filter((income) => {
      const d = new Date(income.receivedAt);
      return income.userId === userId && d >= cycle.start && d <= cycle.end;
    })
    .reduce((sum, income) => sum + income.amount, 0);
}

export async function getMonthlyIncomeTotalCents(
  userId: string,
  period: string,
  closingDay: number = 10,
): Promise<number> {
  return unstable_cache(
    () => getMonthlyIncomeTotalCentsImpl(userId, period, closingDay),
    ['monthly-income-total-cents', userId, period, String(closingDay)],
    {
      tags: [cacheTags.profile(userId)],
      revalidate: 300,
    },
  )();
}

export async function createIncome(input: IncomeInput): Promise<Income> {
  if (!input.userId) {
    throw new Error('userId é obrigatório para cadastrar ganho');
  }

  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const insert: IncomesInsert = {
      user_id: input.userId,
      amount_cents: input.amount,
      description: input.description,
      source: input.source,
      is_recurring: input.isRecurring,
      recurring_rule: input.recurringRule ?? null,
      received_at: input.receivedAt ? input.receivedAt.toISOString() : new Date().toISOString(),
    };

    const { data, error } = await db
      .from('incomes')
      .insert(insert)
      .select()
      .single();

    if (error) throw new Error(`createIncome: ${error.message}`);
    return rowToIncome(data as IncomesRow);
  }

  // Fallback
  const income: Income = {
    id: generateId(),
    userId: input.userId,
    amount: input.amount,
    description: input.description,
    source: input.source,
    isRecurring: input.isRecurring,
    recurringRule: input.recurringRule ?? null,
    receivedAt: input.receivedAt ?? new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  sessionIncomes = [income, ...sessionIncomes];
  return income;
}

export async function updateIncome(id: string, userId: string, input: IncomeInput): Promise<Income> {
  if (!userId) {
    throw new Error('userId é obrigatório para atualizar ganho');
  }

  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const update: IncomesUpdate = {
      amount_cents: input.amount,
      description: input.description,
      source: input.source,
      is_recurring: input.isRecurring,
      recurring_rule: input.recurringRule ?? null,
      received_at: input.receivedAt ? input.receivedAt.toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from('incomes')
      .update(update)
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw new Error(`updateIncome: ${error.message}`);
    return rowToIncome(data as IncomesRow);
  }

  const existing = sessionIncomes.find((income) => income.id === id && income.userId === userId);
  if (!existing) {
    throw new Error('Ganho não encontrado.');
  }

  const updated: Income = {
    ...existing,
    amount: input.amount,
    description: input.description,
    source: input.source,
    isRecurring: input.isRecurring,
    recurringRule: input.recurringRule ?? null,
    receivedAt: input.receivedAt ?? new Date(),
    updatedAt: new Date(),
  };

  sessionIncomes = sessionIncomes.map((income) => (
    income.id === id && income.userId === userId ? updated : income
  ));
  return updated;
}

export async function deleteIncome(id: string, userId: string): Promise<void> {
  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const { error } = await db
      .from('incomes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(`deleteIncome: ${error.message}`);
    return;
  }

  // Fallback
  sessionIncomes = sessionIncomes.filter((i) => !(i.id === id && i.userId === userId));
}
