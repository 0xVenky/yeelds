import type { PoolDetail } from "@/lib/types";
import { formatApr } from "@/lib/utils";
import { YieldBreakdownExpanded } from "@/components/YieldBreakdown";

export function YieldCard({ pool }: { pool: PoolDetail }) {
  const { yield: y } = pool;

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--surface-container-lowest)" }}>
      <h2 className="text-sm font-medium font-[family-name:var(--font-manrope)] uppercase tracking-wider mb-4" style={{ color: "var(--outline)" }}>
        Yield Breakdown
      </h2>
      <div className="text-3xl font-bold tabular-nums mb-4" style={{ color: "var(--secondary)" }}>
        {formatApr(y.apr_total)}
      </div>

      {/* APR breakdown bar */}
      <div className="mb-4">
        <YieldBreakdownExpanded yield={{ ...y, yieldSource: pool.yield_source }} />
      </div>

      {y.il_7d !== null && (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt style={{ color: "var(--on-surface-variant)" }}>IL 7d</dt>
            <dd className="tabular-nums font-medium" style={{ color: "var(--error, #ef4444)" }}>
              {formatApr(y.il_7d)}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
