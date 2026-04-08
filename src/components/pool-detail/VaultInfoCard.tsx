import type { UpshiftVaultData } from "@/lib/types";

export function VaultInfoCard({ data }: { data: UpshiftVaultData }) {
  const hasUnderlying = data.apy_underlying > 0;
  const strategyApy = data.apy_total - data.apy_underlying;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 p-5">
      <h2 className="text-sm font-medium text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-4">
        Vault Details
      </h2>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-zinc-400">Vault:</span>
          <span className="text-gray-800 dark:text-zinc-200">{data.vault_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-zinc-400">Type:</span>
          <span className="rounded bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:text-zinc-300">
            {data.vault_type}
          </span>
        </div>

        {/* APY breakdown */}
        {data.apy_total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-zinc-400">Reported APY:</span>
            <span className="text-gray-800 dark:text-zinc-200">
              {data.apy_total.toFixed(2)}%
              {hasUnderlying && (
                <span className="text-gray-400 dark:text-zinc-500 ml-1">
                  ({data.apy_underlying.toFixed(2)}% organic + {strategyApy.toFixed(2)}% strategy)
                </span>
              )}
            </span>
          </div>
        )}

        {data.fee_bps > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-zinc-400">Performance fee:</span>
            <span className="text-gray-800 dark:text-zinc-200">{data.fee_bps} bps weekly</span>
          </div>
        )}

        {data.launch_date && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-zinc-400">Launched:</span>
            <span className="text-gray-800 dark:text-zinc-200">{data.launch_date}</span>
          </div>
        )}
      </div>
    </div>
  );
}
