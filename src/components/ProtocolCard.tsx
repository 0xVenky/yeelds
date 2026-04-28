import Link from "next/link";
import type { ProtocolSummary } from "@/lib/api/query";
import { CURATED_PROTOCOLS } from "@/lib/constants";
import { formatTvl, formatApr } from "@/lib/utils";
import { ChainDot } from "./ChainDot";

const TYPE_LABELS: Record<string, string> = {
  dex: "DEX",
  lending: "Lending",
  vault: "Vault",
  staking: "Staking",
};

function buildProtocolHref(id: string): string {
  const cp = CURATED_PROTOCOLS.find(p => p.id === id);
  if (!cp) return "/";
  const names = cp.lifi_protocol_names.join(",");
  return `/explore?protocol=${names}`;
}

export function ProtocolCard({ protocol }: { protocol: ProtocolSummary }) {
  const initial = protocol.name.charAt(0).toUpperCase();
  const typeLabel = TYPE_LABELS[protocol.type] ?? protocol.type;

  return (
    <Link
      href={buildProtocolHref(protocol.id)}
      className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[var(--bg-secondary)] p-4 hover:border-emerald-500/30 transition-colors"
    >
      {/* Top row: avatar + name + type badge */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`${protocol.color} w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}
          aria-hidden="true"
        >
          {initial}
        </span>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex-1 min-w-0 truncate">
          {protocol.name}
        </h3>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] bg-zinc-100 dark:bg-zinc-800 rounded px-1.5 py-0.5 shrink-0">
          {typeLabel}
        </span>
      </div>

      {/* Chain dots + pool count */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1">
          {protocol.chains.map((chain) => (
            <ChainDot key={chain} chain={chain} />
          ))}
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {protocol.pool_count} {protocol.pool_count === 1 ? "pool" : "pools"}
        </span>
      </div>

      {/* Stats: TVL + Top APR */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-secondary)]">
          {formatTvl(protocol.total_tvl_usd)} TVL
        </span>
        {protocol.top_apr > 0 && (
          <span className="text-emerald-500 font-medium">
            Top {formatApr(protocol.top_apr)}
          </span>
        )}
      </div>
    </Link>
  );
}
