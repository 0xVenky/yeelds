import type { DefiLlamaPool } from "@/lib/pipeline/fetchers/defillama";
import type { PoolListItem, TokenInfo } from "@/lib/types";
import { DEFILLAMA_CHAIN_MAP, RWA_PROTOCOLS } from "@/lib/constants";
import { apyToApr, computeSimulation } from "@/lib/utils";
import { lookupToken } from "@/lib/pipeline/tokens";

const STAKING_PROTOCOLS = [
  "lido", "rocket-pool", "binance-staked-eth", "coinbase-wrapped-staked-eth",
  "frax-ether", "ether.fi-stake", "ether.fi-liquid", "swell-liquid-staking",
  "swell-liquid-restaking", "bifrost-liquid-staking", "stakewise-v2",
  "liquid-collective", "prime-staked-eth", "arpa-staking", "stake.link-liquid",
  "mantle-staked-eth", "stader",
];

const LENDING_PROTOCOLS = [
  "aave-v3", "aave-v2", "compound-v3", "compound-v2", "spark",
  "silo-v2", "radiant-v2", "fluid-lending", "maple", "euler",
  "benqi-lending", "venus-core-pool", "moonwell",
];

const VAULT_PROTOCOLS = [
  "yearn-finance", "beefy", "sommelier", "morpho-v1", "convex-finance",
  "stake-dao", "concentrator", "bracket-vaults", "spectra-metavaults",
];

function inferPoolType(project: string, poolMeta: string | null): string {
  if (STAKING_PROTOCOLS.includes(project)) return "staking";
  if (LENDING_PROTOCOLS.includes(project)) return "lending";
  if (VAULT_PROTOCOLS.includes(project)) return "vault";
  const meta = poolMeta?.toLowerCase();
  if (meta?.includes("lend")) return "lending";
  if (meta?.includes("vault")) return "vault";
  if (meta?.includes("stak")) return "staking";
  return "amm_lp";
}

function deriveYieldSource(project: string, poolType: string): string {
  // RWA override — these protocols' yield comes from real-world assets
  if ((RWA_PROTOCOLS as readonly string[]).includes(project)) return "rwa_yield";
  // Infer from pool type
  switch (poolType) {
    case "amm_lp": return "trading_fees";
    case "lending": return "lending_interest";
    case "staking": return "staking_rewards";
    case "vault": return "strategy_returns";
    default: return "trading_fees";
  }
}

function mapExposureType(exposure: string | null): string {
  if (exposure === "single") return "single";
  if (exposure === "multi") return "multi";
  return "pair";
}

function classifyExposure(tokens: TokenInfo[], defiLlamaStablecoin: boolean): string | null {
  // If we have token data, derive from it
  if (tokens.length > 0 && tokens.some(t => t.asset_class !== null)) {
    if (tokens.every(t => t.is_stable)) return "stablecoin";
    if (tokens.every(t => t.asset_class === "eth_class" || t.asset_class === "btc_class")) return "blue_chip";
    if (tokens.every(t => t.asset_class !== null)) return "mixed";
  }
  // Fallback to DeFi Llama's stablecoin boolean
  if (defiLlamaStablecoin) return "stablecoin";
  return null;
}

function deriveAssetClass(tokens: TokenInfo[]): string | null {
  if (tokens.length === 0) return null;
  const classes = tokens.map(t => t.asset_class).filter(Boolean) as string[];
  if (classes.length === 0) return null;
  // Some tokens unclassified → we can't determine the pool's asset class
  if (classes.length !== tokens.length) return null;
  // All same class → that class
  if (new Set(classes).size === 1) return classes[0];
  return "mixed";
}

function hasYieldBearingToken(tokens: TokenInfo[]): boolean {
  return tokens.some(t => t.is_yield_bearing);
}

function resolveTokens(addresses: string[] | null, chain: string): TokenInfo[] {
  if (!addresses) return [];
  return addresses.map(addr => {
    const token = lookupToken(addr, chain);
    return {
      address: addr,
      symbol: token?.symbol ?? "UNKNOWN",
      chain,
      is_stable: token?.is_stablecoin ?? false,
      asset_class: token?.asset_class ?? null,
      is_yield_bearing: token?.is_yield_bearing ?? false,
      base_token: token?.base_token ?? null,
    };
  });
}

function deriveIncentiveSummary(raw: DefiLlamaPool) {
  const hasRewards = (raw.apyReward ?? 0) > 0;
  return {
    count: hasRewards ? 1 : 0,
    nearest_expiry_days: null as number | null,
    total_daily_rewards_usd: null as number | null,
    sources: [] as string[],
  };
}

export function normalizeDefiLlamaPool(raw: DefiLlamaPool): PoolListItem {
  const chain = DEFILLAMA_CHAIN_MAP[raw.chain];
  if (!chain) {
    throw new Error(`Unknown chain: ${raw.chain}`);
  }

  const aprTotal = apyToApr(raw.apy ?? 0);
  const aprBase = raw.apyBase != null ? apyToApr(raw.apyBase) : null;
  const aprReward = raw.apyReward != null ? apyToApr(raw.apyReward) : null;
  const aprBase7d = raw.apyBase7d != null ? apyToApr(raw.apyBase7d) : null;
  const underlyingTokens = resolveTokens(raw.underlyingTokens, chain);
  const poolType = inferPoolType(raw.project, raw.poolMeta);

  return {
    id: raw.pool,
    chain,
    protocol: raw.project,
    protocol_url: null,
    pool_type: poolType,
    yield_source: deriveYieldSource(raw.project, poolType),
    symbol: raw.symbol,
    tvl_usd: raw.tvlUsd,
    yield: {
      apr_total: aprTotal,
      apr_base: aprBase,
      apr_reward: aprReward,
      apr_base_7d: aprBase7d,
      il_7d: raw.il7d,
    },
    exposure: {
      type: mapExposureType(raw.exposure),
      category: classifyExposure(underlyingTokens, raw.stablecoin),
      asset_class: deriveAssetClass(underlyingTokens),
      has_yield_bearing_token: hasYieldBearingToken(underlyingTokens),
      underlying_tokens: underlyingTokens,
    },
    risk: {
      contract_age_days: null,
      is_audited: null,
      is_verified: null,
      top_lp_concentration: null,
      underlying_depeg_risk: null,
    },
    incentives_summary: deriveIncentiveSummary(raw),
    simulation: computeSimulation(aprTotal),
  };
}
