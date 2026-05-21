import { NextRequest, NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/expenses';
import { getCurrentPeriod } from '@/lib/utils';
import { createSessionClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? getCurrentPeriod();

  const metrics = await getDashboardMetrics(user.id, period);
  return NextResponse.json({ data: metrics });
}
