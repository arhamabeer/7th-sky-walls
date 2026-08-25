import "server-only";

/**
 * In-memory rate limiter for inquiry submissions.
 *
 * Deliberately simple. On a single Vercel instance this stops the obvious
 * abuse — a script hammering the endpoint — without adding a datastore to a
 * site that otherwise needs none. It resets when the instance recycles and
 * does not coordinate across instances, which is an honest limitation rather
 * than a hidden one: the honeypot and the validation rules carry most of the
 * weight, and a genuine spam problem should be answered with a real service
 * rather than a bigger map.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
/** Bound the map so a flood of unique keys cannot grow it without limit. */
const MAX_TRACKED_KEYS = 5000;

const hits = new Map<string, number[]>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    const oldest = recent[0];
    hits.set(key, recent);
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - oldest) };
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
      if (hits.size <= MAX_TRACKED_KEYS) break;
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}
