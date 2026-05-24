import { unstable_cache } from 'next/cache';
import type { Budget, BudgetInput } from '@/types';
import type { Database } from '@/types/supabase';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { generateId } from '@/lib/utils';
import { cacheTags } from '@/lib/cache';

type BudgetsRow = Database['public']['Tables']['budgets']['Row'];

// In-memory store for fallback mode
let sessionBudgets: Budget[] = [];

function rowToBudget(row: BudgetsRow): Budget {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    period: row.period,
    amountCents: row.amount_cents,
    createdAt: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

async function getBudgetsImpl(userId: string, period: string): Promise<Budget[]> {
  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const { data, error } = await db
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('period', period);

    if (error) throw new Error(`getBudgets: ${error.message}`);
    return (data as BudgetsRow[]).map(rowToBudget);
  }

  // Fallback
  return sessionBudgets.filter((b) => b.userId === userId && b.period === period);
}

export async function getBudgets(userId: string, period: string): Promise<Budget[]> {
  const raw = await unstable_cache(
    () => getBudgetsImpl(userId, period),
    ['budgets', userId, period],
    {
      tags: [cacheTags.budgets(userId)],
      revalidate: 60,
    },
  )();
  // unstable_cache serializa Date → string. Re-hidrata aqui.
  return raw.map((b) => ({
    ...b,
    createdAt: new Date(b.createdAt),
    updated_at: new Date(b.updated_at),
  }));
}

export async function upsertBudget(input: BudgetInput): Promise<Budget> {
  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    
    // We try to upsert. Note: since the unique key is (user_id, category_id, period) in the database:
    const { data, error } = await db
      .from('budgets')
      .upsert(
        {
          user_id: input.userId,
          category_id: input.categoryId,
          period: input.period,
          amount_cents: input.amountCents,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,category_id,period',
        }
      )
      .select()
      .single();

    if (error) throw new Error(`upsertBudget: ${error.message}`);
    return rowToBudget(data as BudgetsRow);
  }

  // Fallback in-memory
  const existingIndex = sessionBudgets.findIndex(
    (b) => b.userId === input.userId && b.categoryId === input.categoryId && b.period === input.period
  );

  if (existingIndex > -1) {
    sessionBudgets[existingIndex] = {
      ...sessionBudgets[existingIndex],
      amountCents: input.amountCents,
      updated_at: new Date(),
    };
    return sessionBudgets[existingIndex];
  } else {
    const budget: Budget = {
      id: generateId(),
      userId: input.userId,
      categoryId: input.categoryId,
      period: input.period,
      amountCents: input.amountCents,
      createdAt: new Date(),
      updated_at: new Date(),
    };
    sessionBudgets.push(budget);
    return budget;
  }
}
