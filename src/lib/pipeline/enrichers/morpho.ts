/**
 * Morpho vault allocation enrichment.
 * Fetches market-level allocation breakdown for Morpho vaults via their public GraphQL API.
 * No API key required.
 *
 * Matching strategy: DeFi Llama Morpho pools don't contain vault addresses.
 * We bulk-fetch all Morpho vaults, then match each DL pool to a vault by:
 *   1. Same chain
 *   2. Same deposit asset address (case-insensitive)
 *   3. Closest TVL (tiebreaker when multiple vaults share chain + asset)
 */

import type { PoolListItem, MorphoVaultData, VaultAllocation } from "@/lib/types";
import { CHAIN_IDS, type SupportedChain } from "@/lib/constants";

const MORPHO_API = "https://blue-api.morpho.org/graphql";

// 6-hour TTL for Morpho data (same as risk cache)
const MORPHO_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Module-level cache: poolId → MorphoVaultData
let morphoCache = new Map<string, MorphoVaultData>();
let lastMorphoFetch: Date | null = null;

// --- GraphQL queries ---

const VAULTS_QUERY = `
  query AllVaults($chainIds: [Int!]!, $first: Int!, $skip: Int!) {
    vaults(
      where: { chainId_in: $chainIds, totalAssetsUsd_gte: 100000 }
      first: $first
      skip: $skip
      orderBy: TotalAssetsUsd
    ) {
      items {
        address
        name
        symbol
        chain { id }
        asset { address symbol name }
        state {
          totalAssetsUsd
          netApy
          netApyExcludingRewards
          fee
          allocation {
            supplyAssetsUsd
            market {
              lltv
              loanAsset { address symbol }
              collateralAsset { address symbol }
              state { supplyApy }
            }
          }
        }
      }
      pageInfo { count }
    }
  }
`;

// --- API types ---

type MorphoApiVault = {
  address: string;
  name: string;
  symbol: string;
  chain: { id: number };
  asset: { address: string; symbol: string; name: string };
  state: {
    totalAssetsUsd: number;
    netApy: number;
    netApyExcludingRewards: number;
    fee: number;
    allocation: Array<{
      supplyAssetsUsd: number;
      market: {
        lltv: string | null;
        loanAsset: { address: string; symbol: string };
        collateralAsset: { address: string; symbol: string } | null;
        state: { supplyApy: number };
      };
    }>;
  };
};

// --- Helpers ---

