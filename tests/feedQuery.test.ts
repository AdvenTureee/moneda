import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildFeedQueryKey,
  encodeFeedCursor,
  normalizeFeedLimit,
  parseFeedCursor,
} from '../src/lib/feedQuery';

describe('feed query helpers', () => {
  it('builds stable keys without cursor state', () => {
    const input = {
      order: 'history' as const,
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-06-30T23:59:59.999Z',
      search: ' mercado ',
      limit: 30,
    };

    assert.equal(
      buildFeedQueryKey(input),
      'order=history&limit=30&startDate=2026-06-01T00%3A00%3A00.000Z&endDate=2026-06-30T23%3A59%3A59.999Z&search=mercado',
    );
  });

  it('round-trips feed cursors', () => {
    const cursor = encodeFeedCursor({
      id: '9f6f77de-c2e8-4e14-b611-8342f093aa01',
      createdAt: new Date('2026-06-15T12:34:56.789Z'),
    });

    assert.deepEqual(parseFeedCursor(cursor), {
      occurredAt: '2026-06-15T12:34:56.789Z',
      id: '9f6f77de-c2e8-4e14-b611-8342f093aa01',
    });
  });

  it('bounds feed page sizes', () => {
    assert.equal(normalizeFeedLimit(undefined), 30);
    assert.equal(normalizeFeedLimit(0), 1);
    assert.equal(normalizeFeedLimit(250), 100);
  });
});
