import type { PoolDetail } from "@/lib/types";
import { formatApr } from "@/lib/utils";

export function YieldCard({ pool }: { pool: PoolDetail }) {
  const { yield: y } = pool;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
        Yield Breakdown
      </h2>
      <div className="text-3xl font-bold font-[family-name:var(--font-geist-mono)] text-emerald-400 mb-4">
        {formatApr(y.apr_total)}
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-zinc-400">Base APR</dt>
          <dd className="font-[family-name:var(--font-geist-mono)] text-green-400">
            {formatApr(y.apr_base)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-400">Reward APR</dt>
          <dd className="font-[family-name:var(--font-geist-mono)] text-blue-400">
            {formatApr(y.apr_reward)}
          </dd>
        </div>
        {y.apr_base_7d !== null && (
          <div className="flex justify-between">
            <dt className="text-zinc-400">7d Avg Base</dt>
            <dd className="font-[family-name:var(--font-geist-mono)] text-zinc-300">
              {formatApr(y.apr_base_7d)}
            </dd>
          </div>
        )}
        {y.il_7d !== null && (
          <div className="flex justify-between">
            <dt className="text-zinc-400">IL 7d</dt>
            <dd className="font-[family-name:var(--font-geist-mono)] text-red-400/70">
              {formatApr(y.il_7d)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
