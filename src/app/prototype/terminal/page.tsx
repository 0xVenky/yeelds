export const dynamic = "force-dynamic";

import Link from "next/link";
import { queryBenchmarks, queryStats } from "@/lib/api/query";
import { formatTvl, formatApr, formatProtocolName, computeSimulation } from "@/lib/utils";
import type { AssetClassBenchmark } from "@/lib/types";

const ASSET_CLASSES = [
  { slug: "usd_stable", name: "USD Stables", href: "/stables/usd" },
  { slug: "eth_class", name: "ETH & LSTs", href: "/eth" },
  { slug: "btc_class", name: "BTC", href: "/btc" },
  { slug: "eur_stable", name: "EUR Stables", href: "/stables/eur" },
  { slug: "rwa", name: "RWA", href: "/rwa" },
];

function BenchmarkStrip({ benchmarks }: { benchmarks: Record<string, AssetClassBenchmark> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 border-b border-zinc-800">
      {ASSET_CLASSES.map((meta) => {
        const bench = benchmarks[meta.slug];
        if (!bench) return null;
        return (
          <Link
            key={meta.slug}
            href={meta.href}
            className="px-4 py-4 border-r border-zinc-800 last:border-r-0 hover:bg-zinc-900/50 transition-colors group"
          >
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">{meta.name}</div>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums font-mono">
              {formatApr(bench.benchmark_apr)}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-600">
              <span>{bench.pool_count} pools</span>
              <span>&middot;</span>
              <span>{formatTvl(bench.total_tvl_usd)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function TerminalPrototype() {
  const [{ benchmarks }, stats] = await Promise.all([queryBenchmarks(), queryStats()]);

  // Flatten all top pools across all asset classes into one ranked list
  const allPools = ASSET_CLASSES.flatMap((meta) => {
    const bench = benchmarks[meta.slug];
    if (!bench) return [];
    return bench.top_pools.map((pool) => ({
      ...pool,
      asset_class: meta.name,
      asset_href: meta.href,
      benchmark_apr: bench.benchmark_apr,
    }));
  });

  // Sort by APR descending
  allPools.sort((a, b) => b.apr_total - a.apr_total);

  return (
    <div className="flex-1 flex flex-col font-mono">
      {/* Compact header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 text-[10px] text-zinc-600 uppercase tracking-wider">
        <span>Yeelds Terminal &mdash; {stats.total_pools} pools &middot; {formatTvl(stats.total_tvl_usd)} TVL</span>
        <Link href="/" className="text-zinc-500 hover:text-zinc-300 normal-case">&larr; Back</Link>
      </div>

      {/* Benchmark strip */}
      <BenchmarkStrip benchmarks={benchmarks} />

      {/* Ranked pool table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-[10px] text-zinc-600 uppercase tracking-wider">
              <th className="px-4 py-2 font-medium w-8">#</th>
              <th className="px-4 py-2 font-medium">Protocol</th>
              <th className="px-4 py-2 font-medium">Pool</th>
              <th className="px-4 py-2 font-medium">Class</th>
              <th className="px-4 py-2 font-medium text-right">TVL</th>
              <th className="px-4 py-2 font-medium text-right">APR</th>
              <th className="px-4 py-2 font-medium text-right">vs Bench</th>
              <th className="px-4 py-2 font-medium text-right">$/day/1K</th>
            </tr>
          </thead>
          <tbody>
            {allPools.map((pool, i) => {
              const sim = computeSimulation(pool.apr_total);
              const diff = pool.apr_total - pool.benchmark_apr;
              const diffColor = diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-zinc-500";
              return (
                <tr
                  key={pool.id}
                  className="border-b border-zinc-800/30 hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="px-4 py-2.5 text-zinc-600">{i + 1}</td>
                  <td className="px-4 py-2.5 text-zinc-200 font-medium">{formatProtocolName(pool.protocol)}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{pool.symbol}</td>
                  <td className="px-4 py-2.5">
                    <Link href={pool.asset_href} className="text-zinc-400 hover:text-emerald-400 transition-colors">
                      {pool.asset_class}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{formatTvl(pool.tvl_usd)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-400 font-medium tabular-nums">
                    {formatApr(pool.apr_total)}
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${diffColor}`}>
                    {diff > 0 ? "+" : ""}{diff.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">
                    ${sim.daily_earnings_per_1k}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* View more */}
        <div className="px-4 py-3 border-t border-zinc-800">
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            View all {stats.total_pools} pools &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
