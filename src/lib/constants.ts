// Yield unit — LI.FI returns APY natively (Decision 21, supersedes Decision 6)
export const YIELD_UNIT = "APY" as const;

// Supported chains
export const SUPPORTED_CHAINS = ["ethereum", "arbitrum", "base"] as const;
export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export const CHAIN_IDS: Record<SupportedChain, number> = {
  ethereum: 1,
  arbitrum: 42161,
  base: 8453,
};

// Inverse lookup: chainId (number, as LI.FI returns) → SupportedChain name + network string
export const CHAIN_BY_ID: Record<number, { chainId: number; name: SupportedChain; network: string }> = {
  1:     { chainId: 1,     name: "ethereum", network: "ethereum" },
  42161: { chainId: 42161, name: "arbitrum", network: "arbitrum" },
  8453:  { chainId: 8453,  name: "base",     network: "base" },
};

// DeFi Llama chain name mapping (they use title case)
export const DEFILLAMA_CHAIN_MAP: Record<string, SupportedChain> = {
  Ethereum: "ethereum",
  Arbitrum: "arbitrum",
  Base: "base",
};

// Dedup: skip these DeFi Llama project names as standalone pools (Decision 4)
export const DEFILLAMA_SKIP_PROJECTS = ["merkl", "metrom"] as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

// APY bounds
export const MAX_REASONABLE_APY = 10000;

// LI.FI Earn API (Decision 20 — primary data source)
export const LIFI_EARN_BASE_URL = "https://earn.li.fi";

// Yield source types — where the yield comes from
export const YIELD_SOURCE_TYPES = [
  "trading_fees", "lending_interest", "staking_rewards",
  "strategy_returns", "rwa_yield",
] as const;

export type YieldSourceType = (typeof YIELD_SOURCE_TYPES)[number];

// LI.FI protocol.name → yield_source mapping (Decision 20 + gap analysis §Q4).
// LI.FI's `provider` is always "DEFILLAMA_PRO", so we classify from protocol.name.
// Unknown protocols default to strategy_returns. RWA_PROTOCOLS (below) overrides to rwa_yield.
export const LIFI_PROTOCOL_YIELD_SOURCE: Record<string, "lending_interest" | "staking_rewards" | "strategy_returns" | "trading_fees" | "rwa_yield"> = {
  "aave-v3":         "lending_interest",
  "morpho-v1":       "lending_interest",
  "euler-v2":        "lending_interest",
  "spark-savings":   "lending_interest",
  "maple":           "lending_interest",
  "pendle":          "strategy_returns",
  "ethena-usde":     "strategy_returns",
  "ether.fi-stake":  "staking_rewards",
  "ether.fi-liquid": "staking_rewards",
  "upshift":         "strategy_returns",
  "yo-protocol":     "strategy_returns",
};

// Curated protocols for /projects page. Each entry aggregates LI.FI pools
// whose `vault.protocol.name` matches any value in `lifi_protocol_names`.
//
// Remapped 2026-04-17 from pre-LI.FI DeFi Llama slugs. The 8 original entries
// not present in LI.FI Earn (Uniswap, Curve, Beefy, Aerodrome, Stake DAO,
// Convex, Fluid, Compound) were dropped because LI.FI Earn is curated and
// excludes AMM LPs and those lending protocols.
export type CuratedProtocol = {
  id: string;
  name: string;
  lifi_protocol_names: string[];  // LI.FI vault.protocol.name values to aggregate
  type: string;                   // primary category
  color: string;                  // Tailwind bg class for avatar
};

export const CURATED_PROTOCOLS: CuratedProtocol[] = [
  { id: "morpho", name: "Morpho", lifi_protocol_names: ["morpho-v1"], type: "vault",   color: "bg-blue-500" },
  { id: "pendle", name: "Pendle", lifi_protocol_names: ["pendle"],    type: "dex",     color: "bg-violet-500" },
  { id: "aave",   name: "Aave",   lifi_protocol_names: ["aave-v3"],   type: "lending", color: "bg-purple-500" },
];

// Protocols whose yield derives from real-world assets (overrides pool-type inference)
// Slugs verified against DeFi Llama pool data 2026-04-03
export const RWA_PROTOCOLS = [
  "sky-lending",          // sDAI/sUSDS — US Treasuries
  "spark-savings",        // sDAI — US Treasuries (MakerDAO/Sky)
  "ondo-yield-assets",    // USDY, OUSG — US Treasuries
  "blackrock-buidl",      // BUIDL — tokenized money market fund
  "superstate-ustb",      // USTB — tokenized T-bills
  "superstate-uscc",      // USCC — tokenized short-term bonds
  "maple",                // Institutional lending to real-world borrowers
  "matrixdock-stbt",      // STBT — T-bill backed
  "circle-usyc",          // USYC (Hashnote) — US Yield Coin
  "theo-network-thbill",  // THBILL — T-bill token
  "usual-usd0",           // USD0 — backed by US T-bills
] as const;
