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
          'Você é um assistente financeiro pessoal chamado Grana. Analise os gastos do usuário e forneça insights práticos em português. Seja direto, construtivo e sem julgamentos. Use markdown com emojis. Formato: um parágrafo de boas-vindas/análise geral, depois tópicos com observações e dicas.',
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
        `⚠️ **${cat?.name ?? catId}** está ${pct}% acima da sua média histórica. ` +
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
