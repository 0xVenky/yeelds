// Yield unit — all values stored and displayed as APR (Decision 6)
export const YIELD_UNIT = "APR" as const;

// Supported chains
export const SUPPORTED_CHAINS = ["ethereum", "arbitrum", "base"] as const;
export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export const CHAIN_IDS: Record<SupportedChain, number> = {
  ethereum: 1,
  arbitrum: 42161,
  base: 8453,
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

// APR bounds
export const MAX_REASONABLE_APR = 10000; // flag anything above this

// Yield source types — where the yield comes from
export const YIELD_SOURCE_TYPES = [
  "trading_fees", "lending_interest", "staking_rewards",
  "strategy_returns", "rwa_yield",
] as const;

export type YieldSourceType = (typeof YIELD_SOURCE_TYPES)[number];

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
