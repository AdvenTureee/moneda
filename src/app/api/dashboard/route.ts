import { NextRequest, NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/expenses';
import { createSessionClient } from '@/lib/supabase/server';
import { getBillingClosingDay } from '@/lib/profiles';
import { getCurrentBillingPeriod } from '@/lib/billingCycle';

export async function GET(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const closingDay = await getBillingClosingDay(user.id);
  const period = searchParams.get('period') ?? getCurrentBillingPeriod(closingDay);

  const metrics = await getDashboardMetrics(user.id, period, closingDay);
  return NextResponse.json({ data: metrics });
}
