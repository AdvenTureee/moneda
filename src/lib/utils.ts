const CURRENCY_LOCALE: Record<string, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

export function formatCurrency(centavos: number, currency: string = 'BRL'): string {
  const locale = CURRENCY_LOCALE[currency] ?? 'pt-BR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(centavos / 100);
}

export function parseCurrencyInput(text: string): number {
  const clean = text.replace(/[R$\s.]/g, '').replace(',', '.');
  return Math.round(parseFloat(clean) * 100);
}

export function isValidEmail(email: string): boolean {
  const normalized = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function formatDate(date: Date): string {
  const now = new Date();
  const d = new Date(date);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dStart.getTime() === todayStart.getTime()) return 'Hoje';
  if (dStart.getTime() === yesterdayStart.getTime()) return 'Ontem';

  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export function formatDateFull(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateSection(date: Date): string {
  const label = formatDate(date);
  if (label === 'Hoje' || label === 'Ontem') {
    const d = new Date(date);
    const dayStr = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    return `${label} · ${dayStr}`;
  }
  const d = new Date(date);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${label} — ${weekday}`;
}

export function groupExpensesByDate<T extends { createdAt: Date }>(
  expenses: T[]
): Array<{ dateKey: string; label: string; items: T[] }> {
  const map = new Map<string, { label: string; items: T[] }>();

  for (const expense of expenses) {
    const d = new Date(expense.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) {
      map.set(key, { label: formatDateSection(d), items: [] });
    }
    map.get(key)!.items.push(expense);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, value]) => ({ dateKey, ...value }));
}

export function getCurrentPeriod(): string {
  return getCurrentBillingPeriod(DEFAULT_BILLING_CLOSING_DAY);
}

export function isValidPeriod(period: unknown): period is string {
  return typeof period === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

export function isClosedMonthlyPeriod(period: string, closingDay: unknown = DEFAULT_BILLING_CLOSING_DAY): boolean {
  return isValidPeriod(period) && isClosedBillingPeriod(period, closingDay);
}

export function getPreviousPeriod(period: string): string {
  return shiftPeriod(period, -1);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
import {
  DEFAULT_BILLING_CLOSING_DAY,
  getCurrentBillingPeriod,
  isClosedBillingPeriod,
  shiftPeriod,
} from '@/lib/billingCycle';
