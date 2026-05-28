import Groq from 'groq-sdk';
import type { ChatHistoryItem } from '@/types/chat';
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
  analyticalSignals: string[];
  previousMonthTotalCents: number | null;
  receiptCount: number;
}

const MO_TIP_SYSTEM_PROMPT = `Você é a Mo, mascote do Moneda — app brasileiro de controle de gastos ("Seu dinheiro, finalmente claro.").

Sua missão: transformar dados de gastos em micro-dicas ÚTEIS — que explicam o que fazer, não só o que aconteceu.

TOM (obrigatório):
- Direta, amigável, sem jargão bancário, sem culpa e sem julgamento.
- Nunca use tom de advertência punitiva ("você errou", "gastou demais", "cuidado!").
- Fale como uma amiga que entende de dinheiro e quer ajudar com um próximo passo concreto.

O QUE CADA DICA DEVE TER:
1. Um fato específico dos dados (categoria, estabelecimento, padrão, ritmo do mês, comparação).
2. Uma ação ou reflexão prática (revisar, testar, separar, comparar, ajustar hábito, usar recurso do app).

PROIBIDO (nunca gere dicas assim):
- Só parabenizar por estar "dentro do orçamento" ou "não passar de R$ X".
- Só repetir o total gasto no mês sem insight ("você gastou R$ …").
- Frases genéricas que serviriam para qualquer pessoa ("economize mais", "faça um orçamento").
- Markdown, emojis, listas numeradas.

PRIORIZE sinais analíticos e lançamentos concretos fornecidos. Varie os temas entre as dicas (hábito, categoria, ritmo, assinatura, comparação, app).

Formato de saída: JSON {"tips":["...",...]} com exatamente 5 dicas, cada uma até 140 caracteres, em português do Brasil.`;

const MO_TIP_FEW_SHOT = `
Exemplos RUINS (não repita):
- "Parabéns, você ainda está dentro do orçamento de R$ 1.800!"
- "Você gastou R$ 950 este mês. Continue controlando."
- "Seu maior gasto é alimentação."

Exemplos BONS (inspire-se):
- "Delivery somou R$ 280 em 6 pedidos — testar 2 refeições em casa por semana já alivia o mês."
- "Supermercado subiu 22% vs mês passado — vale comparar lista antes da próxima compra grande."
- "3 lançamentos no iFood em 10 dias — que tal um teto semanal de R$ 60 pra delivery?"
- "Faltam 12 dias e R$ 40/dia fecham o orçamento — priorize transporte e lazer até o dia 31."
- "Assinaturas detectadas (R$ 89) — abra o feed e cancele o que não usou nos últimos 30 dias."`;

function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function isWeakMoTip(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (t.length < 45) return true;

  const onlyCongrats =
    /parabéns|muito bem|ótimo trabalho|continue assim|mandou bem/.test(t) &&
    !/vale|tente|revise|considere|que tal|priorize|reduza|separe|defina|compare|confira|abrir|ajuste|teste/.test(t);
  if (onlyCongrats) return true;

  if (/^(você )?gastou\b/.test(t) && !/\b(vale|tente|revise|compare|priorize|que tal)\b/.test(t)) return true;
  if (/\btotal (gasto|de gastos)\b/.test(t) && t.length < 80) return true;
  if (/\bdentro do (seu )?orçamento\b/.test(t) && t.length < 90) return true;
  if (/^seu (gasto|orçamento|saldo)\b/.test(t) && t.length < 70) return true;

  return false;
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
    .slice(0, 12)
    .map((e) => `- ${e.description} (${e.category}): ${formatBrl(e.amountCents)}`)
    .join('\n');

  const signalBlock =
    ctx.analyticalSignals.length > 0
      ? ctx.analyticalSignals.map((s) => `- ${s}`).join('\n')
      : '- (sem sinais extras)';

  const userContent = [
    `Período: ${monthName} de ${year}.`,
    ctx.firstName ? `Nome (opcional na dica): ${ctx.firstName}.` : '',
    '',
    '=== SINAIS ANALÍTICOS (base principal das dicas — cada dica deve partir de um destes ou de um lançamento) ===',
    signalBlock,
    '',
    '=== DADOS DE REFERÊNCIA (não transforme em dica só de total/orçamento) ===',
    `Lançamentos: ${ctx.expenseCount}. Total: ${formatBrl(ctx.totalSpentCents)}.`,
    ctx.monthlyBudgetCents > 0
      ? `Orçamento mensal: ${formatBrl(ctx.monthlyBudgetCents)}.`
      : 'Orçamento mensal: não definido.',
    ctx.previousMonthTotalCents !== null
      ? `Mês anterior: ${formatBrl(ctx.previousMonthTotalCents)}.`
      : '',
    `Comprovantes no mês: ${ctx.receiptCount}.`,
    '',
    'Categorias:',
    categoryLines || '-',
    '',
    'Lançamentos (amostra):',
    expenseLines || '-',
    ctx.insightExcerpt
      ? `\nContexto do último insight (use só se ajudar uma dica nova, não copie):\n${ctx.insightExcerpt}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 900,
    temperature: 0.55,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: MO_TIP_SYSTEM_PROMPT + MO_TIP_FEW_SHOT },
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
        .filter((t) => !isWeakMoTip(t))
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

const MO_CHAT_SYSTEM_PROMPT = `Você é a Mo, assistente financeira do Moneda (Brasil). O usuário conversa com você na aba Insights.

MISSÃO: responder perguntas sobre a vida financeira do usuário usando APENAS o bloco de contexto fornecido (dados da conta dele). Se faltar dado, diga com clareza e sugira registrar gastos ou gerar análise.

TOM (Moneda):
- humana, direta, sem jargão bancário;
- sem culpa, sem alarmismo, sem julgamento;
- respostas curtas a médias (2–5 frases na maioria dos casos);
- insights acionáveis quando couber;
- pode usar valores em R$ e nomes de categorias/lançamentos do contexto;
- texto corrido simples (sem markdown pesado, sem tabelas, sem listas longas).

PROIBIDO:
- inventar gastos, categorias ou valores não presentes no contexto;
- falar de outros usuários ou dados globais do app;
- recomendar investimentos específicos ou produtos financeiros;
- ser robótica ("Como assistente de IA...").

Se a pergunta for genérica (ex.: "como economizar"), personalize com os dados do contexto quando existirem.`;

export function buildMoChatMessages(
  userMessage: string,
  financialContextBlock: string,
  history: ChatHistoryItem[],
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const trimmedHistory = history
    .filter((m) => m.content.trim().length > 0)
    .slice(-8)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content.trim().slice(0, 1200),
    }));

  return [
    {
      role: 'system',
      content: `${MO_CHAT_SYSTEM_PROMPT}\n\n--- DADOS FINANCEIROS DO USUÁRIO (confidencial, só esta conta) ---\n${financialContextBlock}`,
    },
    ...trimmedHistory,
    { role: 'user', content: userMessage.trim().slice(0, 800) },
  ];
}

export async function* streamMoChatReply(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 500,
    temperature: 0.45,
    stream: true,
    messages,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

export async function replyMoChat(
  userMessage: string,
  financialContextBlock: string,
  history: ChatHistoryItem[],
): Promise<{ reply: string; promptTokens: number; completionTokens: number }> {
  const messages = buildMoChatMessages(userMessage, financialContextBlock, history);

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 500,
    temperature: 0.45,
    messages,
  });

  const reply =
    response.choices[0]?.message?.content?.trim() ||
    'Não consegui montar uma resposta agora. Tente reformular a pergunta.';

  return {
    reply: reply.slice(0, 2000),
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
  };
}
