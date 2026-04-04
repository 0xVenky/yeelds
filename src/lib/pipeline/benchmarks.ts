import type { PoolListItem, AssetClassBenchmark } from "@/lib/types";

const BENCHMARK_ASSET_CLASSES = [
  "usd_stable",
  "eur_stable",
  "eth_class",
  "btc_class",
  "rwa",
] as const;

const MIN_TVL = 1_000_000;
const TOP_N = 10;
const TOP_POOLS_COUNT = 3;
const HIGH_APR_WARNING_THRESHOLD = 100;

/**
 * Compute TVL-weighted benchmark APR per asset class.
 * Pure function — no side effects, no cache access.
 */
export function computeBenchmarks(
  pools: PoolListItem[],
): Record<string, AssetClassBenchmark> {
  const now = new Date().toISOString();
  const result: Record<string, AssetClassBenchmark> = {};

  for (const assetClass of BENCHMARK_ASSET_CLASSES) {
    // RWA filters by yield_source, not exposure.asset_class (Decision 12 + Step 15)
    const qualifying = pools.filter((p) => {
      if (p.tvl_usd < MIN_TVL) return false;
      if (assetClass === "rwa") {
        return p.yield_source === "rwa_yield";
      }
      return p.exposure.asset_class === assetClass;
    });

    if (qualifying.length === 0) {
      result[assetClass] = emptyBenchmark(assetClass, now);
      continue;
    }

    // Sort by TVL desc for top-N selection
    const sorted = [...qualifying].sort((a, b) => b.tvl_usd - a.tvl_usd);
    const topN = sorted.slice(0, TOP_N);

    // TVL-weighted average APR
    let weightedSum = 0;
    let tvlSum = 0;
    for (const pool of topN) {
      weightedSum += pool.yield.apr_total * pool.tvl_usd;
      tvlSum += pool.tvl_usd;
    }
    const benchmarkApr = tvlSum > 0 ? weightedSum / tvlSum : 0;

    if (benchmarkApr > HIGH_APR_WARNING_THRESHOLD) {
      console.warn(
        `Benchmark warning: ${assetClass} weighted APR is ${benchmarkApr.toFixed(2)}% — possible outlier distortion`,
      );
    }

    // APR range across ALL qualifying pools (not just top N)
    const aprs = qualifying.map((p) => p.yield.apr_total);
    const minApr = Math.min(...aprs);
    const maxApr = Math.max(...aprs);

    // Total TVL and count across ALL qualifying pools
    const totalTvl = qualifying.reduce((sum, p) => sum + p.tvl_usd, 0);

    // Top 3 by TVL
    const topPools = sorted.slice(0, TOP_POOLS_COUNT).map((p) => ({
      id: p.id,
      protocol: p.protocol,
      symbol: p.symbol,
      apr_total: p.yield.apr_total,
      tvl_usd: p.tvl_usd,
    }));

    result[assetClass] = {
      asset_class: assetClass,
      benchmark_apr: Math.round(benchmarkApr * 100) / 100,
      pool_count: qualifying.length,
      total_tvl_usd: totalTvl,
      apr_range: {
        min: Math.round(minApr * 100) / 100,
        max: Math.round(maxApr * 100) / 100,
      },
      qualifying_pool_count: topN.length,
      top_pools: topPools,
      computed_at: now,
    };
  }

  return result;
}

function emptyBenchmark(assetClass: string, now: string): AssetClassBenchmark {
  return {
    asset_class: assetClass,
    benchmark_apr: 0,
    pool_count: 0,
    total_tvl_usd: 0,
    apr_range: { min: 0, max: 0 },
    qualifying_pool_count: 0,
    top_pools: [],
    computed_at: now,
  };
}
