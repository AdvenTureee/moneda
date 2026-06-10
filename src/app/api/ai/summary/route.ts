import { NextRequest } from 'next/server';
import { createSessionClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { generateMonthlySummary, detectSpendingAlerts } from '@/lib/groq';
import { getExpenses } from '@/lib/expenses';
import { getCategories } from '@/lib/categories';
import { isClosedMonthlyPeriod, isValidPeriod } from '@/lib/utils';
import { getBillingClosingDay } from '@/lib/profiles';
import { getBillingCycleForPeriod, getCurrentBillingPeriod, shiftPeriod } from '@/lib/billingCycle';
import { noStoreJson } from '@/lib/http';

const MONTH_NOT_CLOSED_MESSAGE = 'O resumo mensal fica disponível quando o mês fechar.';

export async function POST(req: NextRequest) {
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
      return noStoreJson({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const closingDay = await getBillingClosingDay(user.id);
    const period: string = body.period ?? getCurrentBillingPeriod(closingDay);

    if (!isValidPeriod(period)) {
      return noStoreJson({ error: 'Período inválido.' }, { status: 400 });
    }

    if (!isClosedMonthlyPeriod(period, closingDay)) {
      return noStoreJson({ error: MONTH_NOT_CLOSED_MESSAGE }, { status: 403 });
    }

    if (!process.env.GROQ_API_KEY) {
      return noStoreJson({ error: 'GROQ_API_KEY não configurada.' }, { status: 500 });
    }

    const cycle = getBillingCycleForPeriod(period, closingDay);

    // Fetch current month expenses
    const currentExpenses = await getExpenses({
      userId: user.id,
      startDate: cycle.start.toISOString(),
      endDate: cycle.end.toISOString(),
    });

    // Fetch previous months for alert comparison (up to 3 months back)
    const previousMonths: import('@/types').Expense[][] = [];
    for (let i = 1; i <= 3; i++) {
      const prevCycle = getBillingCycleForPeriod(shiftPeriod(period, -i), closingDay);
      const prev = await getExpenses({
        userId: user.id,
        startDate: prevCycle.start.toISOString(),
        endDate: prevCycle.end.toISOString(),
      });
      if (prev.length > 0) previousMonths.push(prev);
    }

    const categories = await getCategories(user.id);

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
      const { data } = await session.from('ai_insights').upsert(
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

    return noStoreJson({
      id: insightId,
      type: 'monthly_summary',
      period,
      message: markdown,
      metadata: { alerts },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return noStoreJson({ error: `Erro ao gerar resumo: ${message}` }, { status: 500 });
  }
}
