import type { LifiVaultRaw } from "@/lib/pipeline/fetchers/lifi-schemas";
import type { PoolListItem, TokenInfo } from "@/lib/types";
import {
  CHAIN_BY_ID,
  LIFI_PROTOCOL_YIELD_SOURCE,
  RWA_PROTOCOLS,
  type SupportedChain,
} from "@/lib/constants";
import { computeSimulation } from "@/lib/utils";
import { lookupToken } from "@/lib/pipeline/tokens";

/**
 * Validate that a protocol URL is safe to render as a CTA link.
 * Only https:// — rejects javascript:, data:, etc.
 */
function safeProtocolUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function derivePoolType(tags: string[]): string {
  if (tags.includes("multi") || tags.includes("il-risk")) return "amm_lp";
  return "vault";
}

function deriveYieldSource(protocolName: string): string {
  if ((RWA_PROTOCOLS as readonly string[]).includes(protocolName)) return "rwa_yield";
  return LIFI_PROTOCOL_YIELD_SOURCE[protocolName] ?? "strategy_returns";
}

function mapExposureType(tags: string[]): string {
  if (tags.includes("multi") || tags.includes("il-risk")) return "multi";
  return "single";
}

function classifyExposureCategory(
  tags: string[],
  tokens: TokenInfo[],
): string | null {
  if (tags.includes("stablecoin")) return "stablecoin";
  if (tokens.length > 0 && tokens.every(t => t.is_stable)) return "stablecoin";
  if (
    tokens.length > 0 &&
    tokens.every(t => t.asset_class === "eth_class" || t.asset_class === "btc_class")
  ) {
    return "blue_chip";
  }
  if (tokens.length > 0 && tokens.every(t => t.asset_class !== null)) return "mixed";
  if (tokens.length > 0) return "volatile";
  return null;
}

/**
 * Derive asset_class from resolved underlying tokens (tokens.json driven).
 * LI.FI does not tag ETH/BTC/RWA classes, so tokens.json remains the source of truth.
 */
function deriveAssetClass(tokens: TokenInfo[], poolType: string): string | null {
  if (tokens.length === 0) return null;
  const classes = tokens.map(t => t.asset_class).filter((c): c is string => c !== null);
  if (classes.length === 0) return null;
  if (classes.length !== tokens.length) return null;

  if (poolType === "amm_lp" && tokens.length === 1) return null;

  if (new Set(classes).size === 1) return classes[0];
  return "mixed";
}

function hasYieldBearingToken(tokens: TokenInfo[]): boolean {
  return tokens.some(t => t.is_yield_bearing);
}

/**
 * Resolve an LI.FI underlying token into Yeelds' richer TokenInfo shape.
 * LI.FI provides {address, symbol, decimals} inline — we enrich with
 * classification fields (is_stable, asset_class, is_yield_bearing, base_token)
 * from tokens.json.
 */
function resolveToken(
  raw: { address: string; symbol: string; decimals: number },
  chain: SupportedChain,
): TokenInfo {
  const seed = lookupToken(raw.address, chain);
  return {
    address: raw.address,
    symbol: seed?.symbol ?? raw.symbol,
    chain,
    is_stable: seed?.is_stablecoin ?? false,
    asset_class: seed?.asset_class ?? null,
    is_yield_bearing: seed?.is_yield_bearing ?? false,
    base_token: seed?.base_token ?? null,
  };
}

/**
 * Normalize a single LI.FI vault into PoolListItem shape.
 *
 * Field names say apr_* but values are APY per Decision 21 (YIELD_UNIT="APY").
 */
export function normalizeLifiVault(raw: LifiVaultRaw): PoolListItem | null {
  const chainInfo = CHAIN_BY_ID[raw.chainId];
  if (!chainInfo) {
    // Chain not in our supported set — the fetcher should have filtered, but
    // belt-and-suspenders here protects the normalizer if upstream changes.
    return null;
  }
  const chain = chainInfo.name;

  const tvl = parseFloat(raw.analytics.tvl.usd);
  if (!Number.isFinite(tvl) || tvl < 0) return null;

  const apyTotal = raw.analytics.apy.total;
  const apyBase = raw.analytics.apy.base;
  const apyReward = raw.analytics.apy.reward;
  // LI.FI `apy7d` is the 7-day smoothed **total** APY (base + reward over the
  // window), NOT a base-only average. Verified 2026-04-17 against live data.
  // Decision 23 (supersedes 17) uses it directly as the preferred total.
  const apy7d = raw.analytics.apy7d;

  const poolType = derivePoolType(raw.tags);
  const underlyingTokens = raw.underlyingTokens.map(t => resolveToken(t, chain));
  const yieldSource = deriveYieldSource(raw.protocol.name);

  return {
    id: raw.slug,
    chain,
    protocol: raw.protocol.name,
    protocol_url: safeProtocolUrl(raw.protocol.url),
    pool_type: poolType,
    yield_source: yieldSource,
    symbol: raw.name,
    tvl_usd: tvl,
    yield: {
      apr_total: apy7d ?? apyTotal,
      apr_base: apyBase,
      apr_reward: apyReward,
      apr_total_7d: apy7d,
      il_7d: null,
      is_estimated: apy7d === null,
    },
    exposure: {
      type: mapExposureType(raw.tags),
      category: classifyExposureCategory(raw.tags, underlyingTokens),
      asset_class: deriveAssetClass(underlyingTokens, poolType),
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
    incentives_summary: {
      count: apyReward !== null && apyReward > 0 ? 1 : 0,
      nearest_expiry_days: null,
      total_daily_rewards_usd: null,
      sources: apyReward !== null && apyReward > 0 ? ["lifi"] : [],
    },
    simulation: computeSimulation(apyTotal),
    vault_address: raw.address,
    vault_chain_id: raw.chainId,
    is_transactional: raw.isTransactional,
    is_redeemable: raw.isRedeemable,
  };
}

export function normalizeLifiVaults(raws: LifiVaultRaw[]): PoolListItem[] {
  const out: PoolListItem[] = [];
  let dropped = 0;
  for (const raw of raws) {
    const p = normalizeLifiVault(raw);
    if (p) out.push(p);
    else dropped++;
  }
  if (dropped > 0) console.warn(`[lifi-normalize] Dropped ${dropped} vaults (chain/TVL invalid)`);
  return out;
}
