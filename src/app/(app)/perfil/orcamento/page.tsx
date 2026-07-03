import { createSessionClient, isSupabaseEnabled, requireUserId } from '@/lib/supabase/server';
import { getBudgets } from '@/lib/budgets';
import { getCategories } from '@/lib/categories';
import { getMonthlyBudgetCents } from '@/lib/monthlyBudget';
import { getBillingClosingDay } from '@/lib/profiles';
import { getCurrentBillingPeriod } from '@/lib/billingCycle';
import BudgetForm from './BudgetForm';

export default async function OrcamentoPage() {
  const userId = await requireUserId();

  const closingDay = isSupabaseEnabled() ? await getBillingClosingDay(userId) : 10;
  const period = getCurrentBillingPeriod(closingDay);
  const [budgets, categories, monthlyBudgetCents] = await Promise.all([
    getBudgets(userId, period),
    getCategories(userId),
    getMonthlyBudgetCents(userId, period),
  ]);

  return (
    <BudgetForm
      initialBudgets={budgets}
      period={period}
      billingClosingDay={closingDay}
      initialCategories={categories}
      monthlyBudgetCents={monthlyBudgetCents}
    />
  );
}
