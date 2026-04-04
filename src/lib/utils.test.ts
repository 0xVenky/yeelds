import { describe, it, expect } from "vitest";
import { formatYieldSource, formatPoolType, formatApr, formatTvl, apyToApr } from "./utils";

describe("formatYieldSource", () => {
  it("maps known yield source slugs to display labels", () => {
    expect(formatYieldSource("trading_fees")).toBe("Trading fees");
    expect(formatYieldSource("lending_interest")).toBe("Lending interest");
    expect(formatYieldSource("staking_rewards")).toBe("Staking rewards");
    expect(formatYieldSource("strategy_returns")).toBe("Strategy returns");
    expect(formatYieldSource("rwa_yield")).toBe("RWA yield");
  });

  it("falls back to 'Base' for unknown yield sources", () => {
    expect(formatYieldSource("unknown_source")).toBe("Base");
    expect(formatYieldSource("")).toBe("Base");
  });
});

describe("formatPoolType", () => {
  it("maps known pool types", () => {
    expect(formatPoolType("amm_lp")).toBe("AMM LP");
    expect(formatPoolType("lending")).toBe("Lending");
    expect(formatPoolType("vault")).toBe("Vault");
    expect(formatPoolType("staking")).toBe("Staking");
  });

  it("returns slug as-is for unknown types", () => {
    expect(formatPoolType("other")).toBe("other");
  });
});

describe("formatApr", () => {
  it("formats numbers to 2 decimal places with %", () => {
    expect(formatApr(5)).toBe("5.00%");
    expect(formatApr(3.14159)).toBe("3.14%");
    expect(formatApr(0)).toBe("0.00%");
  });

  it("returns dash for null", () => {
    expect(formatApr(null)).toBe("—");
  });
});

describe("formatTvl", () => {
  it("formats billions", () => {
    expect(formatTvl(1_500_000_000)).toBe("$1.5B");
  });

  it("formats millions", () => {
    expect(formatTvl(32_400_000)).toBe("$32.4M");
  });

  it("formats thousands", () => {
    expect(formatTvl(315_300)).toBe("$315.3K");
  });

  it("formats small numbers", () => {
    expect(formatTvl(500)).toBe("$500");
  });
});

describe("apyToApr", () => {
  it("returns 0 for 0 APY", () => {
    expect(apyToApr(0)).toBe(0);
  });

  it("converts APY to APR (APR < APY for positive values)", () => {
    const apr = apyToApr(10);
    expect(apr).toBeGreaterThan(0);
    expect(apr).toBeLessThan(10);
  });

  it("is roughly equal for small values", () => {
    // For small APY, APR ≈ APY
    const apr = apyToApr(1);
    expect(apr).toBeCloseTo(1, 1);
  });
});
