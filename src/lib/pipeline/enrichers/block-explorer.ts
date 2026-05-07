/**
 * Block explorer enrichment — contract age and source verification.
 * Uses Blockscout public API (no API keys required).
 *
 * Scores the actual vault contract via the LI.FI-provided `vault_address`
 * (PoolListItem.vault_address). This reflects the deployed strategy/vault
 * rather than its underlying token, so a 30-day-old vault built on USDC
 * scores as 30 days, not ~5 years.
 */

import type { PoolListItem } from "@/lib/types";
import type { SupportedChain } from "@/lib/constants";
import { createRateLimiter } from "./rate-limiter";
import { getCachedRisk, setCachedRisk, type RiskData } from "./risk-cache";

// --- Blockscout config ---

const BLOCKSCOUT_URLS: Record<SupportedChain, string> = {
  ethereum: "https://eth.blockscout.com/api/v2",
  arbitrum: "https://arbitrum.blockscout.com/api/v2",
  base: "https://base.blockscout.com/api/v2",
};

// One rate limiter per chain — 5 req/s on Blockscout public tier (no key needed)
const rateLimiters: Record<SupportedChain, ReturnType<typeof createRateLimiter>> = {
  ethereum: createRateLimiter(5),
  arbitrum: createRateLimiter(5),
  base: createRateLimiter(5),
};

// --- API calls ---

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

type AddressResponse = {
  is_contract?: boolean;
  is_verified?: boolean;
  creation_transaction_hash?: string | null;
};

type TransactionResponse = {
  timestamp?: string;
};

/**
 * Fetch address info from Blockscout. Returns is_verified and creation tx hash.
 * Single call — replaces Etherscan's getsourcecode + getcontractcreation.
 */
async function getAddressInfo(
  address: string,
  chain: SupportedChain
): Promise<{ isVerified: boolean | null; creationTxHash: string | null }> {
  const baseUrl = BLOCKSCOUT_URLS[chain];
  await rateLimiters[chain]();

  const data = (await fetchJson(`${baseUrl}/addresses/${address}`)) as AddressResponse;

  return {
    isVerified: data.is_verified ?? null,
    // Genesis/pre-deployed contracts (common on L2s) have null creation_transaction_hash
    creationTxHash: data.creation_transaction_hash ?? null,
  };
}

/**
 * Get contract creation timestamp from the creation transaction.
 * Blockscout returns ISO 8601 timestamps directly — no hex parsing needed.
 */
async function getCreationTimestamp(
  txHash: string,
  chain: SupportedChain
): Promise<Date | null> {
  const baseUrl = BLOCKSCOUT_URLS[chain];
  await rateLimiters[chain]();

  const data = (await fetchJson(`${baseUrl}/transactions/${txHash}`)) as TransactionResponse;

  if (!data.timestamp) return null;
  const date = new Date(data.timestamp);
  return isNaN(date.getTime()) ? null : date;
}

// --- Enrichment orchestrator ---

/**
 * Fetch risk data for a single address on a chain.
 * Returns cached data if fresh, otherwise fetches from Blockscout.
 * 2 API calls per address (address info + creation tx).
 */
async function fetchRiskForAddress(
  address: string,
  chain: SupportedChain
): Promise<RiskData> {
  const cached = getCachedRisk(address, chain);
  if (cached) return cached;

  let contractAgeDays: number | null = null;
  let isVerified: boolean | null = null;

  try {
    const info = await getAddressInfo(address, chain);
    isVerified = info.isVerified;

    if (info.creationTxHash) {
      try {
        const creationDate = await getCreationTimestamp(info.creationTxHash, chain);
        if (creationDate) {
          contractAgeDays = Math.floor(
            (Date.now() - creationDate.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      } catch (e) {
        console.warn(`[risk] Creation tx fetch failed for ${address} on ${chain}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    console.warn(`[risk] Address info fetch failed for ${address} on ${chain}: ${(e as Error).message}`);
  }

  const riskData: RiskData = {
    contract_age_days: contractAgeDays,
    is_verified: isVerified,
    fetched_at: new Date(),
  };

  setCachedRisk(address, chain, riskData);
  return riskData;
}

/**
 * Enrich pools with risk signals from Blockscout.
 *
 * Mutates pool.risk in place for the provided pools.
 * Processes top pools by TVL (caller should pre-sort/slice).
 * Failures on individual pools are logged and skipped.
 */
export async function enrichPoolsWithRisk(pools: PoolListItem[]): Promise<void> {
  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  for (const pool of pools) {
    // Score the vault contract itself (LI.FI-provided), not an underlying token proxy.
    const vaultAddress = pool.vault_address;
    if (!vaultAddress || vaultAddress === "0x0000000000000000000000000000000000000000") {
      skipped++;
      continue;
    }

    const chain = pool.chain as SupportedChain;
    if (!BLOCKSCOUT_URLS[chain]) {
      skipped++;
      continue;
    }

    try {
      const riskData = await fetchRiskForAddress(vaultAddress, chain);
      pool.risk.contract_age_days = riskData.contract_age_days;
      pool.risk.is_verified = riskData.is_verified;
      enriched++;
    } catch (e) {
      console.warn(`[risk] Enrichment failed for pool ${pool.id}: ${(e as Error).message}`);
      errors++;
    }
  }

  console.log(
    `[risk] Enrichment complete: ${enriched} enriched, ${skipped} skipped (no vault address), ${errors} errors`
  );
}
