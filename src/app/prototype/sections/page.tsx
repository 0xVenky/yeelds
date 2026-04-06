export const dynamic = "force-dynamic";

import Link from "next/link";
import { queryBenchmarks, queryStats } from "@/lib/api/query";
import { formatTvl, formatApr, formatProtocolName, computeSimulation } from "@/lib/utils";
import type { AssetClassBenchmark } from "@/lib/types";

const ASSET_CLASSES = [
  { slug: "usd_stable", name: "USD Stablecoins", href: "/stables/usd", description: "Yield on USDC, USDT, DAI, USDS and other USD-pegged assets" },
  { slug: "eth_class", name: "ETH & Liquid Staking", href: "/eth", description: "Yield on ETH, wstETH, rETH, cbETH and other liquid staking tokens" },
  { slug: "btc_class", name: "Bitcoin", href: "/btc", description: "Yield on WBTC, tBTC, cbBTC and wrapped Bitcoin" },
  { slug: "eur_stable", name: "EUR Stablecoins", href: "/stables/eur", description: "Yield on EURS, EURe, agEUR and EUR-pegged assets" },
  { slug: "rwa", name: "Real World Assets", href: "/rwa", description: "Yield backed by T-bills, institutional credit and real-world collateral" },
];

function AssetSection({
  benchmark,
  meta,
  index,
}: {
  benchmark: AssetClassBenchmark;
  meta: (typeof ASSET_CLASSES)[0];
  index: number;
}) {
  const sim = computeSimulation(benchmark.benchmark_apr);
  const isEven = index % 2 === 0;

  return (
    <section className={`border-b border-zinc-800/50 ${isEven ? "" : "bg-zinc-900/30"}`}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left: benchmark info */}
          <div className="md:col-span-4">
            <Link href={meta.href} className="group">
              <h2 className="text-xl font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                {meta.name}
              </h2>
            </Link>
            <p className="text-xs text-zinc-500 mt-1 mb-5">{meta.description}</p>

            <div className="text-4xl font-bold text-emerald-400 tabular-nums tracking-tight">
              {formatApr(benchmark.benchmark_apr)}
            </div>
            <div className="text-xs text-zinc-600 mt-1 mb-4">Benchmark APR</div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-zinc-600">Pools</div>
                <div className="text-zinc-300 font-medium">{benchmark.pool_count}</div>
              </div>
              <div>
                <div className="text-zinc-600">Total TVL</div>
                <div className="text-zinc-300 font-medium">{formatTvl(benchmark.total_tvl_usd)}</div>
              </div>
              <div>
                <div className="text-zinc-600">APR Range</div>
                <div className="text-zinc-300 font-medium tabular-nums">
                  {formatApr(benchmark.apr_range.min)} &ndash; {formatApr(benchmark.apr_range.max)}
                </div>
              </div>
              <div>
                <div className="text-zinc-600">$1K/day</div>
                <div className="text-zinc-300 font-medium tabular-nums">${sim.daily_earnings_per_1k}</div>
              </div>
            </div>

            <Link
              href={meta.href}
              className="inline-flex items-center gap-1 mt-5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View all {benchmark.pool_count} pools &rarr;
            </Link>
          </div>

          {/* Right: top pools */}
          <div className="md:col-span-8">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-3">Top opportunities</div>
            <div className="space-y-0">
              {benchmark.top_pools.map((pool, i) => {
                const poolSim = computeSimulation(pool.apr_total);
                return (
                  <div
                    key={pool.id}
                    className="flex items-center gap-4 py-3 border-t border-zinc-800/40"
                  >
                    <span className="text-zinc-700 text-sm w-5 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-200 font-medium">{formatProtocolName(pool.protocol)}</span>
                        <span className="text-xs text-zinc-600">{pool.symbol}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm text-zinc-400 tabular-nums">{formatTvl(pool.tvl_usd)}</div>
                    </div>
                    <div className="text-right shrink-0 w-20">
                      <div className="text-sm text-emerald-400 font-medium tabular-nums">{formatApr(pool.apr_total)}</div>
                      <div className="text-[10px] text-zinc-600 tabular-nums">${poolSim.daily_earnings_per_1k}/day</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function SectionsPrototype() {
  const [{ benchmarks }, stats] = await Promise.all([queryBenchmarks(), queryStats()]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-zinc-800/50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Yield Discovery</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Current rates across {stats.total_pools} pools &middot; {formatTvl(stats.total_tvl_usd)} TVL &middot; {stats.chains_covered} chains
            </p>
          </div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">&larr; Back to table</Link>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1">
        {ASSET_CLASSES.map((meta, i) => {
          const bench = benchmarks[meta.slug];
          if (!bench) return null;
          return <AssetSection key={meta.slug} benchmark={bench} meta={meta} index={i} />;
        })}
      </div>

      {/* Footer CTA */}
      <div className="px-6 py-6 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            Browse all {stats.total_pools} pools in table view &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
