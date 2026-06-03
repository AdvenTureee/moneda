import type { Expense } from '@/types';
import { getBillingCycleForPeriod, getBillingPeriodForDate, shiftPeriod } from '@/lib/billingCycle';

export interface UpcomingInstallment {
  index: number;
  total: number;
  amount: number;
  date: Date;
}

export function hasUpcomingInstallments(expense: Expense): boolean {
  const current = expense.seriesOccurrenceIndex ?? expense.creditDetails?.installmentCurrent;
  const total = expense.seriesTotalOccurrences ?? expense.creditDetails?.installmentTotal;
  return (
    current != null &&
    total != null &&
    Number.isInteger(current) &&
    Number.isInteger(total) &&
    current >= 1 &&
    current < total
  );
}

export function getUpcomingInstallments(expense: Expense, closingDay: number): UpcomingInstallment[] {
  if (!hasUpcomingInstallments(expense)) return [];

  const currentIndex = expense.seriesOccurrenceIndex ?? expense.creditDetails?.installmentCurrent!;
  const totalOccurrences = expense.seriesTotalOccurrences ?? expense.creditDetails?.installmentTotal!;
  const amount = expense.amount;

  const currentPeriod = getBillingPeriodForDate(new Date(expense.createdAt), closingDay);
  const installments: UpcomingInstallment[] = [];

  for (let nextIndex = currentIndex + 1; nextIndex <= totalOccurrences; nextIndex += 1) {
    const targetPeriod = shiftPeriod(currentPeriod, nextIndex - currentIndex);
    const cycle = getBillingCycleForPeriod(targetPeriod, closingDay);
    installments.push({
      index: nextIndex,
      total: totalOccurrences,
      amount,
      date: cycle.start,
    });
  }

  return installments;
}
