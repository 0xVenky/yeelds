/**
 * Token bucket rate limiter.
 * Block explorer free tiers allow 5 requests/second per chain.
 * One limiter instance per chain — call waitForToken() before each request.
 */
export function createRateLimiter(maxPerSecond: number) {
  let tokens = maxPerSecond;
  let lastRefill = Date.now();

  return async function waitForToken(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - lastRefill) / 1000;
    tokens = Math.min(maxPerSecond, tokens + elapsed * maxPerSecond);
    lastRefill = now;

    if (tokens < 1) {
      const waitMs = ((1 - tokens) / maxPerSecond) * 1000;
      await new Promise((r) => setTimeout(r, waitMs));
      tokens = 0;
      lastRefill = Date.now();
    } else {
      tokens -= 1;
    }
  };
}
