/**
 * Upshift vault enrichment.
 * Fetches vault names and APY breakdown from the Upshift REST API.
 * No API key required.
 *
 * Matching: DeFi Llama symbol (uppercased) matches Upshift receipt_token_symbol (uppercased).
 * e.g., DL "HGETH" = Upshift "hgETH" → vault name "High Growth ETH"
 *
 * APY format note: Upshift API has inconsistent units.
 *   - `apy` is a decimal (0.082 = 8.2%)
 *   - `underlying_apy` is already a percentage (2.72 = 2.72%)
 * We normalize both to percentage for storage.
 */

import type { PoolListItem, UpshiftVaultData } from "@/lib/types";
import { CHAIN_IDS, type SupportedChain } from "@/lib/constants";

const UPSHIFT_API = "https://api.upshift.finance/v1";
const UPSHIFT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Module-level cache: poolId → UpshiftVaultData
let upshiftCache = new Map<string, UpshiftVaultData>();
let lastUpshiftFetch: Date | null = null;

// --- API types ---

type UpshiftApiVault = {
  address: string;
  vault_name: string;
  receipt_token_symbol: string;
  chain: number;
  is_visible: boolean;
  status: string;
  public_type: string | null;
  tvl: number;
  reported_apy: {
    apy: number | null;
    underlying_apy: number | null;
    rewards_compounded: number | null;
    rewards_claimable: number | null;
  } | null;
  weekly_performance_fee_bps: number | null;
  start_datetime: string | null;
};

// --- Helpers ---

const CHAIN_ID_TO_NAME: Record<number, SupportedChain> = {
  1: "ethereum",
  42161: "arbitrum",
  8453: "base",
};

async function fetchUpshiftVaults(): Promise<UpshiftApiVault[]> {
  const res = await fetch(`${UPSHIFT_API}/tokenized_vaults?status=active`);
  if (!res.ok) {
    throw new Error(`Upshift API HTTP ${res.status}: ${res.statusText}`);
  }
  const vaults = (await res.json()) as UpshiftApiVault[];

  // Filter to our chains and visible vaults
  return vaults.filter(
    (v) => v.is_visible && CHAIN_ID_TO_NAME[v.chain] !== undefined,
  );
}

function transformVault(vault: UpshiftApiVault): UpshiftVaultData {
  const apy = vault.reported_apy;
  return {
    vault_address: vault.address,
    vault_name: vault.vault_name,
    vault_type: vault.public_type ?? "Vault",
    receipt_token_symbol: vault.receipt_token_symbol,
    // apy field is decimal (0.082 = 8.2%), convert to percentage
    apy_total: (apy?.apy ?? 0) * 100,
    // underlying_apy is already in percentage (2.72 = 2.72%)
    apy_underlying: apy?.underlying_apy ?? 0,
    fee_bps: vault.weekly_performance_fee_bps ?? 0,
    launch_date: vault.start_datetime ? vault.start_datetime.slice(0, 10) : null,
  };
}

// --- Public API ---

/**
 * Enrich Upshift vault pools with vault names and APY data.
 * Matches by chain + symbol (case-insensitive).
 */
export async function enrichUpshiftVaults(
  pools: PoolListItem[],
): Promise<Map<string, UpshiftVaultData>> {
  if (lastUpshiftFetch && Date.now() - lastUpshiftFetch.getTime() < UPSHIFT_CACHE_TTL_MS) {
    console.log(`[upshift] Using cached data (${upshiftCache.size} vaults)`);
    return upshiftCache;
  }

  const upshiftPools = pools.filter((p) => p.protocol === "upshift");
  if (upshiftPools.length === 0) {
    console.log("[upshift] No upshift pools found, skipping enrichment");
    return upshiftCache;
  }

  console.log(`[upshift] Enriching ${upshiftPools.length} Upshift pools...`);

  const apiVaults = await fetchUpshiftVaults();
  console.log(`[upshift] Fetched ${apiVaults.length} vaults from Upshift API`);

  // Build lookup: chainName:symbolUpper → vault
  const vaultLookup = new Map<string, UpshiftApiVault>();
  for (const v of apiVaults) {
    const chain = CHAIN_ID_TO_NAME[v.chain];
    if (chain) {
      vaultLookup.set(`${chain}:${v.receipt_token_symbol.toUpperCase()}`, v);
    }
  }

  const newCache = new Map<string, UpshiftVaultData>();
  let matched = 0;
  let unmatched = 0;

  for (const pool of upshiftPools) {
    const key = `${pool.chain}:${pool.symbol.toUpperCase()}`;
    const vault = vaultLookup.get(key);
    if (vault) {
      newCache.set(pool.id, transformVault(vault));
      // Show vault name instead of receipt token symbol
      pool.symbol = vault.vault_name;
      matched++;
    } else {
      unmatched++;
    }
  }

  upshiftCache = newCache;
  lastUpshiftFetch = new Date();

  console.log(`[upshift] Enrichment complete: ${matched} matched, ${unmatched} unmatched`);
  return upshiftCache;
}

/**
 * Get Upshift vault data for a specific pool.
 */
export function getUpshiftVaultData(poolId: string): UpshiftVaultData | null {
  return upshiftCache.get(poolId) ?? null;
}
