import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { occurrenceDate, filterRecentExpenses } from '../src/lib/expenses';

describe('installment occurrence date', () => {
  it('keeps the first installment on the original purchase date and moves following installments to the next billing cycle start', () => {
    const firstDate = new Date(2026, 4, 10, 15, 30, 0, 0);
    const series = {
      kind: 'installment',
      start_at: firstDate.toISOString(),
      day_of_month: 10,
    } as any;

    assert.equal(occurrenceDate(series, 1, 20).toISOString(), firstDate.toISOString());
    assert.equal(occurrenceDate(series, 2, 20).toISOString(), new Date(2026, 4, 20, 0, 0, 0, 0).toISOString());
    assert.equal(occurrenceDate(series, 3, 20).toISOString(), new Date(2026, 5, 20, 0, 0, 0, 0).toISOString());
  });

  it('moves the next installment to the start of the next cycle when the purchase occurs after the closing day', () => {
    const firstDate = new Date(2026, 4, 25, 11, 0, 0, 0);
    const series = {
      kind: 'installment',
      start_at: firstDate.toISOString(),
      day_of_month: 25,
    } as any;

    assert.equal(occurrenceDate(series, 1, 20).toISOString(), firstDate.toISOString());
    assert.equal(occurrenceDate(series, 2, 20).toISOString(), new Date(2026, 5, 20, 0, 0, 0, 0).toISOString());
  });

  it('does not include future scheduled expenses in recentExpenses', () => {
    const now = new Date();
    const expenses = [
      { id: 'past', createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      { id: 'future', createdAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      { id: 'today', createdAt: new Date(now.getTime() - 60 * 60 * 1000) },
    ] as any;

    const filtered = filterRecentExpenses(expenses);

    assert.equal(filtered.some((expense) => expense.id === 'future'), false);
    assert.equal(filtered.some((expense) => expense.id === 'past'), true);
    assert.equal(filtered.some((expense) => expense.id === 'today'), true);
  });
});
