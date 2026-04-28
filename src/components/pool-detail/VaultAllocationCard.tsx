import type { MorphoVaultData, VaultAllocation } from "@/lib/types";

function formatUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatApy(apy: number): string {
  return `${(apy * 100).toFixed(2)}%`;
}

function MarketExposure({ alloc, loanSymbol }: { alloc: VaultAllocation; loanSymbol: string }) {
  if (!alloc.collateral_asset) {
    return (
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--on-surface)" }}>{loanSymbol}</span>
        <span
          className="rounded-lg px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
        >
          Idle Liquidity
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span style={{ color: "var(--on-surface)" }}>
        {alloc.collateral_asset.symbol}
        <span style={{ color: "var(--outline)" }}> / {loanSymbol}</span>
      </span>
      {alloc.lltv !== null && (
        <span
          className="rounded-lg px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
        >
          {(alloc.lltv * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}

export function VaultAllocationCard({ data }: { data: MorphoVaultData }) {
  const hasRewards = Math.abs(data.net_apy - data.net_apy_excluding_rewards) > 0.0001;

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--surface-container-lowest)" }}>
      <h2 className="text-sm font-medium font-[family-name:var(--font-manrope)] uppercase tracking-wider mb-4" style={{ color: "var(--outline)" }}>
        Vault Allocation
      </h2>

      {/* Vault header */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--on-surface-variant)" }}>Vault:</span>
          <span style={{ color: "var(--on-surface)" }}>{data.vault_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--on-surface-variant)" }}>Deposits:</span>
          <span style={{ color: "var(--on-surface)" }}>{data.deposit_asset.symbol}</span>
        </div>
        {data.fee_pct > 0 && (
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--on-surface-variant)" }}>Performance fee:</span>
            <span style={{ color: "var(--on-surface)" }}>{(data.fee_pct * 100).toFixed(0)}%</span>
          </div>
        )}
        {hasRewards && (
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--on-surface-variant)" }}>Yield breakdown:</span>
            <span style={{ color: "var(--on-surface)" }}>
              {formatApy(data.net_apy_excluding_rewards)} lending
              {" + "}
              {formatApy(data.net_apy - data.net_apy_excluding_rewards)} rewards
            </span>
          </div>
        )}
      </div>

      {/* Allocation table */}
      {data.allocations.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--surface-container-high)", color: "var(--outline)" }}>
                <th className="text-left py-2 pr-3 font-medium">Market Exposure</th>
                <th className="text-right py-2 px-3 font-medium">
                  Vault Allocation ({data.deposit_asset.symbol})
                </th>
                <th className="text-right py-2 pl-3 font-medium">APY</th>
              </tr>
            </thead>
            <tbody>
              {data.allocations.map((alloc, i) => (
                <tr
                  key={`${alloc.collateral_asset?.address ?? "idle"}-${i}`}
                  style={{ borderBottom: i < data.allocations.length - 1 ? "1px solid var(--surface-container-high)" : "none" }}
                >
                  <td className="py-2.5 pr-3">
                    <MarketExposure alloc={alloc} loanSymbol={data.deposit_asset.symbol} />
                  </td>
                  <td className="py-2.5 px-3 text-right" style={{ color: "var(--on-surface-variant)" }}>
                    {formatUsd(alloc.supply_usd)}
                  </td>
                  <td className="py-2.5 pl-3 text-right" style={{ color: "var(--on-surface)" }}>
                    {alloc.supply_usd > 0 ? formatApy(alloc.supply_apy) : (
                      <span style={{ color: "var(--outline)" }}>&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--outline)" }}>No active allocations</p>
      )}
    </div>
  );
}
