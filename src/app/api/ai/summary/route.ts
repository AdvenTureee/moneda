import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient, createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { generateMonthlySummary, detectSpendingAlerts } from '@/lib/groq';
import { getExpenses } from '@/lib/expenses';
import { CATEGORIES } from '@/data/mock';
import { getCurrentPeriod } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const period: string = body.period ?? getCurrentPeriod();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY não configurada.' }, { status: 500 });
    }

    const [year, month] = period.split('-').map(Number);

    // Fetch current month expenses
    const currentExpenses = await getExpenses({
      userId: user.id,
      startDate: new Date(year, month - 1, 1).toISOString(),
      endDate: new Date(year, month, 0, 23, 59, 59).toISOString(),
    });

    // Fetch previous months for alert comparison (up to 3 months back)
    const previousMonths: import('@/types').Expense[][] = [];
    for (let i = 1; i <= 3; i++) {
      const prevDate = new Date(year, month - 1 - i, 1);
      const pYear = prevDate.getFullYear();
      const pMonth = prevDate.getMonth() + 1;
      const prev = await getExpenses({
        userId: user.id,
        startDate: new Date(pYear, pMonth - 1, 1).toISOString(),
        endDate: new Date(pYear, pMonth, 0, 23, 59, 59).toISOString(),
      });
      if (prev.length > 0) previousMonths.push(prev);
    }

    const categories = CATEGORIES;

    // Generate summary via Groq
    const { markdown, promptTokens, completionTokens } = await generateMonthlySummary(
      currentExpenses,
      categories,
      period
    );

    // Detect spending alerts
    const alerts = detectSpendingAlerts(currentExpenses, previousMonths, categories);

    // Persist insight in Supabase if enabled
    let insightId: string | null = null;
    if (isSupabaseEnabled()) {
      const admin = createServiceClient();
      const { data } = await admin.from('ai_insights').upsert(
        {
          user_id: user.id,
          type: 'monthly_summary',
          period,
          message: markdown,
          model_used: 'llama-3.3-70b-versatile',
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          metadata: { alerts },
        },
        {
          onConflict: 'user_id,type,period',
          ignoreDuplicates: false,
        }
      ).select().single();
      insightId = data?.id ?? null;
    }

    return NextResponse.json({
      id: insightId,
      type: 'monthly_summary',
      period,
      message: markdown,
      metadata: { alerts },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Erro ao gerar resumo: ${message}` }, { status: 500 });
  }
}
