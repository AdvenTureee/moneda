import { redirect } from 'next/navigation';
import InsightsView from './InsightsView';
import { getDashboardMetrics } from '@/lib/expenses';
import { getUserInsights } from '@/lib/insights';
import { getPreviousPeriod, isValidPeriod } from '@/lib/utils';
import { createSessionClient } from '@/lib/supabase/server';
import { getBillingClosingDay } from '@/lib/profiles';
import { formatBillingCycleLabel, getCurrentBillingPeriod } from '@/lib/billingCycle';

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const closingDay = await getBillingClosingDay(user.id);
  const rawPeriod = Array.isArray(sp.period) ? sp.period[0] : sp.period;
  const period = isValidPeriod(rawPeriod) ? rawPeriod : getCurrentBillingPeriod(closingDay);
  const prevPeriod = getPreviousPeriod(period);

  const [metrics, prevMetrics, insights] = await Promise.all([
    getDashboardMetrics(user.id, period, closingDay),
    getDashboardMetrics(user.id, prevPeriod, closingDay),
    getUserInsights(user.id),
  ]);

  const monthName = formatBillingCycleLabel(period, closingDay);

  const prevTotal = prevMetrics.totalSpent;
  const changePct = prevTotal > 0
    ? Math.round(((metrics.totalSpent - prevTotal) / prevTotal) * 100)
    : null;

  return (
    <InsightsView
      period={period}
      monthName={monthName}
      totalSpent={metrics.totalSpent}
      expenseCount={metrics.expenseCount}
      changePct={changePct}
      insights={insights}
      billingClosingDay={closingDay}
    />
  );
}
