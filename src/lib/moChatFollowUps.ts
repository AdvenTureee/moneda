const POOL = [
  'Quanto posso gastar por dia até o fim do mês?',
  'Qual categoria mais pesa no meu orçamento?',
  'Onde posso economizar sem cortar o essencial?',
  'Como estão meus gastos comparados ao mês passado?',
  'Me explique meus gastos com delivery.',
  'Alguma categoria passou do orçamento?',
  'Quais foram meus maiores lançamentos?',
] as const;

function includesAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((t) => lower.includes(t));
}

export function suggestMoChatFollowUps(
  userMessage: string,
  assistantReply: string,
): string[] {
  const combined = `${userMessage} ${assistantReply}`.toLowerCase();
  const picks: string[] = [];

  const rules: Array<{ if: () => boolean; question: string }> = [
    {
      if: () => !includesAny(combined, ['orçamento', 'orçamento', 'restante', 'por dia']),
      question: 'Quanto posso gastar por dia até o fim do mês?',
    },
    {
      if: () => !includesAny(combined, ['categoria', 'categorias', 'maior peso', 'concentra']),
      question: 'Qual categoria mais pesa no meu orçamento?',
    },
    {
      if: () => !includesAny(combined, ['economizar', 'cortar', 'reduzir', 'poupar']),
      question: 'Onde posso economizar sem cortar o essencial?',
    },
    {
      if: () => !includesAny(combined, ['mês passado', 'anterior', 'compar']),
      question: 'Como estão meus gastos comparados ao mês passado?',
    },
    {
      if: () => includesAny(combined, ['delivery', 'ifood', 'rappi']) === false,
      question: 'Me explique meus gastos com delivery.',
    },
    {
      if: () => !includesAny(combined, ['passou', 'ultrapass', 'estour', 'orçamento da']),
      question: 'Alguma categoria passou do orçamento?',
    },
    {
      if: () => !includesAny(combined, ['maior', 'lançamento', 'compra']),
      question: 'Quais foram meus maiores lançamentos?',
    },
  ];

  for (const rule of rules) {
    if (picks.length >= 3) break;
    if (rule.if() && !picks.includes(rule.question)) {
      picks.push(rule.question);
    }
  }

  for (const q of POOL) {
    if (picks.length >= 3) break;
    if (!picks.includes(q)) picks.push(q);
  }

  return picks.slice(0, 3);
}
