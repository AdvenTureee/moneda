import { getDashboardMetrics, getExpenses, getMonthlyTotals } from '@/lib/expenses';
import { getCategories } from '@/lib/categories';
import { getBudgets } from '@/lib/budgets';
import { getLatestInsight } from '@/lib/insights';
import { getMonthlyBudgetCents } from '@/lib/monthlyBudget';
import { buildAnalyticalSignals } from '@/lib/moTipsAnalysis';
import { detectSpendingAlerts, type MoTipGenerationContext } from '@/lib/groq';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { decryptProfilePii, getDisplayNameFromUser } from '@/lib/security/profilePii';
import { formatCurrency } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_`>\[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

function shiftPeriod(period: string, monthsBack: number): string {
  const [year, month] = period.split('-').map(Number);
  const d = new Date(year, month - 1 - monthsBack, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function resolveFirstName(user: User): Promise<string | undefined> {
  let fullName = getDisplayNameFromUser(user);
  if (isSupabaseEnabled()) {
    const db = createServiceClient();
    const { data: profile } = await db
      .from('profiles')
      .select(
        'name_ciphertext,name_iv,name_tag,email_ciphertext,email_iv,email_tag,phone_ciphertext,phone_iv,phone_tag',
      )
      .eq('id', user.id)
      .single();
    if (profile) fullName = decryptProfilePii(profile).name || fullName;
  }
  return fullName?.split(' ')[0] || undefined;
}

export async function buildMoFinancialContext(
  user: User,
  period: string,
): Promise<MoTipGenerationContext | null> {
  const metrics = await getDashboardMetrics(user.id, period);

  const [insight, monthlyBudgetCents, monthlyTotals, categories, budgets, firstName] =
    await Promise.all([
      getLatestInsight(user.id, period),
      getMonthlyBudgetCents(user.id, period),
      getMonthlyTotals(user.id, period, 2),
      getCategories(user.id),
      getBudgets(user.id, period),
      resolveFirstName(user),
    ]);

  const previousMonths: import('@/types').Expense[][] = [];
  for (let i = 1; i <= 3; i++) {
    const prevPeriod = shiftPeriod(period, i);
    const [pYear, pMonth] = prevPeriod.split('-').map(Number);
    const prev = await getExpenses({
      userId: user.id,
      startDate: new Date(pYear, pMonth - 1, 1).toISOString(),
      endDate: new Date(pYear, pMonth, 0, 23, 59, 59).toISOString(),
    });
    if (prev.length > 0) previousMonths.push(prev);
  }

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const budgetAlerts: string[] = [];
  for (const budget of budgets) {
    const spent =
      metrics.expensesByCategory[budget.categoryId]?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
    if (spent <= 0) continue;
    const name = categoryNames.get(budget.categoryId) ?? budget.categoryId;
    const pct = budget.amountCents > 0 ? Math.round((spent / budget.amountCents) * 100) : 0;
    if (spent > budget.amountCents) {
      budgetAlerts.push(
        `${name}: ${formatCurrency(spent)} gastos (orçamento ${formatCurrency(budget.amountCents)})`,
      );
    } else if (pct >= 80) {
      budgetAlerts.push(`${name}: ${pct}% do orçamento mensal da categoria já usado.`);
    }
  }

  const currentExpenses =
    metrics.expenseCount > 0 ? Object.values(metrics.expensesByCategory).flat() : [];
  const spendingAlerts =
    metrics.expenseCount > 0
      ? detectSpendingAlerts(currentExpenses, previousMonths, categories)
      : [];

  const prevPeriodEntry = monthlyTotals.find((m) => m.period === shiftPeriod(period, 1));
  const previousMonthTotalCents = prevPeriodEntry?.total ?? null;

  const remainingBudgetCents =
    monthlyBudgetCents > 0 ? monthlyBudgetCents - metrics.totalSpent : null;

  const recentExpenses = [...metrics.recentExpenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 12)
    .map((e) => ({
      description: e.description,
      amountCents: e.amount,
      category: e.categoryData?.name ?? categoryNames.get(e.category) ?? e.category,
    }));

  const allPeriodExpenses = Object.values(metrics.expensesByCategory).flat();
  const receiptCount = allPeriodExpenses.filter((e) => e.receipt).length;

  const insightMeta = insight?.metadata as { alerts?: string[] } | undefined;
  const insightAlerts = Array.isArray(insightMeta?.alerts)
    ? insightMeta.alerts.map((a) => (typeof a === 'string' ? stripMarkdown(a) : '')).filter(Boolean)
    : [];

  const allSpendingAlerts = [...spendingAlerts, ...insightAlerts].slice(0, 5);
  const trimmedBudgetAlerts = budgetAlerts.slice(0, 5);

  const analyticalSignals =
    metrics.expenseCount > 0
      ? buildAnalyticalSignals(period, metrics, {
          monthlyBudgetCents,
          previousMonthTotalCents,
          budgetAlerts: trimmedBudgetAlerts,
          spendingAlerts: allSpendingAlerts,
        })
      : [];

  return {
    period,
    firstName,
    totalSpentCents: metrics.totalSpent,
    expenseCount: metrics.expenseCount,
    monthlyBudgetCents,
    remainingBudgetCents,
    topCategories: metrics.topCategories.slice(0, 6).map((c) => ({
      name: c.categoryName,
      amountCents: c.amount,
      percentage: c.percentage,
    })),
    recentExpenses,
    insightExcerpt: insight?.message ? stripMarkdown(insight.message).slice(0, 600) : undefined,
    analyticalSignals,
    previousMonthTotalCents,
    receiptCount,
  };
}

export function formatFinancialContextForChat(
  ctx: MoTipGenerationContext | null,
  period: string,
): string {
  const [year, month] = period.split('-').map(Number);
  const monthName = new Date(year, month - 1).toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  if (!ctx || ctx.expenseCount === 0) {
    return [
      `Período: ${monthName}.`,
      'Situação: nenhum lançamento de despesa neste período.',
      'Oriente o usuário a registrar gastos no app ou via WhatsApp antes de analisar números.',
    ].join('\n');
  }

  const lines = [
    `Período analisado: ${monthName}.`,
    ctx.firstName ? `Nome: ${ctx.firstName}.` : '',
    `Total gasto: ${formatCurrency(ctx.totalSpentCents)} (${ctx.expenseCount} lançamentos).`,
    ctx.monthlyBudgetCents > 0
      ? `Orçamento mensal: ${formatCurrency(ctx.monthlyBudgetCents)}. Restante: ${
          ctx.remainingBudgetCents !== null ? formatCurrency(ctx.remainingBudgetCents) : '—'
        }.`
      : 'Orçamento mensal: não definido.',
    ctx.previousMonthTotalCents !== null
      ? `Mês anterior: ${formatCurrency(ctx.previousMonthTotalCents)}.`
      : '',
    `Comprovantes anexados: ${ctx.receiptCount}.`,
    '',
    'Categorias (maior peso):',
    ...ctx.topCategories.map(
      (c) => `- ${c.name}: ${formatCurrency(c.amountCents)} (${c.percentage}%)`,
    ),
    '',
    'Últimos lançamentos:',
    ...ctx.recentExpenses.map(
      (e) => `- ${e.description} | ${e.category} | ${formatCurrency(e.amountCents)}`,
    ),
    '',
    'Sinais analíticos:',
    ...ctx.analyticalSignals.map((s) => `- ${s}`),
  ];

  if (ctx.insightExcerpt) {
    lines.push('', 'Último insight gerado (resumo):', ctx.insightExcerpt);
  }

  return lines.filter(Boolean).join('\n');
}
