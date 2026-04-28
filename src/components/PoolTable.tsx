import type { PaginatedResponse, PoolListItem } from "@/lib/types";
import { formatTvl, formatApr, formatUsd, formatPoolType, formatProtocolName, formatYieldSource } from "@/lib/utils";
import { PoolRow } from "./PoolRow";
import { SimulationTooltip } from "./SimulationTooltip";
import { StabilityBadge } from "./StabilityBadge";
import { ShareButton } from "./ShareButton";
import { SortHeader } from "./SortHeader";
import { ChainDot } from "./ChainDot";

export function PoolTable({ data }: { data: PaginatedResponse<PoolListItem> }) {
  const pools = data.data;

  if (pools.length === 0) {
    return (
      <div className="text-center py-16 font-medium" style={{ color: "var(--outline)" }}>
        No pools found matching your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto px-6 sm:px-8">
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--surface-container-lowest)" }}>
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr
              className="text-left text-xs uppercase tracking-wider"
              style={{ color: "var(--on-surface-variant)", backgroundColor: "var(--surface-container-low)" }}
            >
              <th className="sticky top-0 px-5 py-3.5 font-semibold w-10" style={{ backgroundColor: "var(--surface-container-low)" }}>
                Chain
              </th>
              <th className="sticky top-0 px-5 py-3.5 font-semibold" style={{ backgroundColor: "var(--surface-container-low)" }}>
                Protocol
              </th>
              <th className="sticky top-0 px-5 py-3.5 font-semibold" style={{ backgroundColor: "var(--surface-container-low)" }}>
                Action
              </th>
              <SortHeader label="TVL" field="tvl_usd" align="right" />
              <th className="sticky top-0 px-5 py-3.5 font-semibold hidden md:table-cell" style={{ backgroundColor: "var(--surface-container-low)" }}>
                Stability
              </th>
              <SortHeader label="APY" field="apr_total" align="right" />
              <th className="sticky top-0 px-5 py-3.5 font-semibold text-right hidden md:table-cell" style={{ backgroundColor: "var(--surface-container-low)" }}>
                Daily Rewards
              </th>
              <th className="sticky top-0 px-5 py-3.5 font-semibold w-20" style={{ backgroundColor: "var(--surface-container-low)" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pools.map((pool) => (
              <PoolRow key={pool.id} href={`/pool/${pool.id}`}>
                {/* Chain */}
                <td className="px-5 py-4">
                  <ChainDot chain={pool.chain} />
                </td>
                {/* Protocol */}
                <td className="px-5 py-4 font-semibold" style={{ color: "var(--on-surface)" }}>
                  {formatProtocolName(pool.protocol)}
                </td>
                {/* Action */}
                <td className="px-5 py-4">
                  <div>
                    <span className="text-xs" style={{ color: "var(--outline)" }}>
                      {formatPoolType(pool.pool_type)}
                    </span>{" "}
                    <span className="font-medium" style={{ color: "var(--on-surface-variant)" }}>
                      {pool.symbol}
                    </span>
                  </div>
                </td>
                {/* TVL */}
                <td className="px-5 py-4 text-right font-semibold tabular-nums" style={{ color: "var(--on-surface)" }}>
                  {formatTvl(pool.tvl_usd)}
                </td>
                {/* Stability */}
                <td className="px-5 py-4 hidden md:table-cell">
                  <StabilityBadge category={pool.exposure.category} />
                </td>
                {/* APR */}
                <td className="px-5 py-4 text-right">
                  <div className="relative group/apr">
                    <div className="font-bold tabular-nums cursor-default" style={{ color: "var(--secondary)" }}>
                      {formatApr(pool.yield.apr_total)}
                      {pool.yield.is_estimated && (
                        <span className="ml-1 text-[10px] text-amber-500" title="7-day average unavailable">~</span>
                      )}
                    </div>
                    {(pool.yield.apr_base !== null || pool.yield.apr_reward !== null) && (
                      <div
                        className="absolute hidden group-hover/apr:block bottom-full right-0 mb-1.5 z-20 w-48 rounded-2xl p-4 shadow-lg text-left text-xs"
                        style={{
                          backgroundColor: "var(--surface-container-lowest)",
                          boxShadow: "0 8px 40px rgba(25, 28, 30, 0.06)",
                        }}
                        role="tooltip"
                      >
                        <div className="flex justify-between mb-2">
                          <span style={{ color: "var(--on-surface-variant)" }}>{formatYieldSource(pool.yield_source)}</span>
                          <span className="font-bold tabular-nums" style={{ color: "var(--secondary)" }}>{formatApr(pool.yield.apr_base)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--on-surface-variant)" }}>Incentive rewards</span>
                          <span className="font-bold tabular-nums" style={{ color: "var(--primary)" }}>{formatApr(pool.yield.apr_reward)}</span>
                        </div>
                        {pool.incentives_summary.sources.length > 0 && (
                          <div className="mt-2 pt-2 text-[10px]" style={{ borderTop: "1px solid var(--surface-container-high)", color: "var(--outline)" }}>
                            via {pool.incentives_summary.sources.join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                {/* Daily Rewards */}
                <td className="px-5 py-4 text-right hidden md:table-cell">
                  <SimulationTooltip aprTotal={pool.yield.apr_total}>
                    <span
                      className="cursor-help border-b border-dotted tabular-nums font-medium"
                      style={{ borderColor: "var(--outline-variant)", color: "var(--on-surface-variant)" }}
                    >
                      {formatUsd(pool.simulation.daily_earnings_per_1k)}
                    </span>
                  </SimulationTooltip>
                </td>
                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <span
                      className="p-1.5 rounded"
                      style={{ color: "var(--outline-variant)" }}
                      aria-label="Bookmark (coming soon)"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <ShareButton poolId={pool.id} />
                  </div>
                </td>
              </PoolRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
