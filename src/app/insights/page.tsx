import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import InsightsView from './InsightsView';
import { getDashboardMetrics, getMonthlyTotals } from '@/lib/expenses';
import { getBudgets } from '@/lib/budgets';
import { getUserInsights } from '@/lib/insights';
import { getCategories } from '@/lib/categories';
import { getCurrentPeriod, getPreviousPeriod } from '@/lib/utils';
import { createSessionClient } from '@/lib/supabase/server';
import type { BudgetProgressItem } from '@/components/charts/BudgetProgressList';

export const dynamic = 'force-dynamic';

function isValidPeriod(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const rawPeriod = Array.isArray(sp.period) ? sp.period[0] : sp.period;
  const period = isValidPeriod(rawPeriod) ? rawPeriod : getCurrentPeriod();
  const prevPeriod = getPreviousPeriod(period);

  const [metrics, prevMetrics, insights, categories, monthlyTotals, budgets] = await Promise.all([
    getDashboardMetrics(user.id, period),
    getDashboardMetrics(user.id, prevPeriod),
    getUserInsights(user.id),
    getCategories(user.id),
    getMonthlyTotals(user.id, period, 6),
    getBudgets(user.id, period),
  ]);

  const [year, month] = period.split('-').map(Number);
  const monthName = new Date(year, month - 1).toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const prevTotal = prevMetrics.totalSpent;
  const changePct = prevTotal > 0
    ? Math.round(((metrics.totalSpent - prevTotal) / prevTotal) * 100)
    : null;

  // Build budget-progress items: union of categories with spend and categories with budget.
  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b.amountCents]));
  const spentByCategory = new Map(metrics.topCategories.map((c) => [c.categoryId, c]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const allCategoryIds = new Set<string>([
    ...spentByCategory.keys(),
    ...budgetByCategory.keys(),
  ]);

  const budgetProgress: BudgetProgressItem[] = Array.from(allCategoryIds)
    .map((id): BudgetProgressItem | null => {
      const spentCat = spentByCategory.get(id);
      const cat = categoryById.get(id);
      const name = spentCat?.categoryName ?? cat?.name;
      const icon = spentCat?.categoryIcon ?? cat?.icon;
      const color = spentCat?.categoryColor ?? cat?.color;
      if (!name || !icon || !color) return null;
      return {
        categoryId: id,
        categoryName: name,
        categoryIcon: icon,
        categoryColor: color,
        spent: spentCat?.amount ?? 0,
        budget: budgetByCategory.get(id) ?? null,
      };
    })
    .filter((x): x is BudgetProgressItem => x !== null)
    .sort((a, b) => {
      const aPct = a.budget && a.budget > 0 ? a.spent / a.budget : 0;
      const bPct = b.budget && b.budget > 0 ? b.spent / b.budget : 0;
      if (aPct > 1 && bPct <= 1) return -1;
      if (bPct > 1 && aPct <= 1) return 1;
      return b.spent - a.spent;
    });

  return (
    <AppShell>
      <InsightsView
        period={period}
        monthName={monthName}
        totalSpent={metrics.totalSpent}
        expenseCount={metrics.expenseCount}
        changePct={changePct}
        topCategories={metrics.topCategories}
        insights={insights}
        categories={categories}
        monthlyTotals={monthlyTotals}
        budgetProgress={budgetProgress}
      />
    </AppShell>
  );
}