async function fetchMorphoGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(MORPHO_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Morpho API HTTP ${res.status}: ${res.statusText}`);
  }
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`Morpho API error: ${json.errors[0].message}`);
  }
  if (!json.data) {
    throw new Error("Morpho API returned no data");
  }
  return json.data;
}

/**
 * Fetch all Morpho vaults on our chains (paginated).
 */
async function fetchAllVaults(): Promise<MorphoApiVault[]> {
  const chainIds = Object.values(CHAIN_IDS);
  const allVaults: MorphoApiVault[] = [];
  const pageSize = 200;
  let skip = 0;

  // Paginate until we get all vaults
  for (let page = 0; page < 10; page++) {
    const data = await fetchMorphoGraphQL<{
      vaults: { items: MorphoApiVault[]; pageInfo: { count: number } };
    }>(VAULTS_QUERY, { chainIds, first: pageSize, skip });

    allVaults.push(...data.vaults.items);

    if (allVaults.length >= data.vaults.pageInfo.count || data.vaults.items.length < pageSize) {
      break;
    }
    skip += pageSize;
  }

  return allVaults;
}

/**
 * Transform a Morpho API vault into our MorphoVaultData shape.
 */
function transformVault(vault: MorphoApiVault): MorphoVaultData {
  const totalUsd = vault.state.totalAssetsUsd;

  const allocations: VaultAllocation[] = vault.state.allocation
    .filter((a) => a.supplyAssetsUsd > 0)
    .map((a) => ({
      loan_asset: { address: a.market.loanAsset.address, symbol: a.market.loanAsset.symbol },
      collateral_asset: a.market.collateralAsset
        ? { address: a.market.collateralAsset.address, symbol: a.market.collateralAsset.symbol }
        : null,
      lltv: a.market.lltv ? Number(a.market.lltv) / 1e18 : null,
      supply_usd: a.supplyAssetsUsd,
      allocation_pct: totalUsd > 0 ? Math.round((a.supplyAssetsUsd / totalUsd) * 10000) / 100 : 0,
      supply_apy: a.market.state.supplyApy,
    }))
    .sort((a, b) => b.supply_usd - a.supply_usd);

  return {
    vault_address: vault.address,
    vault_name: vault.name,
    deposit_asset: vault.asset,
    total_assets_usd: totalUsd,
    net_apy: vault.state.netApy,
    net_apy_excluding_rewards: vault.state.netApyExcludingRewards,
    fee_pct: vault.state.fee,
    allocations,
  };
}

/**
 * Match a DeFi Llama morpho pool to a Morpho API vault.
 * Uses chain + asset address + TVL proximity.
 */
function findBestVaultMatch(
  pool: PoolListItem,
  vaults: MorphoApiVault[],
): MorphoApiVault | null {
  const poolChainId = CHAIN_IDS[pool.chain as SupportedChain];
  if (!poolChainId) return null;

  const poolAsset = pool.exposure.underlying_tokens[0]?.address?.toLowerCase();
  if (!poolAsset) return null;

  // Filter to same chain + same deposit asset
  const candidates = vaults.filter(
    (v) => v.chain.id === poolChainId && v.asset.address.toLowerCase() === poolAsset,
  );

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Multiple vaults for same chain + asset: pick closest TVL
  let best = candidates[0];
  let bestDiff = Math.abs(pool.tvl_usd - best.state.totalAssetsUsd);

  for (let i = 1; i < candidates.length; i++) {
    const diff = Math.abs(pool.tvl_usd - candidates[i].state.totalAssetsUsd);
    if (diff < bestDiff) {
      best = candidates[i];
      bestDiff = diff;
    }
  }

  return best;
}

// --- Public API ---

/**
 * Enrich Morpho vault pools with allocation data.
 * Fetches all vaults in bulk, matches to DL pools, caches results.
 * Returns a Map of poolId → MorphoVaultData.
 */
export async function enrichMorphoVaults(
  pools: PoolListItem[],
): Promise<Map<string, MorphoVaultData>> {
  // Check TTL — skip if recent
  if (lastMorphoFetch && Date.now() - lastMorphoFetch.getTime() < MORPHO_CACHE_TTL_MS) {
    console.log(`[morpho] Using cached data (${morphoCache.size} vaults, fetched ${lastMorphoFetch.toISOString()})`);
    return morphoCache;
  }

  const morphoPools = pools.filter((p) => p.protocol === "morpho-v1");
  if (morphoPools.length === 0) {
    console.log("[morpho] No morpho-v1 pools found, skipping enrichment");
    return morphoCache;
  }

  console.log(`[morpho] Enriching ${morphoPools.length} Morpho pools...`);

  // Bulk fetch all vaults from Morpho API
  const allVaults = await fetchAllVaults();
  console.log(`[morpho] Fetched ${allVaults.length} vaults from Morpho API`);

  // Match each DL pool to a Morpho vault
  const newCache = new Map<string, MorphoVaultData>();
  let matched = 0;
  let unmatched = 0;

  for (const pool of morphoPools) {
    const vault = findBestVaultMatch(pool, allVaults);
    if (vault) {
      newCache.set(pool.id, transformVault(vault));
      // Show vault name instead of DeFi Llama symbol (e.g., "Gauntlet USDC Prime" not "GTUSDCP")
      pool.symbol = vault.name;
      matched++;
    } else {
      unmatched++;
    }
  }

  morphoCache = newCache;
  lastMorphoFetch = new Date();

  console.log(`[morpho] Enrichment complete: ${matched} matched, ${unmatched} unmatched`);
  return morphoCache;
}

/**
 * Get Morpho vault data for a specific pool.
 */
export function getMorphoVaultData(poolId: string): MorphoVaultData | null {
  return morphoCache.get(poolId) ?? null;
}
