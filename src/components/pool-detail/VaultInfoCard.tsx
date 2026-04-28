import type { UpshiftVaultData } from "@/lib/types";

export function VaultInfoCard({ data }: { data: UpshiftVaultData }) {
  const hasUnderlying = data.apy_underlying > 0;
  const strategyApy = data.apy_total - data.apy_underlying;

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--surface-container-lowest)" }}>
      <h2 className="text-sm font-medium font-[family-name:var(--font-manrope)] uppercase tracking-wider mb-4" style={{ color: "var(--outline)" }}>
        Vault Details
      </h2>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--on-surface-variant)" }}>Vault:</span>
          <span style={{ color: "var(--on-surface)" }}>{data.vault_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--on-surface-variant)" }}>Type:</span>
          <span
            className="rounded-lg px-1.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}
          >
            {data.vault_type}
          </span>
        </div>

        {/* APY breakdown */}
        {data.apy_total > 0 && (
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--on-surface-variant)" }}>Reported APY:</span>
            <span style={{ color: "var(--on-surface)" }}>
              {data.apy_total.toFixed(2)}%
              {hasUnderlying && (
                <span className="ml-1" style={{ color: "var(--outline)" }}>
                  ({data.apy_underlying.toFixed(2)}% organic + {strategyApy.toFixed(2)}% strategy)
                </span>
              )}
            </span>
          </div>
        )}

        {data.fee_bps > 0 && (
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--on-surface-variant)" }}>Performance fee:</span>
            <span style={{ color: "var(--on-surface)" }}>{data.fee_bps} bps weekly</span>
          </div>
        )}

        {data.launch_date && (
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--on-surface-variant)" }}>Launched:</span>
            <span style={{ color: "var(--on-surface)" }}>{data.launch_date}</span>
          </div>
        )}
      </div>
    </div>
  );
}
