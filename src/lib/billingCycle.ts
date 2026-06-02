export const DEFAULT_BILLING_CLOSING_DAY = 10;

export interface BillingCycle {
  period: string;
  start: Date;
  end: Date;
  label: string;
}

export function normalizeBillingClosingDay(value: unknown): number {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 28
    ? day
    : DEFAULT_BILLING_CLOSING_DAY;
}

export function shiftPeriod(period: string, monthsDelta: number): string {
  const [year, month] = period.split('-').map(Number);
  const d = new Date(year, month - 1 + monthsDelta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getBillingCycleForPeriod(
  period: string,
  closingDay: unknown,
): BillingCycle {
  const day = normalizeBillingClosingDay(closingDay);
  const [year, month] = period.split('-').map(Number);
  const start = new Date(year, month - 2, day + 1, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  return {
    period,
    start,
    end,
    label: formatBillingCycleLabel(period, day),
  };
}

export function getBillingPeriodForDate(date: Date, closingDay: unknown): string {
  const day = normalizeBillingClosingDay(closingDay);
  const periodDate = date.getDate() <= day
    ? new Date(date.getFullYear(), date.getMonth(), 1)
    : new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;
}

export function getCurrentBillingPeriod(closingDay: unknown): string {
  return getBillingPeriodForDate(new Date(), closingDay);
}

export function isClosedBillingPeriod(period: string, closingDay: unknown): boolean {
  return getBillingCycleForPeriod(period, closingDay).end.getTime() < Date.now();
}

export function formatBillingCycleLabel(period: string, closingDay: unknown): string {
  const day = normalizeBillingClosingDay(closingDay);
  const [year, month] = period.split('-').map(Number);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
  });
  const start = new Date(year, month - 2, day + 1);
  const end = new Date(year, month - 1, day);
  return `${capitalize(monthName)} · ${formatShortDate(start)}-${formatShortDate(end)}`;
}

function formatShortDate(date: Date): string {
  return date
    .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
    .replace('.', '');
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
