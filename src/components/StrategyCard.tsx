import Link from "next/link";
import { ChainBadge } from "./ChainDot";
import { formatTvl, formatApr, formatProtocolName } from "@/lib/utils";
import type { PoolListItem } from "@/lib/types";

type Props = {
  pool: PoolListItem;
  accentColor: string;
  accentBg: string;
  accentText: string;
};

export function StrategyCard({ pool, accentColor, accentBg, accentText }: Props) {
  return (
    <div
      className="group rounded-[2rem] hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
      style={{ backgroundColor: "var(--surface-container-lowest)" }}
    >
      <Link href={`/pool/${pool.id}`} className="block p-6 pb-3">
        <div className="flex items-center justify-between mb-8">
          <span className="text-xs font-medium truncate" style={{ color: "var(--on-surface-variant)" }}>
            {formatProtocolName(pool.protocol)}
          </span>
          <ChainBadge
            chain={pool.chain}
            className="px-3 py-1"
            style={{ backgroundColor: accentBg, color: accentText }}
          />
        </div>

        <p className="text-sm font-medium mb-1 truncate" style={{ color: "var(--on-surface-variant)" }}>
          {pool.symbol}
        </p>

        <div className="flex items-baseline gap-1">
          <p
            className="text-4xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tighter"
            style={{ color: "var(--on-surface)" }}
          >
            {formatApr(pool.yield.apr_total)}
          </p>
          <span
            className="font-bold text-lg font-[family-name:var(--font-manrope)]"
            style={{ color: accentColor }}
          >
            APY
          </span>
        </div>
      </Link>

      <div className="flex items-center justify-between px-6 pb-5 pt-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--outline)" }}>
            TVL
          </span>
          <p className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>
            {formatTvl(pool.tvl_usd)}
          </p>
        </div>
        {pool.protocol_url && (
          <a
            href={pool.protocol_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 hover:opacity-90"
            style={{ backgroundColor: accentBg, color: accentText }}
          >
            Visit Protocol <span aria-hidden="true">&rarr;</span>
          </a>
        )}
      </div>
    </div>
  );
}
