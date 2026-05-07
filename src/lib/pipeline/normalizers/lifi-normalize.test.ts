import { describe, it, expect } from "vitest";
import { normalizeLifiVault } from "./lifi-normalize";
import type { LifiVaultRaw } from "@/lib/pipeline/fetchers/lifi-schemas";

// Real Ethereum mainnet addresses present in docs/seed/tokens.json — keeps the
// integration honest by exercising resolveToken / lookupToken end-to-end.
const ADDR = {
  USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // known-safe (in seed, is_stable)
  USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7", // known-safe (in seed, is_stable)
  RLUSD: "0x8292bb45bf1ee4d140127049757c2e0ff06317ed", // caution (in seed, is_stable)
  WETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // non-stable (in seed)
  BOLD: "0x6440f144b7e50d6a8439336510312d2f54beb01d", // unrecognized stable (in seed, is_stable=true, not in either set)
};

function makeVault(
  underlyingTokens: { address: string; symbol: string; decimals: number }[],
  overrides: Partial<LifiVaultRaw> = {},
): LifiVaultRaw {
  return {
    address: "0x1111111111111111111111111111111111111111",
    chainId: 1,
    network: "ethereum",
    slug: "test-vault",
    name: "Test Vault",
    protocol: { name: "morpho-v1", url: "https://app.morpho.org" },
    tags: [],
    underlyingTokens,
    analytics: {
      apy: { base: 5, reward: null, total: 5 },
      apy1d: 5,
      apy7d: 5,
      apy30d: 5,
      tvl: { usd: "1000000" },
      updatedAt: "2026-04-30T00:00:00Z",
    },
    depositPacks: [],
    redeemPacks: [],
    isTransactional: true,
    isRedeemable: true,
    lpTokens: [],
    syncedAt: "2026-04-30T00:00:00Z",
    ...overrides,
  };
}

describe("normalizeLifiVault — depeg risk derivation", () => {
  it("flags caution when an underlying is in the caution set (RLUSD)", () => {
    const raw = makeVault([
      { address: ADDR.RLUSD, symbol: "RLUSD", decimals: 18 },
    ]);
    const pool = normalizeLifiVault(raw);
    expect(pool).not.toBeNull();
    expect(pool!.risk.underlying_depeg_risk).toBe("caution");
  });

  it("flags known-safe when all stable underlyings are in the known-safe set (USDC + USDT)", () => {
    const raw = makeVault([
      { address: ADDR.USDC, symbol: "USDC", decimals: 6 },
      { address: ADDR.USDT, symbol: "USDT", decimals: 6 },
    ]);
    const pool = normalizeLifiVault(raw);
    expect(pool).not.toBeNull();
    expect(pool!.risk.underlying_depeg_risk).toBe("known-safe");
  });

  it("caution wins over known-safe when both are present (USDC + RLUSD)", () => {
    const raw = makeVault([
      { address: ADDR.USDC, symbol: "USDC", decimals: 6 },
      { address: ADDR.RLUSD, symbol: "RLUSD", decimals: 18 },
    ]);
    const pool = normalizeLifiVault(raw);
    expect(pool).not.toBeNull();
    expect(pool!.risk.underlying_depeg_risk).toBe("caution");
  });

  it("returns null for a non-stable vault (WETH only)", () => {
    const raw = makeVault([
      { address: ADDR.WETH, symbol: "WETH", decimals: 18 },
    ]);
    const pool = normalizeLifiVault(raw);
    expect(pool).not.toBeNull();
    expect(pool!.risk.underlying_depeg_risk).toBeNull();
  });

  it("returns null for an unrecognized stable (BOLD — is_stable but not in either set)", () => {
    const raw = makeVault([
      { address: ADDR.BOLD, symbol: "BOLD", decimals: 18 },
    ]);
    const pool = normalizeLifiVault(raw);
    expect(pool).not.toBeNull();
    // BOLD is is_stable=true in seed but not in KNOWN_SAFE_STABLES or CAUTION_STABLES;
    // we don't false-flag — null leaves it for higher-tier classification.
    expect(pool!.risk.underlying_depeg_risk).toBeNull();
  });
});
