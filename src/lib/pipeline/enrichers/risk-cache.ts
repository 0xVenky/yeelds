/**
 * In-memory cache for block explorer risk data.
 * Keyed by lowercase(address):chain. TTL = 6 hours.
 * Separate from the pool cache — survives pool refreshes.
 */

export type RiskData = {
  contract_age_days: number | null;
  is_verified: boolean | null;
  fetched_at: Date;
};

const riskCache = new Map<string, RiskData>();
const RISK_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function cacheKey(address: string, chain: string): string {
  return `${address.toLowerCase()}:${chain}`;
}

export function getCachedRisk(address: string, chain: string): RiskData | null {
  const cached = riskCache.get(cacheKey(address, chain));
  if (!cached) return null;
  if (Date.now() - cached.fetched_at.getTime() > RISK_CACHE_TTL_MS) return null;
  return cached;
}

export function setCachedRisk(address: string, chain: string, data: RiskData): void {
  riskCache.set(cacheKey(address, chain), data);
}

export function riskCacheSize(): number {
  return riskCache.size;
}
