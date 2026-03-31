import type { PaginatedResponse, PoolListItem } from "@/lib/types";
import {
  formatTvl,
  formatApr,
  formatUsd,
  formatPoolType,
  formatProtocolName,
} from "@/lib/utils";
import { PoolRow } from "./PoolRow";

const POOL_TYPE_STYLES: Record<string, string> = {
  amm_lp: "bg-blue-900/50 text-blue-300",
  lending: "bg-green-900/50 text-green-300",
  vault: "bg-purple-900/50 text-purple-300",
};

function chainLabel(chain: string): string {
  return chain.charAt(0).toUpperCase() + chain.slice(1);
}

export function PoolTable({ data }: { data: PaginatedResponse<PoolListItem> }) {
  const pools = data.data;

  if (pools.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        No pools found matching your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500 uppercase tracking-wider">
            <th className="sticky top-0 bg-zinc-950 px-4 py-3 font-medium">Chain</th>
            <th className="sticky top-0 bg-zinc-950 px-4 py-3 font-medium">Protocol</th>
            <th className="sticky top-0 bg-zinc-950 px-4 py-3 font-medium">Pool</th>
            <th className="sticky top-0 bg-zinc-950 px-4 py-3 font-medium">Type</th>
            <th className="sticky top-0 bg-zinc-950 px-4 py-3 font-medium text-right">TVL</th>
            <th className="sticky top-0 bg-zinc-950 px-4 py-3 font-medium text-right">APR</th>
            <th className="sticky top-0 bg-zinc-950 px-4 py-3 font-medium text-right">Base</th>
            <th className="sticky top-0 bg-zinc-950 px-4 py-3 font-medium text-right">Reward</th>
            <th className="sticky top-0 bg-zinc-950 px-4 py-3 font-medium text-right">Daily/$1K</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {pools.map((pool) => (
            <PoolRow key={pool.id} href={`/pool/${pool.id}`}>
              <td className="px-4 py-3 text-zinc-400">{chainLabel(pool.chain)}</td>
              <td className="px-4 py-3 font-medium text-zinc-200">
                {formatProtocolName(pool.protocol)}
              </td>
              <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] text-zinc-300">
                {pool.symbol}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                    POOL_TYPE_STYLES[pool.pool_type] ?? "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {formatPoolType(pool.pool_type)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] text-zinc-200">
                {formatTvl(pool.tvl_usd)}
              </td>
              <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] text-emerald-400 font-medium">
                {formatApr(pool.yield.apr_total)}
              </td>
              <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] text-green-400/70">
                {formatApr(pool.yield.apr_base)}
              </td>
              <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] text-blue-400/70">
                {formatApr(pool.yield.apr_reward)}
              </td>
              <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] text-zinc-300">
                {formatUsd(pool.simulation.daily_earnings_per_1k)}
              </td>
            </PoolRow>
          ))}
        </tbody>
      </table>
    </div>
  );
}
