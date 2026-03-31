import type { PoolListItem } from "@/lib/types";
import { fetchDefiLlamaPools } from "@/lib/pipeline/fetchers/defillama";
import { normalizeDefiLlamaPool } from "@/lib/pipeline/normalizers/normalize";

let cachedPools: PoolListItem[] = [];
let lastRefreshed: Date | null = null;
let isRefreshing = false;

export function getCachedPools(): PoolListItem[] {
  return cachedPools;
}

export function getLastRefreshed(): Date | null {
  return lastRefreshed;
}

export async function refreshCache(): Promise<{ count: number; errors: string[] }> {
  if (isRefreshing) return { count: cachedPools.length, errors: ["Refresh already in progress"] };

  isRefreshing = true;
  const errors: string[] = [];

  try {
    let rawPools: Awaited<ReturnType<typeof fetchDefiLlamaPools>>;
    try {
      rawPools = await fetchDefiLlamaPools();
    } catch (e) {
      const msg = `DeFi Llama fetch failed: ${(e as Error).message}`;
      console.error(msg);
      errors.push(msg);
      // Fall back to stale cache — stale-but-correct > crash
      return { count: cachedPools.length, errors };
    }

    const normalized: PoolListItem[] = [];

    for (const raw of rawPools) {
      try {
        normalized.push(normalizeDefiLlamaPool(raw));
      } catch (e) {
        errors.push(`Normalize failed for ${raw.pool}: ${(e as Error).message}`);
      }
    }

    cachedPools = normalized;
    lastRefreshed = new Date();

    console.log(`Cache refreshed: ${normalized.length} pools, ${errors.length} errors`);
    return { count: normalized.length, errors };
  } finally {
    isRefreshing = false;
  }
}

export async function ensureCachePopulated(): Promise<void> {
  if (cachedPools.length === 0 && !isRefreshing) {
    await refreshCache();
  }
}
