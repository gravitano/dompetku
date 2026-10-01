/**
 * Rate limiter fixed-window in-memory.
 *
 * Cukup untuk MVP karena setiap environment hanya menjalankan 1 container app
 * (ITA §8). Dipakai untuk Server Action yang tidak melewati rate limiter
 * better-auth (mis. registrasi, E01-US01).
 */
export type RateLimitResult = {
  allowed: boolean;
  /** Sisa percobaan pada window berjalan. */
  remaining: number;
  /** Milidetik sampai window di-reset. */
  retryAfterMs: number;
};

export type RateLimiter = {
  hit: (key: string) => RateLimitResult;
  reset: () => void;
};

type Bucket = { count: number; resetAt: number };

export function createRateLimiter({
  max,
  windowMs,
  now = Date.now,
}: {
  max: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const buckets = new Map<string, Bucket>();

  function prune(time: number) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= time) buckets.delete(key);
    }
  }

  return {
    hit(key) {
      const time = now();
      if (buckets.size > 10_000) prune(time);

      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= time) {
        bucket = { count: 0, resetAt: time + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;

      return {
        allowed: bucket.count <= max,
        remaining: Math.max(0, max - bucket.count),
        retryAfterMs: bucket.resetAt - time,
      };
    },
    reset() {
      buckets.clear();
    },
  };
}

/** Ambil IP klien dari header proxy (Caddy mengisi `X-Forwarded-For`). */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip")?.trim() || "unknown";
}
