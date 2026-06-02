import { Suspense } from 'react';
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
      <Suspense fallback={<div className="max-w-lg mx-auto px-4 pb-24 pt-5"><div className="h-6 w-32 bg-[#F1F3F7] rounded animate-pulse mb-4" /><div className="h-40 bg-[#F1F3F7] rounded-[20px] animate-pulse mb-6" /></div>}>
      <InsightsView
        period={period}
        monthName={monthName}
        totalSpent={metrics.totalSpent}
        expenseCount={metrics.expenseCount}
        changePct={changePct}
        insights={insights}
        billingClosingDay={closingDay}
      />
      </Suspense>
  );
}
