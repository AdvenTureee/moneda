import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import InsightsView from './InsightsView';
import { getDashboardMetrics } from '@/lib/expenses';
import { getUserInsights } from '@/lib/insights';
import { getCurrentPeriod, getPreviousPeriod } from '@/lib/utils';
import { createSessionClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/data/mock';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const period = getCurrentPeriod();
  const prevPeriod = getPreviousPeriod(period);

  const [metrics, prevMetrics, insights] = await Promise.all([
    getDashboardMetrics(user.id, period),
    getDashboardMetrics(user.id, prevPeriod),
    getUserInsights(user.id),
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
        categories={CATEGORIES}
      />
    </AppShell>
  );
}
