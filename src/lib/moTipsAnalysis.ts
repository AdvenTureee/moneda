import type { DashboardMetrics, ExpensePaymentMethod } from '@/types';
import { formatCurrency, getCurrentPeriod } from '@/lib/utils';

const DELIVERY_RE =
  /ifood|i\s*food|rappi|uber\s*eats|99\s*food|aiqfome|zé\s*delivery|delivery|keeta/i;
const SUBSCRIPTION_RE =
  /netflix|spotify|amazon\s*prime|disney|hbo|max|apple|google\s*one|assinatura|mensalidade|plano/i;

const PAYMENT_LABELS: Record<ExpensePaymentMethod, string> = {
  pix: 'PIX',
  debit: 'Débito',
  credit: 'Crédito',
  cash: 'Dinheiro',
  transfer: 'Transferência',
  other: 'Não informado',
};

function normalizeMerchant(description: string): string {
  const cleaned = description.trim().toLowerCase();
  if (cleaned.length < 3) return cleaned;
  return cleaned.split(/\s+/).slice(0, 3).join(' ');
}

export function buildAnalyticalSignals(
  period: string,
  metrics: DashboardMetrics,
  options: {
    monthlyBudgetCents: number;
    previousMonthTotalCents: number | null;
    budgetAlerts: string[];
    spendingAlerts: string[];
  },
): string[] {
  const signals: string[] = [];
  const expenses = Object.values(metrics.expensesByCategory).flat();
  const total = metrics.totalSpent;

  if (total <= 0 || expenses.length === 0) return signals;

  const top = metrics.topCategories[0];
  if (top && top.percentage >= 35) {
    signals.push(
      `${top.categoryName} concentra ${top.percentage}% dos gastos (${formatCurrency(top.amount)}) — vale revisar se esse peso faz sentido pra você.`,
    );
  }

  if (options.previousMonthTotalCents && options.previousMonthTotalCents > 0) {
    const deltaPct = Math.round(
      ((total - options.previousMonthTotalCents) / options.previousMonthTotalCents) * 100,
    );
    if (Math.abs(deltaPct) >= 8) {
      const dir = deltaPct > 0 ? 'acima' : 'abaixo';
      signals.push(
        `Gasto total ${Math.abs(deltaPct)}% ${dir} do mês passado (${formatCurrency(options.previousMonthTotalCents)} → ${formatCurrency(total)}).`,
      );
    }
  }

  if (period === getCurrentPeriod()) {
    const now = new Date();
    const [year, month] = period.split('-').map(Number);
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);
    const dailyAvg = total / dayOfMonth;
    const projected = Math.round(dailyAvg * daysInMonth);

    if (dayOfMonth >= 5) {
      signals.push(
        `Ritmo do mês (dia ${dayOfMonth}/${daysInMonth}): média diária ${formatCurrency(Math.round(dailyAvg))}; projeção até o fim ~${formatCurrency(projected)}.`,
      );
    }

    if (options.monthlyBudgetCents > 0 && daysRemaining > 0) {
      const remaining = options.monthlyBudgetCents - total;
      const dailyBudgetLeft = Math.round(remaining / daysRemaining);
      if (remaining > 0) {
        signals.push(
          `Faltam ${daysRemaining} dias: ~${formatCurrency(Math.max(0, dailyBudgetLeft))}/dia para fechar dentro do orçamento de ${formatCurrency(options.monthlyBudgetCents)}.`,
        );
      } else {
        signals.push(
          `Orçamento mensal ultrapassado em ${formatCurrency(Math.abs(remaining))} — priorize cortar gastos variáveis nas próximas semanas.`,
        );
      }
    }
  }

  const merchantMap = new Map<string, { count: number; total: number; sample: string }>();
  const paymentMap = new Map<ExpensePaymentMethod, { count: number; total: number }>();
  for (const e of expenses) {
    const key = normalizeMerchant(e.description);
    const cur = merchantMap.get(key) ?? { count: 0, total: 0, sample: e.description };
    cur.count += 1;
    cur.total += e.amount;
    merchantMap.set(key, cur);

    if (e.paymentMethod && e.paymentMethod !== 'other') {
      const payment = paymentMap.get(e.paymentMethod) ?? { count: 0, total: 0 };
      payment.count += 1;
      payment.total += e.amount;
      paymentMap.set(e.paymentMethod, payment);
    }
  }

  const repeated = [...merchantMap.entries()]
    .filter(([, v]) => v.count >= 2)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 4);

  for (const [, v] of repeated) {
    signals.push(
      `"${v.sample}" repetiu ${v.count}x (${formatCurrency(v.total)}) — hábito fixo ou dá pra consolidar/cortar uma vez?`,
    );
  }

  const paymentRanking = [...paymentMap.entries()].sort(([, a], [, b]) => b.total - a.total);
  const topPayment = paymentRanking[0];
  if (topPayment) {
    const [method, data] = topPayment;
    const pct = Math.round((data.total / total) * 100);
    if (pct >= 35 || data.count >= 4) {
      signals.push(
        `${PAYMENT_LABELS[method]} concentra ${formatCurrency(data.total)} (${pct}% do mês, ${data.count} lançamentos) — vale acompanhar esse meio no feed.`,
      );
    }
  }

  const credit = paymentMap.get('credit');
  if (credit && (credit.total >= total * 0.25 || credit.count >= 3)) {
    signals.push(
      `Crédito aparece em ${credit.count} lançamento(s), somando ${formatCurrency(credit.total)} — confira se isso cabe na próxima fatura.`,
    );
  }

  const largest = [...expenses].sort((a, b) => b.amount - a.amount)[0];
  if (largest && largest.amount >= total * 0.15) {
    const cat = largest.categoryData?.name ?? largest.category;
    signals.push(
      `Maior compra do mês: "${largest.description}" (${formatCurrency(largest.amount)} em ${cat}) — vale checar se foi planejada.`,
    );
  }

  let deliveryTotal = 0;
  let deliveryCount = 0;
  let subscriptionTotal = 0;
  let subscriptionCount = 0;
  let whatsappCount = 0;
  let recurringTotal = 0;

  for (const e of expenses) {
    const desc = e.description;
    if (DELIVERY_RE.test(desc)) {
      deliveryTotal += e.amount;
      deliveryCount += 1;
    }
    if (SUBSCRIPTION_RE.test(desc)) {
      subscriptionTotal += e.amount;
      subscriptionCount += 1;
    }
    if (e.source === 'whatsapp') whatsappCount += 1;
    if (e.isRecurring) recurringTotal += e.amount;
  }

  if (deliveryCount >= 2) {
    const pct = Math.round((deliveryTotal / total) * 100);
    signals.push(
      `Delivery/delivery apps: ${deliveryCount} lançamentos, ${formatCurrency(deliveryTotal)} (${pct}% do mês) — cozinhar mais 1–2x/semana pode aliviar.`,
    );
  }

  if (subscriptionCount >= 1) {
    signals.push(
      `Possíveis assinaturas detectadas: ${subscriptionCount} lançamento(s), ${formatCurrency(subscriptionTotal)} — revisar o que ainda usa de verdade.`,
    );
  }

  if (recurringTotal > 0) {
    signals.push(
      `Lançamentos marcados como recorrentes somam ${formatCurrency(recurringTotal)} no período.`,
    );
  }

  const whatsappPct = Math.round((whatsappCount / expenses.length) * 100);
  if (whatsappPct >= 40) {
    signals.push(
      `${whatsappPct}% dos gastos vieram do WhatsApp — bom hábito de registrar na hora; use o feed pra conferir categorias.`,
    );
  } else if (whatsappPct < 20 && expenses.length >= 5) {
    signals.push(
      `Poucos lançamentos via WhatsApp (${whatsappCount}/${expenses.length}) — mandar "gastei X no Y" no zap reduz esquecimentos.`,
    );
  }

  const avg = Math.round(total / expenses.length);
  if (expenses.length >= 8 && avg < total * 0.08) {
    signals.push(
      `Muitos lançamentos pequenos (média ${formatCurrency(avg)}) — somados viram valor alto; agrupar ajuda a enxergar o padrão.`,
    );
  }

  for (const alert of options.spendingAlerts.slice(0, 3)) {
    signals.push(alert.replace(/\*\*/g, ''));
  }

  for (const alert of options.budgetAlerts.slice(0, 3)) {
    signals.push(alert);
  }

  const second = metrics.topCategories[1];
  if (top && second && second.percentage >= 18) {
    signals.push(
      `Segunda maior fatia: ${second.categoryName} (${second.percentage}%, ${formatCurrency(second.amount)}) — compare com ${top.categoryName} ao montar o plano do mês.`,
    );
  }

  return signals.slice(0, 14);
}
