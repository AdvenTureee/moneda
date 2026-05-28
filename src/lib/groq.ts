import Groq from 'groq-sdk';
import type { Category, Expense } from '@/types';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateMonthlySummary(
  expenses: Expense[],
  categories: Category[],
  period: string
): Promise<{ markdown: string; promptTokens: number; completionTokens: number }> {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategoryId = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  const breakdown = Object.entries(byCategoryId)
    .sort(([, a], [, b]) => b - a)
    .map(([id, amount]) => {
      const cat = categories.find((c) => c.id === id);
      const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : '0.0';
      return `- **${cat?.name ?? id}**: R$ ${(amount / 100).toFixed(2)} (${pct}%)`;
    })
    .join('\n');

  const [year, month] = period.split('-').map(Number);
  const monthName = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' });

  const topCategory = Object.entries(byCategoryId).sort(([, a], [, b]) => b - a)[0];
  const topCatName = topCategory
    ? categories.find((c) => c.id === topCategory[0])?.name ?? topCategory[0]
    : null;
  const topCatPct = topCategory && total > 0
    ? ((topCategory[1] / total) * 100).toFixed(1)
    : null;

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 600,
    messages: [
      {
        role: 'system',
        content:
          'Você é a Mo, mascote e assistente financeira pessoal do app Moneda. Analise os gastos do usuário e forneça insights práticos em português. Seja direta, construtiva e sem julgamentos. Use markdown. Formato: um parágrafo de boas-vindas/análise geral, depois tópicos com observações e dicas.',
      },
      {
        role: 'user',
        content:
          `Resuma meus gastos de ${monthName} de ${year}:\n\n` +
          `Total gasto: R$ ${(total / 100).toFixed(2)}\n\n` +
          `Gastos por categoria:\n${breakdown}\n\n` +
          `Maior categoria: ${topCatName ?? '—'} (${topCatPct ?? '—'}% do total).\n` +
          `Número total de transações: ${expenses.length}.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? '';

  return {
    markdown: content || 'Não foi possível gerar o resumo.',
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
  };
}

export function detectSpendingAlerts(
  currentMonth: Expense[],
  previousMonths: Expense[][],
  categories: Category[]
): string[] {
  const aggregateByCategory = (expenses: Expense[]): Record<string, number> => {
    return expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {});
  };

  const currentByCategory = aggregateByCategory(currentMonth);
  const alerts: string[] = [];

  for (const [catId, currentAmount] of Object.entries(currentByCategory)) {
    const historicalAmounts = previousMonths.map((month) =>
      aggregateByCategory(month)[catId] ?? 0
    );
    const avg = historicalAmounts.reduce((s, v) => s + v, 0) / (historicalAmounts.length || 1);

    if (avg > 0 && currentAmount > avg * 1.3) {
      const cat = categories.find((c) => c.id === catId);
      const pct = Math.round((currentAmount / avg - 1) * 100);
      alerts.push(
        `**${cat?.name ?? catId}** está ${pct}% acima da sua média histórica. ` +
        `Gasto até agora: R$ ${(currentAmount / 100).toFixed(2)}.`
      );
    }
  }

  return alerts;
}

export async function categorizeWithAI(
  text: string,
  categories: Category[]
): Promise<string> {
  const categoryList = categories
    .map((c) => `- ${c.id}: ${c.name} (${c.keywords.slice(0, 3).join(', ')})`)
    .join('\n');

  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    max_tokens: 50,
    messages: [
      {
        role: 'system',
        content: 'Você é um classificador de despesas financeiras. Responda APENAS com o id da categoria, sem explicações.',
      },
      {
        role: 'user',
        content: `Classifique: "${text}"\n\nCategorias disponíveis:\n${categoryList}`,
      },
    ],
  });

  const result = response.choices[0]?.message?.content ?? '';
  return result.trim().toLowerCase().replace(/[^a-z_]/g, '') || 'outros';
}

export interface MoTipGenerationContext {
  period: string;
  firstName?: string;
  totalSpentCents: number;
  expenseCount: number;
  monthlyBudgetCents: number;
  remainingBudgetCents: number | null;
  topCategories: Array<{ name: string; amountCents: number; percentage: number }>;
  recentExpenses: Array<{ description: string; amountCents: number; category: string }>;
  insightExcerpt?: string;
  spendingAlerts: string[];
  budgetAlerts: string[];
  previousMonthTotalCents: number | null;
  receiptCount: number;
}

function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export async function generatePersonalizedMoTips(
  ctx: MoTipGenerationContext,
): Promise<{ tips: string[]; promptTokens: number; completionTokens: number }> {
  const [year, month] = ctx.period.split('-').map(Number);
  const monthName = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' });

  const categoryLines = ctx.topCategories
    .slice(0, 5)
    .map((c) => `- ${c.name}: ${formatBrl(c.amountCents)} (${c.percentage}%)`)
    .join('\n');

  const expenseLines = ctx.recentExpenses
    .slice(0, 10)
    .map((e) => `- ${e.description} (${e.category}): ${formatBrl(e.amountCents)}`)
    .join('\n');

  const budgetLine =
    ctx.monthlyBudgetCents > 0
      ? `Orçamento mensal: ${formatBrl(ctx.monthlyBudgetCents)}. Restante: ${
          ctx.remainingBudgetCents !== null ? formatBrl(ctx.remainingBudgetCents) : '—'
        }.`
      : 'Orçamento mensal: não definido.';

  const prevMonthLine =
    ctx.previousMonthTotalCents !== null
      ? `Gasto no mês anterior: ${formatBrl(ctx.previousMonthTotalCents)}.`
      : '';

  const userContent = [
    `Período: ${monthName} de ${year}.`,
    ctx.firstName ? `Nome: ${ctx.firstName}.` : '',
    `Total gasto: ${formatBrl(ctx.totalSpentCents)} em ${ctx.expenseCount} lançamento(s).`,
    budgetLine,
    prevMonthLine,
    `Comprovantes anexados no mês: ${ctx.receiptCount}.`,
    '',
    'Top categorias:',
    categoryLines || '- (sem categorias)',
    '',
    'Últimos lançamentos:',
    expenseLines || '- (sem lançamentos)',
    ctx.insightExcerpt ? `\nTrecho do último insight da IA:\n${ctx.insightExcerpt}` : '',
    ctx.spendingAlerts.length > 0
      ? `\nAlertas de gasto:\n${ctx.spendingAlerts.map((a) => `- ${a}`).join('\n')}`
      : '',
    ctx.budgetAlerts.length > 0
      ? `\nOrçamento por categoria:\n${ctx.budgetAlerts.map((a) => `- ${a}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    max_tokens: 700,
    temperature: 0.65,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Você é a Mo, mascote do app Moneda. Gere dicas financeiras curtas e personalizadas em português do Brasil, com base APENAS nos dados reais do usuário. ' +
          'Cada dica deve ter no máximo 140 caracteres, tom amigável, sem julgamento, sem markdown. ' +
          'Mencione categorias, valores ou hábitos concretos quando fizer sentido. ' +
          'Responda somente JSON válido no formato: {"tips":["dica 1","dica 2",...]} com entre 4 e 6 dicas.',
      },
      { role: 'user', content: userContent },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '{"tips":[]}';
  let tips: string[] = [];
  try {
    const parsed = JSON.parse(raw) as { tips?: unknown };
    if (Array.isArray(parsed.tips)) {
      tips = parsed.tips
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().replace(/\s+/g, ' '))
        .filter((t) => t.length <= 160)
        .slice(0, 6);
    }
  } catch {
    tips = [];
  }

  return {
    tips,
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
  };
}
