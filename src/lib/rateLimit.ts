import { createServiceClient, isSupabaseEnabled } from '@/lib/supabase/server';

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

type ConsumeRateLimitInput = {
  key: string;
  limit: number;
  windowMs?: number;
};

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number = WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  bucket.timestamps.push(now);
  return { ok: true, remaining: limit - bucket.timestamps.length };
}

/** Evita crescimento ilimitado do Map em dev long-running. */
function pruneRateLimitBuckets(maxKeys = 500) {
  if (buckets.size <= maxKeys) return;
  const keys = [...buckets.keys()].slice(0, buckets.size - maxKeys);
  for (const k of keys) buckets.delete(k);
}

function parseRateLimitResult(raw: unknown): RateLimitResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (value.ok === true && typeof value.remaining === 'number') {
    return { ok: true, remaining: value.remaining };
  }
  if (value.ok === false && typeof value.retryAfterSec === 'number') {
    return { ok: false, retryAfterSec: value.retryAfterSec };
  }
  return null;
}

export async function consumeRateLimit({
  key,
  limit,
  windowMs = WINDOW_MS,
}: ConsumeRateLimitInput): Promise<RateLimitResult> {
  pruneRateLimitBuckets();

  if (!isSupabaseEnabled()) {
    return checkMemoryRateLimit(key, limit, windowMs);
  }

  try {
    const db = createServiceClient();
    const { data, error } = await (db as any).rpc('consume_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    });

    if (error) throw error;
    const parsed = parseRateLimitResult(data);
    if (!parsed) throw new Error('Invalid rate limit response');
    return parsed;
  } catch (error) {
    console.error('[rate-limit:fallback]', error);
    return checkMemoryRateLimit(key, limit, windowMs);
  }
}
