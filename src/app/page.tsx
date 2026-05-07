export const dynamic = "force-dynamic";

import Link from "next/link";
import { StrategyCard } from "@/components/StrategyCard";
import { ensureCachePopulated, getCachedPools } from "@/lib/pipeline/cache";
import { queryStats } from "@/lib/api/query";
import { formatTvl } from "@/lib/utils";
import type { PoolListItem } from "@/lib/types";

const ETH_SYMBOLS = new Set([
  "ETH", "WETH", "STETH", "WSTETH", "CBETH", "RETH", "METH", "EETH", "WEETH", "SETH2",
]);
const BTC_SYMBOLS = new Set(["WBTC", "TBTC", "CBBTC", "BTC", "SBTC"]);

function isEthPool(p: PoolListItem) {
  return p.exposure.underlying_tokens.some((t) => ETH_SYMBOLS.has(t.symbol.toUpperCase()));
}
function isBtcPool(p: PoolListItem) {
  return p.exposure.underlying_tokens.some((t) => BTC_SYMBOLS.has(t.symbol.toUpperCase()));
}
function isStablePool(p: PoolListItem) {
  return p.exposure.category === "stablecoin";
}

// APY ceiling of 100% hides unsustainable farming/capped rates from the landing hero.
// Live data sample: `morpho-v1 CSYUSDC` at 10000% (MAX_REASONABLE_APY cap) and 2112%
// — real upstream values, but misleading as first-impression numbers. Users can still
// find these on /explore. Stablecoin yields rarely exceed ~50% sustainably.
const MAX_DISPLAY_APY = 100;

function topByApy(pools: PoolListItem[], filter: (p: PoolListItem) => boolean, count = 4) {
  return pools
    .filter(filter)
    .filter((p) => p.tvl_usd >= 50_000)
    .filter((p) => p.yield.apr_total <= MAX_DISPLAY_APY)
    .sort((a, b) => b.yield.apr_total - a.yield.apr_total)
    .slice(0, count);
}

export default async function HomePage() {
  await ensureCachePopulated();
  const allPools = getCachedPools();
  const stats = await queryStats();

  const stables = topByApy(allPools, isStablePool, 4);
  const ethPools = topByApy(allPools, isEthPool, 4);
  const btcPools = topByApy(allPools, isBtcPool, 4);

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 sm:px-10 pt-10 pb-6">
        <h1
          className="text-4xl sm:text-5xl font-extrabold tracking-tight font-[family-name:var(--font-manrope)]"
          style={{ color: "var(--on-surface)" }}
        >
          Yield Discovery
        </h1>
        <p className="mt-2 text-base max-w-xl" style={{ color: "var(--on-surface-variant)" }}>
          Discover {stats.total_pools} yield opportunities across {stats.chains_covered} chains.
          Decomposed yields, risk signals, and exposure-aware filtering.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <HeroStat label="Total TVL" value={formatTvl(stats.total_tvl_usd)} />
          <HeroStat label="Vaults" value={String(stats.total_pools)} />
          <HeroStat label="Chains" value={String(stats.chains_covered)} />
          <HeroStat label="Protocols" value={String(stats.protocols_covered)} />
        </div>
      </div>

      {stables.length > 0 && (
        <CategorySection
          title="Stablecoin Strategies"
          subtitle="Earn yield on USDC, USDT, DAI, and more"
          pools={stables}
          href="/stables"
          accentColor="var(--secondary)"
          accentBg="var(--secondary-container)"
          accentText="var(--on-secondary-container)"
        />
      )}

      {ethPools.length > 0 && (
        <CategorySection
          title="ETH Strategies"
          subtitle="Maximize yield on ETH, wstETH, cbETH, and LSTs"
          pools={ethPools}
          href="/eth"
          accentColor="#2563eb"
          accentBg="#dbeafe"
          accentText="#1e40af"
        />
      )}

      {btcPools.length > 0 && (
        <CategorySection
          title="BTC Strategies"
          subtitle="Earn on WBTC, tBTC, and Bitcoin derivatives"
          pools={btcPools}
          href="/btc"
          accentColor="#ea580c"
          accentBg="#fff7ed"
          accentText="#9a3412"
        />
      )}

      <div className="px-6 sm:px-10 py-10 text-center">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-white transition-all shadow-lg shadow-purple-500/20 hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #630ed4, #7c3aed)" }}
        >
          Browse all {stats.total_pools} vaults &rarr;
        </Link>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl p-5 transition-all hover:brightness-[0.98]"
      style={{ backgroundColor: "var(--surface-container-low)" }}
    >
      <p
        className="text-[10px] uppercase tracking-wider font-semibold"
        style={{ color: "var(--on-surface-variant)" }}
      >
        {label}
      </p>
      <p
        className="text-2xl sm:text-3xl font-black font-[family-name:var(--font-manrope)] mt-1"
        style={{ color: "var(--on-surface)" }}
      >
        {value}
      </p>
    </div>
  );
}

function CategorySection({
  title,
  subtitle,
  pools,
  href,
  accentColor,
  accentBg,
  accentText,
}: {
  title: string;
  subtitle: string;
  pools: PoolListItem[];
  href: string;
  accentColor: string;
  accentBg: string;
  accentText: string;
}) {
  return (
    <div className="px-6 sm:px-10 py-6">
      <div className="flex items-end justify-between mb-6">
        <div className="flex items-center gap-3">
          <span
            className="w-1.5 h-7 rounded-full"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}
          />
          <div>
            <h2
              className="text-xl font-bold font-[family-name:var(--font-manrope)] tracking-tight"
              style={{ color: "var(--on-surface)" }}
            >
              {title}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
              {subtitle}
            </p>
          </div>
        </div>
        <Link
          href={href}
          className="text-sm font-semibold transition-colors hover:opacity-80 whitespace-nowrap"
          style={{ color: "var(--primary)" }}
        >
          View all &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {pools.map((pool) => (
          <StrategyCard
            key={pool.id}
            pool={pool}
            accentColor={accentColor}
            accentBg={accentBg}
            accentText={accentText}
          />
        ))}
      </div>
    </div>
  );
}
