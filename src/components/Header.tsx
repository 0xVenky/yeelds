import { Suspense } from "react";
import type { StatsResponse } from "@/lib/types";
import { formatTvl } from "@/lib/utils";
import { IncentivesToggle } from "./IncentivesToggle";

export function Header({ stats }: { stats: StatsResponse }) {
  const refreshedAgo = stats.last_refreshed
    ? formatRelativeTime(stats.last_refreshed)
    : null;

  return (
    <div className="p-6 sm:p-8">
      {/* Hero */}
      <div className="mb-8">
        <h1
          className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2 font-[family-name:var(--font-manrope)]"
          style={{ color: "var(--on-surface)" }}
        >
          Yield Discovery
        </h1>
        <p
          className="text-base sm:text-lg font-medium"
          style={{ color: "var(--on-surface-variant)" }}
        >
          Discover yield opportunities across {stats.chains_covered} chains.
          {refreshedAgo && (
            <span className="ml-2 text-sm" style={{ color: "var(--outline)" }}>
              Updated {refreshedAgo}
            </span>
          )}
        </p>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <StatCard label="Total TVL" value={formatTvl(stats.total_tvl_usd)} />
        <StatCard label="Active Pools" value={String(stats.total_pools)} subtitle="Across all protocols" />
        <StatCard label="Chains" value={String(stats.chains_covered)} />
        <div className="flex items-center justify-between rounded-2xl p-5 transition-all" style={{ backgroundColor: "var(--surface-container-low)" }}>
          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--on-surface-variant)" }}
            >
              Incentives
            </div>
            <Suspense>
              <IncentivesToggle />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div
      className="rounded-2xl p-5 transition-all hover:brightness-[0.98]"
      style={{ backgroundColor: "var(--surface-container-low)" }}
    >
      <div
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: "var(--on-surface-variant)" }}
      >
        {label}
      </div>
      <div
        className="text-2xl sm:text-3xl font-black font-[family-name:var(--font-manrope)]"
        style={{ color: "var(--on-surface)" }}
      >
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs font-medium" style={{ color: "var(--on-surface-variant)" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
