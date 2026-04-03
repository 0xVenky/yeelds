import type { PoolDetail } from "@/lib/types";
import { ExposurePills } from "@/components/ExposurePills";

export function ExposureCard({ pool }: { pool: PoolDetail }) {
  const { exposure } = pool;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 p-5">
      <h2 className="text-sm font-medium text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-4">
        Exposure
      </h2>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-zinc-400">Type:</span>
          <span className="text-gray-800 dark:text-zinc-200 capitalize">{exposure.type}</span>
        </div>
        {exposure.category && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-zinc-400">Category:</span>
            <span className="rounded bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-zinc-300 capitalize">
              {exposure.category.replace("_", " ")}
            </span>
          </div>
        )}
        <div>
          <span className="text-gray-500 dark:text-zinc-400 block mb-2">Underlying tokens:</span>
          {exposure.underlying_tokens.length > 0 ? (
            <ExposurePills tokens={exposure.underlying_tokens} />
          ) : (
            <span className="text-gray-400 dark:text-zinc-500">&mdash;</span>
          )}
        </div>
      </div>
    </div>
  );
}
