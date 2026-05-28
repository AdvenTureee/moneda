import { unstable_cache } from 'next/cache';
import type { MoTip } from '@/data/moTips';
import { getDashboardMetrics, getExpenses, getMonthlyTotals } from '@/lib/expenses';
import { getCategories } from '@/lib/categories';
import { getBudgets } from '@/lib/budgets';
import { getLatestInsight } from '@/lib/insights';
import { getMonthlyBudgetCents } from '@/lib/monthlyBudget';
import { buildAnalyticalSignals } from '@/lib/moTipsAnalysis';
import { generatePersonalizedMoTips, detectSpendingAlerts, type MoTipGenerationContext } from '@/lib/groq';
import { cacheTags } from '@/lib/cache';
import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';
import { decryptProfilePii, getDisplayNameFromUser } from '@/lib/security/profilePii';
import type { User } from '@supabase/supabase-js';

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_`>\[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 420);
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

async function buildMoTipContext(user: User, period: string): Promise<MoTipGenerationContext | null> {
  const metrics = await getDashboardMetrics(user.id, period);
  if (metrics.expenseCount === 0) return null;

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

  const currentExpenses = Object.values(metrics.expensesByCategory).flat();
  const spendingAlerts = detectSpendingAlerts(currentExpenses, previousMonths, categories);

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
        `${name}: ${(spent / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} gastos (orçamento ${(budget.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`,
      );
    } else if (pct >= 80) {
      budgetAlerts.push(`${name}: ${pct}% do orçamento mensal da categoria já usado.`);
    }
  }

  const prevPeriodEntry = monthlyTotals.find((m) => m.period === shiftPeriod(period, 1));
  const previousMonthTotalCents = prevPeriodEntry?.total ?? null;

  const remainingBudgetCents =
    monthlyBudgetCents > 0 ? monthlyBudgetCents - metrics.totalSpent : null;

  const recentExpenses = [...metrics.recentExpenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
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

  const analyticalSignals = buildAnalyticalSignals(period, metrics, {
    monthlyBudgetCents,
    previousMonthTotalCents,
    budgetAlerts: trimmedBudgetAlerts,
    spendingAlerts: allSpendingAlerts,
  });

  return {
    period,
    firstName,
    totalSpentCents: metrics.totalSpent,
    expenseCount: metrics.expenseCount,
    monthlyBudgetCents,
    remainingBudgetCents,
    topCategories: metrics.topCategories.slice(0, 5).map((c) => ({
      name: c.categoryName,
      amountCents: c.amount,
      percentage: c.percentage,
    })),
    recentExpenses,
    insightExcerpt: insight?.message ? stripMarkdown(insight.message) : undefined,
    analyticalSignals,
    previousMonthTotalCents,
    receiptCount,
  };
}

async function generatePersonalMoTipsImpl(user: User, period: string): Promise<MoTip[]> {
  if (!process.env.GROQ_API_KEY) return [];

  const ctx = await buildMoTipContext(user, period);
  if (!ctx) return [];

  const { tips } = await generatePersonalizedMoTips(ctx);
  const finalTexts =
    tips.length >= 2
      ? tips
      : ctx.analyticalSignals.map((s) => s.slice(0, 140)).filter((s) => s.length >= 45).slice(0, 5);

  return finalTexts.map((text, i) => ({
    id: `personal-${period}-${i}`,
    kind: 'personal' as const,
    text,
  }));
}

export async function getPersonalizedMoTips(user: User, period: string): Promise<MoTip[]> {
  return unstable_cache(
    () => generatePersonalMoTipsImpl(user, period),
    ['mo-tips-personal', 'v2', user.id, period],
    {
      tags: [
        cacheTags.metrics(user.id),
        cacheTags.insights(user.id),
        cacheTags.expenses(user.id),
        cacheTags.budgets(user.id),
      ],
      revalidate: 3600,
    },
  )();
}
