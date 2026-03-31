import type { DefiLlamaPool } from "@/lib/pipeline/fetchers/defillama";
import type { PoolListItem, TokenInfo } from "@/lib/types";
import { DEFILLAMA_CHAIN_MAP } from "@/lib/constants";
import { apyToApr, computeSimulation } from "@/lib/utils";

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

function mapExposureType(exposure: string | null): string {
  if (exposure === "single") return "single";
  if (exposure === "multi") return "multi";
  return "pair";
}

function classifyExposure(isStablecoin: boolean): string | null {
  if (isStablecoin) return "stablecoin";
  return null; // full classification comes with tokens table
}

function resolveTokens(addresses: string[] | null, chain: string): TokenInfo[] {
  if (!addresses) return [];
  return addresses.map(addr => ({
    address: addr,
    symbol: "UNKNOWN", // no token metadata yet
    chain,
    is_stable: false,
  }));
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

  return {
    id: raw.pool,
    chain,
    protocol: raw.project,
    protocol_url: null,
    pool_type: inferPoolType(raw.project, raw.poolMeta),
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
      category: classifyExposure(raw.stablecoin),
      underlying_tokens: resolveTokens(raw.underlyingTokens, chain),
    },
    risk: {
      contract_age_days: null,
      is_audited: null,
      top_lp_concentration: null,
      underlying_depeg_risk: null,
    },
    incentives_summary: deriveIncentiveSummary(raw),
    simulation: computeSimulation(aprTotal),
  };
}
