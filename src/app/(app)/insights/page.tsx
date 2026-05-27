import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import InsightsView from './InsightsView';
import { getDashboardMetrics } from '@/lib/expenses';
import { getUserInsights } from '@/lib/insights';
import { getCurrentPeriod, getPreviousPeriod } from '@/lib/utils';
import { createSessionClient } from '@/lib/supabase/server';


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
      <Suspense fallback={<div className="max-w-lg mx-auto px-4 pb-24 pt-5"><div className="h-6 w-32 bg-[#F1F3F7] rounded animate-pulse mb-4" /><div className="h-40 bg-[#F1F3F7] rounded-[20px] animate-pulse mb-6" /></div>}>
      <InsightsView
        period={period}
        monthName={monthName}
        totalSpent={metrics.totalSpent}
        expenseCount={metrics.expenseCount}
        changePct={changePct}
        insights={insights}
      />
      </Suspense>
  );
}
