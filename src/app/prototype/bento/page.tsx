import Link from "next/link";
import { queryBenchmarks, queryStats } from "@/lib/api/query";
import { formatTvl, formatApr, formatProtocolName, computeSimulation } from "@/lib/utils";
import type { AssetClassBenchmark } from "@/lib/types";

const ASSET_CLASSES = [
  { slug: "usd_stable", name: "USD Stablecoins", href: "/stables/usd", short: "USD", hero: true },
  { slug: "eth_class", name: "ETH & LSTs", href: "/eth", short: "ETH", hero: true },
  { slug: "btc_class", name: "Bitcoin", href: "/btc", short: "BTC", hero: false },
  { slug: "eur_stable", name: "EUR Stablecoins", href: "/stables/eur", short: "EUR", hero: false },
  { slug: "rwa", name: "Real World Assets", href: "/rwa", short: "RWA", hero: false },
];

function HeroTile({ benchmark, meta }: { benchmark: AssetClassBenchmark; meta: (typeof ASSET_CLASSES)[0] }) {
  return (
    <Link
      href={meta.href}
      className="block border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors bg-zinc-900 col-span-1"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">{meta.name}</h2>
          <p className="text-xs text-zinc-500 mt-1">
            {benchmark.pool_count} pools &middot; {formatTvl(benchmark.total_tvl_usd)} TVL
          </p>
        </div>
        <span className="text-sm text-emerald-400 font-medium">Explore &rarr;</span>
      </div>

      {/* Big benchmark */}
      <div className="mb-6">
        <div className="text-5xl font-bold text-emerald-400 tabular-nums tracking-tight">
          {formatApr(benchmark.benchmark_apr)}
        </div>
        <div className="text-xs text-zinc-500 mt-1">Benchmark APR</div>
      </div>

      {/* Range indicator */}
      <div className="flex items-center gap-3 mb-6 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
          Low {formatApr(benchmark.apr_range.min)}
        </div>
        <div className="flex-1 h-px bg-zinc-800" />
        <div className="flex items-center gap-1.5">
          High {formatApr(benchmark.apr_range.max)}
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Top pools */}
      <div className="space-y-2">
        {benchmark.top_pools.map((pool, i) => (
          <div key={pool.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-zinc-600 text-xs w-4">{i + 1}.</span>
              <span className="text-zinc-200">{formatProtocolName(pool.protocol)}</span>
              <span className="text-zinc-600 text-xs">{pool.symbol}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-500 text-xs">{formatTvl(pool.tvl_usd)}</span>
              <span className="text-emerald-400 font-medium tabular-nums">{formatApr(pool.apr_total)}</span>
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}

function CompactTile({ benchmark, meta }: { benchmark: AssetClassBenchmark; meta: (typeof ASSET_CLASSES)[0] }) {
  const topPool = benchmark.top_pools[0];
  return (
    <Link
      href={meta.href}
      className="block border border-zinc-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-colors bg-zinc-900"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-100">{meta.name}</h3>
        <span className="text-xs text-zinc-500">{benchmark.pool_count} pools</span>
      </div>

      <div className="text-3xl font-bold text-emerald-400 tabular-nums mb-1">
        {formatApr(benchmark.benchmark_apr)}
      </div>
      <div className="text-[10px] text-zinc-600 mb-4">Benchmark &middot; {formatTvl(benchmark.total_tvl_usd)} TVL</div>

      <div className="text-xs text-zinc-500">
        {formatApr(benchmark.apr_range.min)} &ndash; {formatApr(benchmark.apr_range.max)} range
      </div>

      {topPool && (
        <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs">
          <span className="text-zinc-400">Best: {formatProtocolName(topPool.protocol)}</span>
          <span className="text-emerald-400 tabular-nums">{formatApr(topPool.apr_total)}</span>
        </div>
      )}
    </Link>
  );
}

export default async function BentoPrototype() {
  const [{ benchmarks }, stats] = await Promise.all([queryBenchmarks(), queryStats()]);

  const heroes = ASSET_CLASSES.filter(a => a.hero);
  const compact = ASSET_CLASSES.filter(a => !a.hero);

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

      <div className="flex-1 p-6">
        <div className="max-w-5xl space-y-4">
          {/* Hero tiles — 2 col */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {heroes.map((meta) => {
              const bench = benchmarks[meta.slug];
              if (!bench) return null;
              return <HeroTile key={meta.slug} benchmark={bench} meta={meta} />;
            })}
          </div>

          {/* Compact tiles — 3 col */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {compact.map((meta) => {
              const bench = benchmarks[meta.slug];
              if (!bench) return null;
              return <CompactTile key={meta.slug} benchmark={bench} meta={meta} />;
            })}
          </div>
        </div>

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
