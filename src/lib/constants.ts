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

// Protocol app URLs — curated map for top protocols, DeFi Llama fallback for rest
export const PROTOCOL_APP_URLS: Record<string, string> = {
  "morpho-v1": "https://app.morpho.org",
  "aave-v3": "https://app.aave.com",
  "compound-v3": "https://app.compound.finance",
  "uniswap-v2": "https://app.uniswap.org",
  "uniswap-v3": "https://app.uniswap.org",
  "uniswap-v4": "https://app.uniswap.org",
  "curve-dex": "https://curve.fi",
  "aerodrome-slipstream": "https://aerodrome.finance",
  "aerodrome-v1": "https://aerodrome.finance",
  "sushiswap": "https://www.sushi.com",
  "sushiswap-v3": "https://www.sushi.com",
  "beefy": "https://app.beefy.com",
  "yearn-finance": "https://yearn.fi",
  "convex-finance": "https://www.convexfinance.com",
  "stake-dao": "https://www.stakedao.org",
  "pendle": "https://app.pendle.finance",
  "balancer-v2": "https://app.balancer.fi",
  "balancer-v3": "https://app.balancer.fi",
  "fluid-lending": "https://fluid.instadapp.io",
  "fluid-dex": "https://fluid.instadapp.io",
  "euler-v2": "https://app.euler.finance",
  "gmx-v2-perps": "https://app.gmx.io",
  "pancakeswap-amm-v3": "https://pancakeswap.finance",
  "camelot-v2": "https://app.camelot.exchange",
  "camelot-v3": "https://app.camelot.exchange",
  "lido": "https://stake.lido.fi",
  "rocket-pool": "https://stake.rocketpool.net",
  "spark": "https://app.spark.fi",
  "sky-lending": "https://app.sky.money",
  "spark-savings": "https://app.spark.fi",
  "maple": "https://app.maple.finance",
  "ethena-usde": "https://app.ethena.fi",
  "ondo-yield-assets": "https://ondo.finance",
  "dolomite": "https://app.dolomite.io",
  "harvest-finance": "https://app.harvest.finance",
  "frankencoin": "https://app.frankencoin.com",
};

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
