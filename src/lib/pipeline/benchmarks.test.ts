import { describe, it, expect } from "vitest";
import { computeBenchmarks } from "./benchmarks";
import type { PoolListItem } from "@/lib/types";

function makePool(overrides: Partial<PoolListItem> & { id: string }): PoolListItem {
  return {
    id: overrides.id,
    chain: "ethereum",
    protocol: "aave-v3",
    protocol_url: "https://app.aave.com",
    pool_type: "lending",
    yield_source: overrides.yield_source ?? "lending_interest",
    symbol: overrides.symbol ?? "USDC",
    tvl_usd: overrides.tvl_usd ?? 1_000_000,
    yield: {
      apr_total: overrides.yield?.apr_total ?? 5,
      apr_base: overrides.yield?.apr_base ?? 5,
      apr_reward: overrides.yield?.apr_reward ?? 0,
      apr_base_7d: null,
      il_7d: null,
      is_estimated: true,
    },
    exposure: {
      type: "single",
      category: "stablecoin",
      asset_class: overrides.exposure?.asset_class ?? "usd_stable",
      has_yield_bearing_token: false,
      underlying_tokens: [],
    },
    risk: {
      contract_age_days: null,
      is_audited: null,
      is_verified: null,
      top_lp_concentration: null,
      underlying_depeg_risk: null,
    },
    incentives_summary: {
      count: 0,
      nearest_expiry_days: null,
      total_daily_rewards_usd: null,
      sources: [],
    },
    simulation: {
      daily_earnings_per_1k: 0.14,
      monthly_earnings_per_1k: 4.11,
      yearly_earnings_per_1k: 50,
    },
  };
}

