import { redirect } from 'next/navigation';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { MOCK_USER } from '@/data/mock';
import { getBudgets } from '@/lib/budgets';
import { getCategories } from '@/lib/categories';
import { getMonthlyBudgetCents } from '@/lib/monthlyBudget';
import { getBillingClosingDay } from '@/lib/profiles';
import { getCurrentBillingPeriod } from '@/lib/billingCycle';
import BudgetForm from './BudgetForm';

export default async function OrcamentoPage() {
  let userId = MOCK_USER.id;

  if (isSupabaseEnabled()) {
    const supabase = await createSessionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    userId = user.id;
  }

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
