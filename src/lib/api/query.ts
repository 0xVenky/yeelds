import { ensureCachePopulated, getCachedPools, getCachedBenchmarks, getLastRefreshed, getMorphoVaultData, getUpshiftVaultData } from "@/lib/pipeline/cache";
import { filterPools, applyDiscoveryMode, sortPools, paginatePools } from "@/lib/api/pool-query";
import type { PoolListItem, PoolDetail, PaginatedResponse, StatsResponse, BenchmarksResponse } from "@/lib/types";
import { ensureDealsPopulated, getDeals } from "@/lib/deals/store";
import type { Deal } from "@/lib/deals/types";
import { CURATED_PROTOCOLS, PROTOCOL_APP_URLS } from "@/lib/constants";

type QueryParams = {
  [key: string]: string | undefined;
};

/**
 * Query pools directly from the in-memory cache.
 * Used by both API routes and server components — no HTTP self-fetch.
 */
export async function queryPools(
  params: QueryParams,
): Promise<PaginatedResponse<PoolListItem> & { last_refreshed: string | null }> {
  await ensureCachePopulated();
  let pools = getCachedPools();

  const chain = params.chain;
  const pool_type = params.pool_type;
  const protocol = params.protocol;
  const exposure = params.exposure;
  const exposure_category = params.exposure_category;
  const asset_class = params.asset_class;
  const yield_source = params.yield_source;
  const yield_bearing = params.yield_bearing === "true" ? true : undefined;
  const min_tvl = params.min_tvl ? parseFloat(params.min_tvl) : undefined;
  const min_apr = params.min_apr ? parseFloat(params.min_apr) : undefined;
  const max_apr = params.max_apr ? parseFloat(params.max_apr) : undefined;
  const has_incentives = params.has_incentives === "true" ? true : undefined;
  const search = params.search;
  const view = params.view;
  const sort = params.sort ?? "tvl_usd";
  const order = (params.order === "asc" ? "asc" : "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit ?? "25", 10) || 25));

  pools = filterPools(pools, {
    search, chain, pool_type, protocol, exposure, exposure_category,
    asset_class, yield_source, yield_bearing,
    min_tvl, min_apr, max_apr, has_incentives,
    order, page, limit,
  });

  if (view) {
    pools = applyDiscoveryMode(pools, view);
  } else {
    pools = sortPools(pools, sort, order);
  }

  const result = paginatePools(pools, page, limit);

  return {
    ...result,
    last_refreshed: getLastRefreshed()?.toISOString() ?? null,
  };
}

/**
 * Get a single pool by ID, with detail fields.
 */
export async function queryPoolById(id: string): Promise<PoolDetail | null> {
  await ensureCachePopulated();
  const pool = getCachedPools().find(p => p.id === id);
  if (!pool) return null;

  return {
    ...pool,
    incentive_campaigns: [],
    risk_detail: {
      contract_age_days: pool.risk.contract_age_days,
      contract_address: null,
      is_verified: pool.risk.is_verified,
      is_audited: pool.risk.is_audited,
      audit_firms: null,
      top_lp_concentration: pool.risk.top_lp_concentration,
      pool_age_days: null,
      has_admin_key: null,
      underlying_depeg_risk: pool.risk.underlying_depeg_risk,
      notes: null,
    },
    morpho_vault: getMorphoVaultData(pool.id),
    upshift_vault: getUpshiftVaultData(pool.id),
  };
}

/**
 * Get stats directly from the in-memory cache.
 */
export async function queryStats(): Promise<StatsResponse> {
  await ensureCachePopulated();
  const pools = getCachedPools();

  return {
    total_pools: pools.length,
    total_tvl_usd: pools.reduce((sum, p) => sum + p.tvl_usd, 0),
    chains_covered: new Set(pools.map(p => p.chain)).size,
    protocols_covered: new Set(pools.map(p => p.protocol)).size,
    last_refreshed: getLastRefreshed()?.toISOString() ?? null,
    refresh_interval_minutes: 15,
    benchmarks: getCachedBenchmarks(),
  };
}

/**
 * Get asset-class benchmarks directly from the in-memory cache.
 * Used by server components for benchmark display — no HTTP self-fetch.
 */
export async function queryBenchmarks(): Promise<BenchmarksResponse> {
  await ensureCachePopulated();

  return {
    benchmarks: getCachedBenchmarks(),
    last_refreshed: getLastRefreshed()?.toISOString() ?? null,
  };
}

/**
 * Get curated LP deals from the in-memory store.
 * Used by the /deals page server component — no HTTP self-fetch.
 */
export function queryDeals(): { deals: Deal[]; total: number } {
  ensureDealsPopulated();
  const deals = getDeals();
  return { deals, total: deals.length };
}

// --- Protocol aggregation ---

export type ProtocolSummary = {
  id: string;
  name: string;
  type: string;
  color: string;
  pool_count: number;
  chains: string[];
  total_tvl_usd: number;
  avg_apr: number;
  top_apr: number;
  asset_classes: string[];
  protocol_url: string | null;
};

/**
 * Aggregate cached pools by curated protocol.
 * Returns ProtocolSummary[] sorted by TVL descending.
 */
export async function queryProtocols(): Promise<{ protocols: ProtocolSummary[]; total: number }> {
  await ensureCachePopulated();
  const allPools = getCachedPools();

  const protocols: ProtocolSummary[] = [];

  for (const cp of CURATED_PROTOCOLS) {
    const slugSet = new Set(cp.slugs);
    const pools = allPools.filter(p => slugSet.has(p.protocol));

    const chains = [...new Set(pools.map(p => p.chain))];
    const assetClasses = [...new Set(pools.map(p => p.exposure.asset_class).filter((ac): ac is string => ac !== null))];
    const totalTvl = pools.reduce((sum, p) => sum + p.tvl_usd, 0);
    const topApr = pools.length > 0 ? Math.max(...pools.map(p => p.yield.apr_total)) : 0;

    // TVL-weighted average APR
    let avgApr = 0;
    if (totalTvl > 0) {
      const weightedSum = pools.reduce((sum, p) => sum + p.yield.apr_total * p.tvl_usd, 0);
      avgApr = weightedSum / totalTvl;
    }

    protocols.push({
      id: cp.id,
      name: cp.name,
      type: cp.type,
      color: cp.color,
      pool_count: pools.length,
      chains,
      total_tvl_usd: totalTvl,
      avg_apr: Math.round(avgApr * 100) / 100,
      top_apr: Math.round(topApr * 100) / 100,
      asset_classes: assetClasses,
      protocol_url: PROTOCOL_APP_URLS[cp.slugs[0]] ?? null,
    });
  }

  // Sort by TVL descending
  protocols.sort((a, b) => b.total_tvl_usd - a.total_tvl_usd);

  return { protocols, total: protocols.length };
}
