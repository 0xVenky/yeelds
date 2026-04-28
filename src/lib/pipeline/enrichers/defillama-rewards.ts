/**
 * DeFi Llama reward-token enricher (Decision 20 — LI.FI is primary).
 *
 * Flow:
 *   1. Bulk-fetch DeFi Llama pools (hourly upstream, 6h cache here).
 *   2. Build a Map keyed by `chain:project:sortedUnderlyingAddresses`.
 *      Gap analysis §Plan Amendment 3: DeFi Llama's `pool` field is a UUID,
 *      not a contract address. Underlying-token sets are the only reliable
 *      cross-source join key.
 *   3. For each LI.FI-normalized pool, look up its DL match, aggregate
 *      `rewardTokens` across collisions, and mutate the pool's
 *      `incentives_summary` to carry reward-token symbols.
 *
 * Fire-and-forget. A DL failure must never block the pipeline.
 */

import type { PoolListItem } from "@/lib/types";
import { fetchDefiLlamaPools, type DefiLlamaPool } from "@/lib/pipeline/fetchers/defillama";
import { DEFILLAMA_CHAIN_MAP } from "@/lib/constants";
import { lookupToken } from "@/lib/pipeline/tokens";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

type RewardEntry = {
  rewardTokens: string[]; // lowercased addresses, deduped across pool variants
};

let lookupCache = new Map<string, RewardEntry>();
let lastFetch: Date | null = null;

function makeKey(chain: string, project: string, underlyingAddrs: string[]): string {
  const sorted = [...underlyingAddrs].map(a => a.toLowerCase()).sort();
  return `${chain}:${project}:${sorted.join(",")}`;
}

function buildLookup(pools: DefiLlamaPool[]): Map<string, RewardEntry> {
  const map = new Map<string, RewardEntry>();
  for (const p of pools) {
    const chain = DEFILLAMA_CHAIN_MAP[p.chain];
    if (!chain) continue;
    if (!p.rewardTokens || p.rewardTokens.length === 0) continue;
    if (!p.underlyingTokens || p.underlyingTokens.length === 0) continue;

    const key = makeKey(chain, p.project, p.underlyingTokens);
    const existing = map.get(key);
    const rewardsLower = p.rewardTokens.map(a => a.toLowerCase());
    if (existing) {
      const merged = new Set([...existing.rewardTokens, ...rewardsLower]);
      existing.rewardTokens = Array.from(merged);
    } else {
      map.set(key, { rewardTokens: Array.from(new Set(rewardsLower)) });
    }
  }
  return map;
}

/**
 * Address → symbol lookup via tokens.json. Returns null for unknown addresses
 * so the caller can skip them — we never emit a "symbol" that's actually
 * a truncated address, because the UI would render that as garbage.
 * Incentive presence is still preserved via incentives_summary.count.
 */
function addressToSymbol(address: string, chain: string): string | null {
  return lookupToken(address, chain)?.symbol ?? null;
}

/**
 * Enrich LI.FI-normalized pools with DeFi Llama reward-token data.
 * Mutates pools in place. Returns simple stats for logging.
 */
export async function enrichWithDefiLlamaRewards(
  pools: PoolListItem[],
): Promise<{ matched: number; unmatched: number; total: number }> {
  if (lastFetch && Date.now() - lastFetch.getTime() < CACHE_TTL_MS) {
    console.log(`[dl-rewards] Using cached lookup (${lookupCache.size} reward entries)`);
  } else {
    try {
      const dlPools = await fetchDefiLlamaPools();
      lookupCache = buildLookup(dlPools);
      lastFetch = new Date();
      console.log(`[dl-rewards] Built lookup from ${dlPools.length} DL pools → ${lookupCache.size} reward entries`);
    } catch (err) {
      console.warn(`[dl-rewards] Fetch failed, skipping enrichment: ${(err as Error).message}`);
      return { matched: 0, unmatched: pools.length, total: pools.length };
    }
  }

  let matched = 0;
  let unmatched = 0;

  for (const pool of pools) {
    const underlying = pool.exposure.underlying_tokens.map(t => t.address);
    if (underlying.length === 0) {
      unmatched++;
      continue;
    }
    const key = makeKey(pool.chain, pool.protocol, underlying);
    const entry = lookupCache.get(key);
    if (!entry) {
      unmatched++;
      continue;
    }

    const resolvedSymbols = entry.rewardTokens
      .map(addr => addressToSymbol(addr, pool.chain))
      .filter((s): s is string => s !== null);
    // Dedup — upgrades/wrappers can collapse multiple addresses to one symbol.
    const uniqueSymbols = Array.from(new Set(resolvedSymbols));

    if (uniqueSymbols.length > 0) {
      pool.incentives_summary.reward_token_symbols = uniqueSymbols;
    }
    // `sources` holds provider names (lifi, later merkl/metrom), never reward-token
    // symbols. Ensure "lifi" is present when we promote count — otherwise a pool
    // can end up with count=1 and sources=[] (no attribution for an asserted incentive).
    if (!pool.incentives_summary.sources.includes("lifi")) {
      pool.incentives_summary.sources = [...pool.incentives_summary.sources, "lifi"];
    }
    // A DL match with reward tokens means there is at least one incentive,
    // even if LI.FI's aggregate apy.reward happened to be null (e.g. Merkl
    // campaign not yet reflected in LI.FI's snapshot), and even if tokens.json
    // doesn't carry the reward token symbol.
    if (pool.incentives_summary.count === 0) pool.incentives_summary.count = 1;

    matched++;
  }

  console.log(`[dl-rewards] Enrichment complete: ${matched} matched, ${unmatched} unmatched (${pools.length} total)`);
  return { matched, unmatched, total: pools.length };
}

/**
 * Test-only helper: clear cached DL data so a subsequent enrich call re-fetches.
 * Never used in production paths.
 */
export function _resetDefiLlamaRewardsCache(): void {
  lookupCache = new Map();
  lastFetch = null;
}
