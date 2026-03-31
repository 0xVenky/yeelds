import type { PoolDetail } from "@/lib/types";

export function ExposureCard({ pool }: { pool: PoolDetail }) {
  const { exposure } = pool;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
        Exposure
      </h2>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Type:</span>
          <span className="text-zinc-200 capitalize">{exposure.type}</span>
        </div>
        {exposure.category && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Category:</span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300 capitalize">
              {exposure.category.replace("_", " ")}
            </span>
          </div>
        )}
        <div>
          <span className="text-zinc-400 block mb-2">Underlying tokens:</span>
          <div className="flex flex-wrap gap-2">
            {exposure.underlying_tokens.length > 0 ? (
              exposure.underlying_tokens.map((token) => (
                <span
                  key={token.address}
                  className="inline-flex items-center rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200"
                  title={token.address}
                >
                  {token.symbol}
                  {token.is_stable && (
                    <span className="ml-1 text-green-400" aria-label="Stablecoin">
                      $
                    </span>
                  )}
                </span>
              ))
            ) : (
              <span className="text-zinc-500">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
