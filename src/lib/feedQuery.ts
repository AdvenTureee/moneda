import type { Expense, ExpenseFilters, ExpensePaymentMethod } from '@/types';

export const FEED_PAGE_SIZE = 30;

export type FeedOrder = 'history' | 'scheduled';

export interface FeedQueryInput {
  category?: string | null;
  paymentMethod?: ExpensePaymentMethod | null;
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
  order?: FeedOrder;
  limit?: number | null;
}

export interface FeedCursor {
  occurredAt: string;
  id: string;
}

export function encodeFeedCursor(expense: Pick<Expense, 'id' | 'createdAt'>): string {
  const occurredAt = new Date(expense.createdAt).toISOString();
  return `${occurredAt}__${expense.id}`;
}

export function parseFeedCursor(cursor: string | null | undefined): FeedCursor | null {
  if (!cursor) return null;
  const [occurredAt, id] = cursor.split('__');
  if (!occurredAt || !id || Number.isNaN(new Date(occurredAt).getTime())) return null;
  return { occurredAt, id };
}

export function normalizeFeedLimit(limit: unknown): number {
  const value = Number(limit);
  if (!Number.isFinite(value)) return FEED_PAGE_SIZE;
  return Math.max(1, Math.min(Math.trunc(value), 100));
}

export function buildFeedQueryKey(input: FeedQueryInput): string {
  const params = new URLSearchParams();
  params.set('order', input.order ?? 'history');
  params.set('limit', String(normalizeFeedLimit(input.limit ?? FEED_PAGE_SIZE)));
  if (input.category) params.set('category', input.category);
  if (input.paymentMethod) params.set('paymentMethod', input.paymentMethod);
  if (input.startDate) params.set('startDate', input.startDate);
  if (input.endDate) params.set('endDate', input.endDate);
  const search = input.search?.trim();
  if (search) params.set('search', search);
  return params.toString();
}

export function buildExpenseFiltersFromFeedQuery(
  userId: string,
  input: FeedQueryInput & { cursor?: string | null },
): ExpenseFilters {
  const order = input.order ?? 'history';
  return {
    userId,
    category: input.category ?? undefined,
    paymentMethod: input.paymentMethod ?? undefined,
    startDate: input.startDate ?? undefined,
    endDate: input.endDate ?? undefined,
    search: input.search?.trim() || undefined,
    order,
    cursor: input.cursor ?? undefined,
    limit: normalizeFeedLimit(input.limit ?? FEED_PAGE_SIZE),
    onlyFuture: order === 'scheduled',
    includeFuture: order === 'scheduled',
  };
}

export function buildFeedSearchParams(input: FeedQueryInput & { cursor?: string | null }): URLSearchParams {
  const params = new URLSearchParams(buildFeedQueryKey(input));
  if (input.order === 'scheduled') params.set('onlyFuture', 'true');
  if (input.cursor) params.set('cursor', input.cursor);
  return params;
}
