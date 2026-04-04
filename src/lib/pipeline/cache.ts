import type { PoolListItem, AssetClassBenchmark } from "@/lib/types";
import { fetchDefiLlamaPools } from "@/lib/pipeline/fetchers/defillama";
import { normalizeDefiLlamaPool } from "@/lib/pipeline/normalizers/normalize";
import { enrichPoolsWithRisk } from "@/lib/pipeline/enrichers/block-explorer";
import { computeBenchmarks } from "@/lib/pipeline/benchmarks";

let cachedPools: PoolListItem[] = [];
let cachedBenchmarks: Record<string, AssetClassBenchmark> = {};
let lastRefreshed: Date | null = null;
let isRefreshing = false;

export function getCachedPools(): PoolListItem[] {
  return cachedPools;
}

export function getCachedBenchmarks(): Record<string, AssetClassBenchmark> {
  return cachedBenchmarks;
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

    // Set cache immediately so pages can render with data
    cachedPools = normalized;
    cachedBenchmarks = computeBenchmarks(normalized);
    lastRefreshed = new Date();

    console.log(`Cache refreshed: ${normalized.length} pools, ${errors.length} errors`);

    // Enrich top 100 pools with risk signals in background (don't block page render)
    const top100 = [...normalized]
      .sort((a, b) => b.tvl_usd - a.tvl_usd)
      .slice(0, 100);
    enrichPoolsWithRisk(top100).catch((e) => {
      console.warn(`Background risk enrichment failed: ${(e as Error).message}`);
    });

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
