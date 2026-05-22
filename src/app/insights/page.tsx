import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import InsightsView from './InsightsView';
import { getDashboardMetrics } from '@/lib/expenses';
import { getUserInsights } from '@/lib/insights';
import { getCategories } from '@/lib/categories';
import { getCurrentPeriod, getPreviousPeriod } from '@/lib/utils';
import { createSessionClient } from '@/lib/supabase/server';

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

  const [metrics, prevMetrics, insights, categories] = await Promise.all([
    getDashboardMetrics(user.id, period),
    getDashboardMetrics(user.id, prevPeriod),
    getUserInsights(user.id),
    getCategories(user.id),
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
        categories={categories}
      />
    </AppShell>
  );
}
