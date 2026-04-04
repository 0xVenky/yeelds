import Link from "next/link";
import { queryBenchmarks, queryStats } from "@/lib/api/query";
import { formatTvl, formatApr, formatProtocolName, computeSimulation } from "@/lib/utils";
import type { AssetClassBenchmark } from "@/lib/types";

const ASSET_CLASSES = [
  { slug: "usd_stable", name: "USD Stablecoins", href: "/stables/usd", description: "USDC, USDT, DAI, USDS and more" },
  { slug: "eth_class", name: "ETH & Liquid Staking", href: "/eth", description: "ETH, wstETH, rETH, cbETH" },
  { slug: "btc_class", name: "Bitcoin", href: "/btc", description: "WBTC, tBTC, cbBTC" },
  { slug: "eur_stable", name: "EUR Stablecoins", href: "/stables/eur", description: "EURS, EURe, agEUR" },
  { slug: "rwa", name: "Real World Assets", href: "/rwa", description: "T-bills, institutional credit" },
];

const CHAIN_COLORS: Record<string, string> = {
  ethereum: "bg-blue-500",
  arbitrum: "bg-sky-400",
  base: "bg-blue-600",
};

function AprRangeBar({ min, max, benchmark }: { min: number; max: number; benchmark: number }) {
  if (max <= min) return null;
  const benchmarkPos = ((benchmark - min) / (max - min)) * 100;
  return (
    <div className="mt-2">
      <div className="relative h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-600/50"
          style={{ width: `${benchmarkPos}%` }}
        />
        <div
          className="absolute inset-y-0 rounded-full bg-emerald-500/20"
          style={{ left: `${benchmarkPos}%`, right: "0" }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-zinc-500">
        <span>{formatApr(min)}</span>
        <span>{formatApr(max)}</span>
      </div>
    </div>
  );
}

function AssetClassCard({ benchmark, meta }: { benchmark: AssetClassBenchmark; meta: (typeof ASSET_CLASSES)[0] }) {
  const sim = computeSimulation(benchmark.benchmark_apr);
  return (
    <Link
      href={meta.href}
      className="block border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/30 transition-colors bg-zinc-900"
    >
      {/* Zone 1: Identity */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">{meta.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{meta.description}</p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <div>{benchmark.pool_count} pools</div>
          <div>{formatTvl(benchmark.total_tvl_usd)} TVL</div>
        </div>
      </div>

      {/* Zone 2: Benchmark hero */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-emerald-400 tabular-nums">
          {formatApr(benchmark.benchmark_apr)}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">Yeelds Benchmark</div>
        <AprRangeBar
          min={benchmark.apr_range.min}
          max={benchmark.apr_range.max}
          benchmark={benchmark.benchmark_apr}
        />
      </div>

      {/* Zone 3: Top pools */}
      <div className="space-y-0 mb-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Top opportunities</div>
        {benchmark.top_pools.map((pool) => {
          const daily = computeSimulation(pool.apr_total);
          return (
            <div
              key={pool.id}
              className="flex items-center justify-between py-1.5 border-t border-zinc-800/50 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-zinc-300 font-medium truncate">{formatProtocolName(pool.protocol)}</span>
                <span className="text-zinc-600 truncate">{pool.symbol}</span>
              </div>
              <div className="flex items-center gap-3 text-right shrink-0">
                <span className="text-zinc-500 hidden sm:inline">{formatTvl(pool.tvl_usd)}</span>
                <span className="text-emerald-400 font-medium tabular-nums w-14">{formatApr(pool.apr_total)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zone 4: CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
        <span className="text-[10px] text-zinc-600">
          ${sim.daily_earnings_per_1k}/day on $1K
        </span>
        <span className="text-sm text-emerald-400 font-medium">
          Explore &rarr;
        </span>
      </div>
    </Link>
  );
}

export default async function CardsPrototype() {
  const [{ benchmarks }, stats] = await Promise.all([queryBenchmarks(), queryStats()]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Yield Discovery</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {stats.total_pools} pools &middot; {formatTvl(stats.total_tvl_usd)} TVL &middot; {stats.chains_covered} chains
            </p>
          </div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">&larr; Back to table</Link>
        </div>
      </div>

      {/* Card Grid */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
          {ASSET_CLASSES.map((meta) => {
            const bench = benchmarks[meta.slug];
            if (!bench) return null;
            return <AssetClassCard key={meta.slug} benchmark={bench} meta={meta} />;
          })}
        </div>

        {/* Browse all link */}
        <div className="mt-6 max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            Browse all {stats.total_pools} pools &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
