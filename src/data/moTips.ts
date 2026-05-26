export type MoTipKind = 'greeting' | 'finance' | 'app';

export interface MoTip {
  id: string;
  kind: MoTipKind;
  text: string;
}

function greetingForHour(h: number): string {
  if (h >= 6 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function getGreeting(): MoTip {
  const h = new Date().getHours();
  const greet = greetingForHour(h);
  return { id: 'greeting', kind: 'greeting', text: `${greet}! Como posso te ajudar?` };
}

// Ícone usado pelo balão é derivado do `kind`:
// finance → 'TrendUp', app → 'Lightbulb' (ver MoTipBubble.tsx)
export const MO_TIPS: MoTip[] = [
  // — Educação financeira —
  { id: 'fin-50-30-20', kind: 'finance', text: 'Regra 50/30/20: 50% essenciais, 30% desejos, 20% poupança e dívidas.' },
  { id: 'fin-reserva', kind: 'finance', text: 'Reserva de emergência ideal cobre de 3 a 6 meses dos seus gastos fixos.' },
  { id: 'fin-fixo-variavel', kind: 'finance', text: 'Separe gastos fixos (aluguel, conta) dos variáveis, controlar variáveis é o caminho mais rápido para economizar.' },
  { id: 'fin-delivery', kind: 'finance', text: 'Delivery pode parecer pequeno, mas somar o mês inteiro costuma surpreender. Vale revisar.' },
  { id: 'fin-assinaturas', kind: 'finance', text: 'Faça um pente-fino nas assinaturas a cada trimestre, gastos invisíveis ficam por anos sem você notar.' },
  { id: 'fin-cartao', kind: 'finance', text: 'Cartão de crédito não é renda extra: o limite é só um aviso de quanto o banco aceita te emprestar.' },
  { id: 'fin-pagar-se', kind: 'finance', text: 'Pague primeiro a você mesmo: separe a poupança no início do mês, não no fim.' },
  { id: 'fin-juros', kind: 'finance', text: 'Juros do rotativo do cartão estão entre os mais altos do mercado. Priorize quitar essa dívida.' },
  { id: 'fin-meta', kind: 'finance', text: 'Meta sem prazo é desejo. Escolha uma meta, defina o valor e o prazo, fica mais fácil de alcançar.' },
  { id: 'fin-pequenas', kind: 'finance', text: 'Pequenas economias somam: R$ 10 por dia viram R$ 3.650 no ano.' },
  { id: 'fin-impulso', kind: 'finance', text: 'Antes de uma compra grande, espere 24h. Se ainda quiser amanhã, provavelmente vale.' },
  { id: 'fin-revisao', kind: 'finance', text: 'Reservar 5 minutos no fim do mês para revisar seus gastos vale mais que cortar cafezinho.' },
  { id: 'fin-investir', kind: 'finance', text: 'Antes de investir, deixe a reserva pronta. Sem ela, qualquer imprevisto vira dívida.' },
  { id: 'fin-orcamento', kind: 'finance', text: 'Orçamento não é restrição, é dar permissão consciente pra cada gasto.' },

  // — Recursos do app —
  { id: 'app-whatsapp', kind: 'app', text: 'Você pode lançar gastos por aqui ou direto pelo WhatsApp. Diga "gastei 30 no mercado" e eu cuido do resto.' },
  { id: 'app-insights', kind: 'app', text: 'Toque em Insights pra eu analisar seus gastos do mês e te mostrar padrões.' },
  { id: 'app-feed', kind: 'app', text: 'No Feed dá pra filtrar gastos por categoria, busca e período. Útil pra achar aquela compra antiga.' },
  { id: 'app-orcamento', kind: 'app', text: 'Defina um orçamento por categoria em Perfil → Orçamento. Eu te aviso quando algo passar do esperado.' },
  { id: 'app-export', kind: 'app', text: 'Precisa dos dados em planilha? Em Perfil você exporta tudo em CSV.' },
  { id: 'app-categorias', kind: 'app', text: 'Crie categorias personalizadas em Perfil → Categorias pra refletir como você organiza sua vida.' },
  { id: 'app-receitas', kind: 'app', text: 'Cadastre suas receitas em Perfil → Ganhos pra eu calcular o quanto sobra de verdade no mês.' },
  { id: 'app-toque', kind: 'app', text: 'Toque em mim pra eu te dar a próxima dica. 🙂' },
];
