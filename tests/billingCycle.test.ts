import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getBillingCycleForPeriod,
  getBillingPeriodForDate,
} from '../src/lib/billingCycle';

function assertLocalDateTime(
  date: Date,
  expected: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
  },
): void {
  assert.equal(date.getFullYear(), expected.year);
  assert.equal(date.getMonth() + 1, expected.month);
  assert.equal(date.getDate(), expected.day);
  assert.equal(date.getHours(), expected.hour);
  assert.equal(date.getMinutes(), expected.minute);
  assert.equal(date.getSeconds(), expected.second);
  assert.equal(date.getMilliseconds(), expected.millisecond);
}

describe('billing cycle closing boundary', () => {
  it('starts a cycle at 00:00 on the configured closing day', () => {
    const cycle = getBillingCycleForPeriod('2026-05', 2);

    assertLocalDateTime(cycle.start, {
      year: 2026,
      month: 4,
      day: 2,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
    assertLocalDateTime(cycle.endExclusive, {
      year: 2026,
      month: 5,
      day: 2,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
    assertLocalDateTime(cycle.end, {
      year: 2026,
      month: 5,
      day: 1,
      hour: 23,
      minute: 59,
      second: 59,
      millisecond: 999,
    });
  });

  it('keeps purchases before the closing-day boundary in the current invoice period', () => {
    assert.equal(
      getBillingPeriodForDate(new Date(2026, 4, 1, 23, 59, 59, 999), 2),
      '2026-05',
    );
  });

  it('moves purchases at the exact closing boundary into the next invoice period', () => {
    assert.equal(
      getBillingPeriodForDate(new Date(2026, 4, 2, 0, 0, 0, 0), 2),
      '2026-06',
    );
  });

  it('moves purchases later on the closing day into the next invoice period', () => {
    assert.equal(
      getBillingPeriodForDate(new Date(2026, 4, 2, 12, 0, 0, 0), 2),
      '2026-06',
    );
  });

  it('classifies installment occurrence dates on the closing day as the next invoice period', () => {
    assert.equal(
      getBillingPeriodForDate(new Date(2026, 5, 2, 9, 30, 0, 0), 2),
      '2026-07',
    );
    assert.equal(
      getBillingPeriodForDate(new Date(2026, 6, 2, 9, 30, 0, 0), 2),
      '2026-08',
    );
  });

  it('rolls the invoice period into the next year at a December closing boundary', () => {
    assert.equal(
      getBillingPeriodForDate(new Date(2026, 11, 2, 0, 0, 0, 0), 2),
      '2027-01',
    );
  });
});
