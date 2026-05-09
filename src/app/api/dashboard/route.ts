import { NextRequest, NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/expenses';
import { getCurrentPeriod } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') ?? 'user-001';
  const period = searchParams.get('period') ?? getCurrentPeriod();

  const metrics = await getDashboardMetrics(userId, period);
  return NextResponse.json({ data: metrics });
}
