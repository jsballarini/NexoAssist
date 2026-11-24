const hits = new Map<string, { count: number; windowStart: number }>();

export function checkApiRateLimit(
  key: string,
  limitPerMin: number,
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const windowMs = 60_000;
  let entry = hits.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { count: 0, windowStart: now };
    hits.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > limitPerMin) {
    const retryAfterSec = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  return { allowed: true };
}