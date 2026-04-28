import type { Deal, DealStatus, DealSource } from "@/lib/deals/types";
import { formatApr, formatTvl } from "@/lib/utils";

// --- Status styling ---

const STATUS_CONFIG: Record<DealStatus, { dot: string; label: string; border: string; opacity: string }> = {
  live: { dot: "bg-emerald-500", label: "Live", border: "border-emerald-500/30", opacity: "opacity-100" },
  upcoming: { dot: "bg-amber-500", label: "Upcoming", border: "border-amber-500/20", opacity: "opacity-100" },
  paused: { dot: "bg-zinc-400", label: "Paused", border: "border-zinc-600", opacity: "opacity-80" },
  ended: { dot: "bg-red-400", label: "Ended", border: "border-zinc-700 dark:border-zinc-800", opacity: "opacity-60" },
};

const SOURCE_LABELS: Record<DealSource, string> = {
  turtle: "Turtle Club",
  liquidity_land: "Liquidity Land",
  telegram: "Curated",
  other: "Curated",
};

import { ChainBadge, ChainDot } from "./ChainDot";

export function DealCard({ deal }: { deal: Deal }) {
  const status = STATUS_CONFIG[deal.status];

  return (
    <article
      className={`rounded-xl border ${status.border} bg-[var(--bg-secondary)] p-5 flex flex-col gap-4 ${status.opacity} hover:scale-[1.02] transition-all duration-300`}
      aria-label={`${deal.title} — ${status.label}`}
    >
      {/* ZONE 1: Identity */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              {status.label}
            </span>
            <span className="text-[var(--text-muted)] text-xs">·</span>
            <span className="text-xs text-[var(--text-muted)]">
              {SOURCE_LABELS[deal.source]}
            </span>
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug">
            {deal.title}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {deal.description}
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 shrink-0 pt-1 flex-wrap"
          role={deal.chains.length > 1 ? "group" : undefined}
          aria-label={deal.chains.length > 1 ? `Cross-chain: ${deal.chains.join(", ")}` : undefined}
        >
          {deal.chains.length > 1 ? (
            <>
              <span style={{ color: "#d97706" }} aria-hidden="true">⚡</span>
              {deal.chains.map((chain) => (
                <ChainDot key={chain} chain={chain} />
              ))}
            </>
          ) : (
            <ChainBadge chain={deal.chains[0]} />
          )}
        </div>
      </div>

      {/* ZONE 2: Yield + Terms */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          {deal.apr_estimate !== null ? (
            <div>
              <span className="text-2xl font-bold text-emerald-500">
                {formatApr(deal.apr_estimate)}
              </span>
              <span className="text-sm text-[var(--text-muted)] ml-1.5">APR</span>
              {/* Breakdown */}
              {(deal.native_apr !== null || deal.bonus_apr !== null) && (
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-[var(--text-muted)]">
                  {deal.native_apr !== null && (
                    <span>
                      <span className="text-[var(--text-secondary)]">{formatApr(deal.native_apr)}</span> native
                    </span>
                  )}
                  {deal.bonus_apr !== null && (
                    <span>
                      <span className="text-emerald-400">+{formatApr(deal.bonus_apr)}</span> bonus
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">APR varies</span>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 text-sm">
          {/* Asset pills */}
          <div className="flex items-center gap-1.5">
            {deal.assets.map((asset) => (
              <span
                key={asset}
                className="rounded-full border border-zinc-300 dark:border-zinc-600 px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]"
              >
                {asset}
              </span>
            ))}
          </div>

          {/* Cap */}
          {deal.cap !== null && (
            <span className="text-xs text-[var(--text-muted)]">
              Cap: {formatTvl(deal.cap)}
            </span>
          )}

          {/* Duration */}
          {deal.duration_label && (
            <span className="text-xs text-[var(--text-muted)]">
              {deal.duration_label}
            </span>
          )}
        </div>
      </div>

      {/* Cap progress bar */}
      {deal.cap !== null && deal.cap_filled_pct !== null && (
        <div>
          <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-1.5 rounded-full bg-emerald-500/70"
              style={{ width: `${Math.min(100, deal.cap_filled_pct)}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 inline-block">
            {deal.cap_filled_pct}% filled
          </span>
        </div>
      )}

      {/* ZONE 3: How to Participate */}
      {deal.steps.length > 0 && (
        <div className="border-t border-zinc-200 dark:border-zinc-700/50 pt-3">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            How to participate
          </h4>
          <ul className="flex flex-col gap-1">
            {deal.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <span className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true">&rarr;</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
          {deal.contacts && (
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Questions: {deal.contacts}
            </p>
          )}
        </div>
      )}

      {/* ZONE 4: Fine Print + CTA */}
      <div className="flex items-end justify-between gap-4 border-t border-zinc-200 dark:border-zinc-700/50 pt-3 mt-auto">
        {deal.notes ? (
          <p className="text-xs text-[var(--text-muted)] flex-1 leading-relaxed">
            {deal.notes}
          </p>
        ) : (
          <div />
        )}
        <a
          href={deal.deposit_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Deposit on {deal.protocol} &rarr;
        </a>
      </div>
    </article>
  );
}
