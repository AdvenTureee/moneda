import { unstable_cache } from 'next/cache';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { cacheTags } from '@/lib/cache';

/**
 * Teto mensal planejado pelo usuário.
 *
 * Fonte principal:
 *   profiles.monthly_budget_cents (expectativa de gasto declarada no onboarding)
 *
 * Period no formato 'YYYY-MM'.
 */
async function getMonthlyBudgetCentsImpl(
  userId: string,
  period: string,
): Promise<number> {
  if (!isSupabaseEnabled()) return 0;

  const db = createServiceClient();

  const { data: profile } = await db
    .from('profiles')
    .select('monthly_budget_cents,monthly_income_cents')
    .eq('id', userId)
    .single();

  return profile?.monthly_budget_cents ?? profile?.monthly_income_cents ?? 0;
}

export async function getMonthlyBudgetCents(
  userId: string,
  period: string,
): Promise<number> {
  return unstable_cache(
    () => getMonthlyBudgetCentsImpl(userId, period),
    ['monthly-budget-cents', userId, period],
    {
      // Renda + incomes mudam raramente; invalida via revalidateTag em
      // saveIncomeAction/deleteIncomeAction.
      tags: [cacheTags.profile(userId), cacheTags.budgets(userId)],
      revalidate: 300,
    },
  )();
}
