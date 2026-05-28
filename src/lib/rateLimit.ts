/** Janela deslizante em memória (por instância serverless). Adequado para MVP. */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export function checkRateLimit(
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
export function pruneRateLimitBuckets(maxKeys = 500) {
  if (buckets.size <= maxKeys) return;
  const keys = [...buckets.keys()].slice(0, buckets.size - maxKeys);
  for (const k of keys) buckets.delete(k);
}
