// As of Decision 20 (2026-04-17), DeFi Llama is an enricher only.
// Primary pool source is LI.FI Earn (see lifi.ts).
// This file fetches only for reward-token enrichment.

import { z } from "zod";
import { DEFILLAMA_CHAIN_MAP, DEFILLAMA_SKIP_PROJECTS, MAX_REASONABLE_APY } from "@/lib/constants";

const DefiLlamaPoolSchema = z.object({
  pool: z.string(),
  chain: z.string(),
  project: z.string(),
  symbol: z.string(),
  tvlUsd: z.number().nonnegative(),
  apy: z.number().nullable(),
  apyBase: z.number().nullable(),
  apyReward: z.number().nullable(),
  apyBase7d: z.number().nullable(),
  apyMean30d: z.number().nullable(),
  il7d: z.number().nullable(),
  exposure: z.string().nullable(),
  stablecoin: z.boolean(),
  ilRisk: z.string().nullable(),
  rewardTokens: z.array(z.string()).nullable(),
  underlyingTokens: z.array(z.string()).nullable(),
  poolMeta: z.string().nullable(),
  volumeUsd1d: z.number().nullable(),
  volumeUsd7d: z.number().nullable(),
});

export type DefiLlamaPool = z.infer<typeof DefiLlamaPoolSchema>;

export async function fetchDefiLlamaPools(): Promise<DefiLlamaPool[]> {
  const res = await fetch("https://yields.llama.fi/pools");
  if (!res.ok) {
    throw new Error(`DeFi Llama API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (!json.data || !Array.isArray(json.data)) {
    throw new Error("DeFi Llama response missing data array");
  }

  const rawPools: unknown[] = json.data;
  let totalRaw = rawPools.length;

  // Chain filter: keep only supported chains
  const chainFiltered = rawPools.filter((p: unknown) => {
    const pool = p as Record<string, unknown>;
    return typeof pool.chain === "string" && pool.chain in DEFILLAMA_CHAIN_MAP;
  });
  console.log(`DeFi Llama: ${totalRaw} total → ${chainFiltered.length} after chain filter`);

  // Dedup filter: skip merkl/metrom standalone entries
  const dedupFiltered = chainFiltered.filter((p: unknown) => {
    const pool = p as Record<string, unknown>;
    return !DEFILLAMA_SKIP_PROJECTS.includes(pool.project as typeof DEFILLAMA_SKIP_PROJECTS[number]);
  });
  console.log(`DeFi Llama: ${chainFiltered.length} → ${dedupFiltered.length} after dedup filter`);

  // Validate each pool with Zod
  const validated: DefiLlamaPool[] = [];
  let validationErrors = 0;

  for (const raw of dedupFiltered) {
    const result = DefiLlamaPoolSchema.safeParse(raw);
    if (result.success) {
      const pool = result.data;
      // Bounds check: cap suspicious APY to prevent misleading display
      if (pool.apy !== null && pool.apy > MAX_REASONABLE_APY) {
        console.warn(`DeFi Llama: capping APY ${pool.apy}% → ${MAX_REASONABLE_APY}% on ${pool.pool} (${pool.project}/${pool.symbol})`);
        validated.push({ ...pool, apy: MAX_REASONABLE_APY });
      } else {
        validated.push(pool);
      }
    } else {
      validationErrors++;
    }
  }

  console.log(`DeFi Llama: ${validated.length} validated, ${validationErrors} validation errors`);
  return validated;
}
