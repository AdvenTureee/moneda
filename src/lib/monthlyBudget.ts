import { unstable_cache } from 'next/cache';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { cacheTags } from '@/lib/cache';

/**
 * Orçamento mensal disponível para o usuário.
 *
 * Fórmula:
 *   profiles.monthly_income_cents (renda base declarada no onboarding)
 *   + soma de incomes ativos válidos no período:
 *       - is_recurring = true       → conta todo mês
 *       - is_recurring = false      → conta apenas se received_at ∈ período
 *
 * Period no formato 'YYYY-MM'.
 */
async function getMonthlyBudgetCentsImpl(
  userId: string,
  period: string,
): Promise<number> {
  if (!isSupabaseEnabled()) return 0;

  const db = createServiceClient();

  const [{ data: profile }, { data: incomes }] = await Promise.all([
    db.from('profiles').select('monthly_income_cents').eq('id', userId).single(),
    db
      .from('incomes')
      .select('amount_cents,is_recurring,received_at')
      .eq('user_id', userId)
      .is('deleted_at', null),
  ]);

  const base = profile?.monthly_income_cents ?? 0;

  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr); // 1..12
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 1);

  const incomesTotal = (incomes ?? []).reduce((sum, row) => {
    if (row.is_recurring) return sum + row.amount_cents;
    const received = new Date(row.received_at);
    if (received >= periodStart && received < periodEnd) return sum + row.amount_cents;
    return sum;
  }, 0);

  return base + incomesTotal;
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
