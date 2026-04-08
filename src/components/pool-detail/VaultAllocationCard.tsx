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
        <span className="text-gray-800 dark:text-zinc-200">{loanSymbol}</span>
        <span className="rounded bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-zinc-400">
          Idle Liquidity
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-800 dark:text-zinc-200">
        {alloc.collateral_asset.symbol}
        <span className="text-gray-400 dark:text-zinc-500"> / {loanSymbol}</span>
      </span>
      {alloc.lltv !== null && (
        <span className="rounded bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-zinc-400">
          {(alloc.lltv * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}

export function VaultAllocationCard({ data }: { data: MorphoVaultData }) {
  const hasRewards = Math.abs(data.net_apy - data.net_apy_excluding_rewards) > 0.0001;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 p-5">
      <h2 className="text-sm font-medium text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-4">
        Vault Allocation
      </h2>

      {/* Vault header */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-zinc-400">Vault:</span>
          <span className="text-gray-800 dark:text-zinc-200">{data.vault_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-zinc-400">Deposits:</span>
          <span className="text-gray-800 dark:text-zinc-200">{data.deposit_asset.symbol}</span>
        </div>
        {data.fee_pct > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-zinc-400">Performance fee:</span>
            <span className="text-gray-800 dark:text-zinc-200">{(data.fee_pct * 100).toFixed(0)}%</span>
          </div>
        )}
        {hasRewards && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-zinc-400">Yield breakdown:</span>
            <span className="text-gray-800 dark:text-zinc-200">
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
              <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-500">
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
                  className="border-b border-gray-100 dark:border-zinc-800/50"
                >
                  <td className="py-2.5 pr-3">
                    <MarketExposure alloc={alloc} loanSymbol={data.deposit_asset.symbol} />
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600 dark:text-zinc-300">
                    {formatUsd(alloc.supply_usd)}
                  </td>
                  <td className="py-2.5 pl-3 text-right text-gray-800 dark:text-zinc-200">
                    {alloc.supply_usd > 0 ? formatApy(alloc.supply_apy) : (
                      <span className="text-gray-400 dark:text-zinc-500">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-zinc-500">No active allocations</p>
      )}
    </div>
  );
}
