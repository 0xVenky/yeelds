import type { StatsResponse } from "@/lib/types";
import { formatTvl } from "@/lib/utils";

export function Header({ stats }: { stats: StatsResponse }) {
  const refreshedAgo = stats.last_refreshed
    ? formatRelativeTime(stats.last_refreshed)
    : null;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <h1 className="text-xl font-bold tracking-tight font-[family-name:var(--font-geist-mono)]">
        YEELDS
      </h1>
      <div className="flex items-center gap-4 text-sm text-zinc-400">
        <span>{stats.total_pools} pools</span>
        <span aria-hidden="true">·</span>
        <span>{formatTvl(stats.total_tvl_usd)} TVL</span>
        <span aria-hidden="true">·</span>
        <span>{stats.chains_covered} chains</span>
        {refreshedAgo && (
          <>
            <span aria-hidden="true">·</span>
            <span>Updated {refreshedAgo}</span>
          </>
        )}
      </div>
    </header>
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