describe("computeBenchmarks", () => {
  it("returns empty benchmarks when no pools provided", () => {
    const result = computeBenchmarks([]);

    expect(Object.keys(result)).toEqual([
      "usd_stable", "eur_stable", "eth_class", "btc_class", "rwa",
    ]);
    for (const b of Object.values(result)) {
      expect(b.benchmark_apr).toBe(0);
      expect(b.pool_count).toBe(0);
      expect(b.total_tvl_usd).toBe(0);
      expect(b.top_pools).toEqual([]);
    }
  });

  it("computes TVL-weighted average APR for usd_stable", () => {
    const pools = [
      makePool({ id: "a", tvl_usd: 10_000_000, yield: { apr_total: 4, apr_base: 4, apr_reward: 0, apr_base_7d: null, il_7d: null, is_estimated: true } }),
      makePool({ id: "b", tvl_usd: 5_000_000, yield: { apr_total: 10, apr_base: 10, apr_reward: 0, apr_base_7d: null, il_7d: null, is_estimated: true } }),
    ];

    const result = computeBenchmarks(pools);
    // Weighted: (4*10M + 10*5M) / (10M + 5M) = 90M / 15M = 6.0
    expect(result.usd_stable.benchmark_apr).toBe(6);
    expect(result.usd_stable.pool_count).toBe(2);
    expect(result.usd_stable.total_tvl_usd).toBe(15_000_000);
  });

  it("excludes pools with TVL below $1M", () => {
    const pools = [
      makePool({ id: "big", tvl_usd: 5_000_000, yield: { apr_total: 3, apr_base: 3, apr_reward: 0, apr_base_7d: null, il_7d: null, is_estimated: true } }),
      makePool({ id: "small", tvl_usd: 500_000, yield: { apr_total: 50, apr_base: 50, apr_reward: 0, apr_base_7d: null, il_7d: null, is_estimated: true } }),
    ];

    const result = computeBenchmarks(pools);
    expect(result.usd_stable.pool_count).toBe(1);
    expect(result.usd_stable.benchmark_apr).toBe(3);
  });

  it("only uses top 10 pools by TVL for the weighted average", () => {
    // Create 12 pools — only top 10 by TVL should be used for the average
    const pools = Array.from({ length: 12 }, (_, i) =>
      makePool({
        id: `pool-${i}`,
        tvl_usd: (12 - i) * 1_000_000, // 12M, 11M, ..., 1M
        yield: { apr_total: 5, apr_base: 5, apr_reward: 0, apr_base_7d: null, il_7d: null, is_estimated: true },
      }),
    );

    const result = computeBenchmarks(pools);
    expect(result.usd_stable.pool_count).toBe(12); // all qualify
    expect(result.usd_stable.qualifying_pool_count).toBe(10); // top 10 used
    expect(result.usd_stable.benchmark_apr).toBe(5); // all same APR
  });

  it("returns top 3 pools by TVL", () => {
    const pools = [
      makePool({ id: "c", tvl_usd: 1_000_000, symbol: "DAI" }),
      makePool({ id: "a", tvl_usd: 10_000_000, symbol: "USDC" }),
      makePool({ id: "d", tvl_usd: 2_000_000, symbol: "USDT" }),
      makePool({ id: "b", tvl_usd: 5_000_000, symbol: "USDS" }),
    ];

    const result = computeBenchmarks(pools);
    expect(result.usd_stable.top_pools).toHaveLength(3);
    expect(result.usd_stable.top_pools[0].id).toBe("a");
    expect(result.usd_stable.top_pools[1].id).toBe("b");
    expect(result.usd_stable.top_pools[2].id).toBe("d");
  });

  it("computes APR range across all qualifying pools", () => {
    const pools = [
      makePool({ id: "low", tvl_usd: 2_000_000, yield: { apr_total: 1.5, apr_base: 1.5, apr_reward: 0, apr_base_7d: null, il_7d: null, is_estimated: true } }),
      makePool({ id: "mid", tvl_usd: 5_000_000, yield: { apr_total: 5, apr_base: 5, apr_reward: 0, apr_base_7d: null, il_7d: null, is_estimated: true } }),
      makePool({ id: "high", tvl_usd: 3_000_000, yield: { apr_total: 12.3, apr_base: 12.3, apr_reward: 0, apr_base_7d: null, il_7d: null, is_estimated: true } }),
    ];

    const result = computeBenchmarks(pools);
    expect(result.usd_stable.apr_range.min).toBe(1.5);
    expect(result.usd_stable.apr_range.max).toBe(12.3);
  });

  it("filters RWA by yield_source instead of asset_class", () => {
    const pools = [
      // RWA pool: yield_source is rwa_yield, but asset_class is usd_stable
      makePool({
        id: "rwa-1",
        tvl_usd: 5_000_000,
        yield_source: "rwa_yield",
        exposure: { type: "single", category: "stablecoin", asset_class: "usd_stable", has_yield_bearing_token: false, underlying_tokens: [] },
        yield: { apr_total: 4, apr_base: 4, apr_reward: 0, apr_base_7d: null, il_7d: null, is_estimated: true },
      }),
      // Regular USD pool
      makePool({
        id: "usd-1",
        tvl_usd: 3_000_000,
        yield_source: "lending_interest",
        yield: { apr_total: 6, apr_base: 6, apr_reward: 0, apr_base_7d: null, il_7d: null, is_estimated: true },
      }),
    ];

    const result = computeBenchmarks(pools);
    // RWA benchmark should include rwa-1
    expect(result.rwa.pool_count).toBe(1);
    expect(result.rwa.benchmark_apr).toBe(4);
    // USD benchmark should include both (rwa pool has usd_stable asset_class)
    expect(result.usd_stable.pool_count).toBe(2);
  });

  it("separates asset classes correctly", () => {
    const pools = [
      makePool({ id: "usd", exposure: { type: "single", category: "stablecoin", asset_class: "usd_stable", has_yield_bearing_token: false, underlying_tokens: [] }, tvl_usd: 2_000_000 }),
      makePool({ id: "eth", exposure: { type: "single", category: "blue_chip", asset_class: "eth_class", has_yield_bearing_token: false, underlying_tokens: [] }, tvl_usd: 3_000_000 }),
      makePool({ id: "btc", exposure: { type: "single", category: "blue_chip", asset_class: "btc_class", has_yield_bearing_token: false, underlying_tokens: [] }, tvl_usd: 4_000_000 }),
    ];

    const result = computeBenchmarks(pools);
    expect(result.usd_stable.pool_count).toBe(1);
    expect(result.eth_class.pool_count).toBe(1);
    expect(result.btc_class.pool_count).toBe(1);
    expect(result.eur_stable.pool_count).toBe(0);
  });

  it("rounds benchmark_apr to 2 decimal places", () => {
    const pools = [
      makePool({ id: "a", tvl_usd: 7_000_000, yield: { apr_total: 3.33333, apr_base: 3.33333, apr_reward: 0, apr_base_7d: null, il_7d: null, is_estimated: true } }),
      makePool({ id: "b", tvl_usd: 3_000_000, yield: { apr_total: 6.66666, apr_base: 6.66666, apr_reward: 0, apr_base_7d: null, il_7d: null, is_estimated: true } }),
    ];

    const result = computeBenchmarks(pools);
    // Weighted: (3.33333*7M + 6.66666*3M) / 10M = 4.333328...
    expect(result.usd_stable.benchmark_apr).toBe(4.33);
  });

  it("includes computed_at timestamp", () => {
    const result = computeBenchmarks([]);
    for (const b of Object.values(result)) {
      expect(b.computed_at).toBeTruthy();
      expect(() => new Date(b.computed_at)).not.toThrow();
    }
  });
});
