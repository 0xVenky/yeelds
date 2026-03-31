// Run with: npx tsx src/lib/pipeline/test-fetch.ts
// Fetches, normalizes, prints stats + 3 sample pools

import { fetchDefiLlamaPools } from "./fetchers/defillama";
import { normalizeDefiLlamaPool } from "./normalizers/normalize";
import { apyToApr } from "../utils";

async function main() {
  console.log("=== DeFi Llama Fetch Test ===\n");

  const rawPools = await fetchDefiLlamaPools();
  console.log(`\nValidated pools: ${rawPools.length}`);

  // Normalize all
  const normalized = [];
  let normalizeErrors = 0;
  for (const raw of rawPools) {
    try {
      normalized.push(normalizeDefiLlamaPool(raw));
    } catch {
      normalizeErrors++;
    }
  }
  console.log(`Normalized: ${normalized.length}, errors: ${normalizeErrors}`);

  // Stats by chain
  const chainCounts: Record<string, number> = {};
  normalized.forEach(p => {
    chainCounts[p.chain] = (chainCounts[p.chain] ?? 0) + 1;
  });
  console.log("\nPools by chain:", chainCounts);

  // Pool type breakdown
  const typeCounts: Record<string, number> = {};
  normalized.forEach(p => {
    typeCounts[p.pool_type] = (typeCounts[p.pool_type] ?? 0) + 1;
  });
  console.log("Pools by type:", typeCounts);

  // Sample one pool per chain
  console.log("\n=== Sample Pools ===\n");
  const seen = new Set<string>();
  for (const pool of normalized) {
    if (!seen.has(pool.chain)) {
      seen.add(pool.chain);
      console.log(`[${pool.chain}] ${pool.protocol} — ${pool.symbol}`);
      console.log(`  TVL: $${pool.tvl_usd.toLocaleString()}`);
      console.log(`  APR total: ${pool.yield.apr_total.toFixed(2)}%`);
      console.log(`  APR base: ${pool.yield.apr_base?.toFixed(2) ?? "null"}%`);
      console.log(`  APR reward: ${pool.yield.apr_reward?.toFixed(2) ?? "null"}%`);
      console.log(`  Type: ${pool.pool_type}`);
      console.log(`  Stablecoin: ${pool.exposure.category === "stablecoin"}`);
      console.log(`  Sim $1K/day: $${pool.simulation.daily_earnings_per_1k}`);
      console.log();
    }
    if (seen.size === 3) break;
  }

  // APY→APR spot check
  console.log("=== APY→APR Spot Check ===");
  console.log(`apyToApr(10) = ${apyToApr(10).toFixed(4)} (expect ~9.5317)`);
  console.log(`apyToApr(0)  = ${apyToApr(0).toFixed(4)} (expect 0.0000)`);
  console.log(`apyToApr(100) = ${apyToApr(100).toFixed(4)} (expect ~69.3147)`);
}

main().catch(console.error);
