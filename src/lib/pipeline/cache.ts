import type { PoolListItem, AssetClassBenchmark } from "@/lib/types";
import { fetchAllVaults } from "@/lib/pipeline/fetchers/lifi";
import { normalizeLifiVaults } from "@/lib/pipeline/normalizers/lifi-normalize";
import { enrichPoolsWithRisk } from "@/lib/pipeline/enrichers/block-explorer";
import { enrichMorphoVaults, getMorphoVaultData as getMorphoData } from "@/lib/pipeline/enrichers/morpho";
import { enrichUpshiftVaults, getUpshiftVaultData as getUpshiftData } from "@/lib/pipeline/enrichers/upshift";
import { enrichWithDefiLlamaRewards } from "@/lib/pipeline/enrichers/defillama-rewards";
import { computeBenchmarks } from "@/lib/pipeline/benchmarks";
import { refreshFeed } from "@/lib/feed/store";

let cachedPools: PoolListItem[] = [];
let cachedBenchmarks: Record<string, AssetClassBenchmark> = {};
let lastRefreshed: Date | null = null;
let isRefreshing = false;

// Chat-tool cache freshness signal (chat-review-fixes.md B9). Models can
// distinguish "no matches for these filters" from "data temporarily
// unavailable" only if the tool result tells them which is which.
export type CacheStatus = "ok" | "stale" | "empty";

// 30 minutes — 2× the LI.FI refresh cadence (15min, see CLAUDE.md
// "Common DeFi Pitfalls / Data Freshness"). Picked so that a single
// missed refresh doesn't trip "stale" right when the next refresh is
// moments away (a 15min threshold sits exactly at the cadence and
// flickers on the steady state). Picked over a shorter window (5min)
// so slow LI.FI fetches don't false-positive, and over a longer one
// (1h) because hour-old yields are stale enough to mislead a chat user.
// Bump this if the pipeline refresh cadence ever lengthens.
const CACHE_STALENESS_MS = 30 * 60 * 1000;

export function getCachedPools(): PoolListItem[] {
  return cachedPools;
}

export function getCachedBenchmarks(): Record<string, AssetClassBenchmark> {
  return cachedBenchmarks;
}

export function getLastRefreshed(): Date | null {
  return lastRefreshed;
}

export function getCacheStatus(): CacheStatus {
  if (cachedPools.length === 0) return "empty";
  if (lastRefreshed === null) return "stale";
  const ageMs = Date.now() - lastRefreshed.getTime();
  if (ageMs > CACHE_STALENESS_MS) return "stale";
  return "ok";
}

export async function refreshCache(): Promise<{ count: number; errors: string[] }> {
  if (isRefreshing) return { count: cachedPools.length, errors: ["Refresh already in progress"] };

  isRefreshing = true;
  const errors: string[] = [];

  try {
    let rawVaults: Awaited<ReturnType<typeof fetchAllVaults>>;
    try {
      rawVaults = await fetchAllVaults();
    } catch (e) {
      const msg = `LI.FI fetch failed: ${(e as Error).message}`;
      console.error(msg);
      errors.push(msg);
      // Stale cache beats empty cache — keep whatever we had.
      return { count: cachedPools.length, errors };
    }

    const normalized = normalizeLifiVaults(rawVaults);

    // If the fetcher returned HTTP 200 but zero vaults (upstream shape change,
    // filter regression, outage behind a 200) we must not overwrite a
    // populated cache with nothing. Stale-but-correct > fresh-and-empty.
    if (normalized.length === 0 && cachedPools.length > 0) {
      const msg = `LI.FI returned 0 vaults; preserving stale cache (${cachedPools.length} pools)`;
      console.warn(msg);
      errors.push(msg);
      return { count: cachedPools.length, errors };
    }

    cachedPools = normalized;
    cachedBenchmarks = computeBenchmarks(normalized);
    lastRefreshed = new Date();

    console.log(`Cache refreshed: ${normalized.length} pools, ${errors.length} errors`);

    // Background enrichment — all fire-and-forget, isolated failures.
    const top100 = [...normalized]
      .sort((a, b) => b.tvl_usd - a.tvl_usd)
      .slice(0, 100);
    enrichPoolsWithRisk(top100).catch((e) => {
      console.warn(`Background risk enrichment failed: ${(e as Error).message}`);
    });

    enrichMorphoVaults(normalized).catch((e) => {
      console.warn(`Background Morpho enrichment failed: ${(e as Error).message}`);
    });
    enrichUpshiftVaults(normalized).catch((e) => {
      console.warn(`Background Upshift enrichment failed: ${(e as Error).message}`);
    });

    // DeFi Llama reward-token enricher (Decision 20 — DL is now an enricher).
    enrichWithDefiLlamaRewards(normalized).catch((e) => {
      console.warn(`Background DeFi Llama reward enrichment failed: ${(e as Error).message}`);
    });

    refreshFeed().catch((e) => {
      console.warn(`Background feed refresh failed: ${(e as Error).message}`);
    });

    return { count: normalized.length, errors };
  } finally {
    isRefreshing = false;
  }
}

export { getMorphoData as getMorphoVaultData };
export { getUpshiftData as getUpshiftVaultData };

export async function ensureCachePopulated(): Promise<void> {
  if (cachedPools.length === 0 && !isRefreshing) {
    await refreshCache();
  }
}
