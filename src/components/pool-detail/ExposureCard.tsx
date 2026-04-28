import type { PoolDetail } from "@/lib/types";
import { ExposurePills } from "@/components/ExposurePills";

export function ExposureCard({ pool }: { pool: PoolDetail }) {
  const { exposure } = pool;

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--surface-container-lowest)" }}>
      <h2 className="text-sm font-medium font-[family-name:var(--font-manrope)] uppercase tracking-wider mb-4" style={{ color: "var(--outline)" }}>
        Exposure
      </h2>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--on-surface-variant)" }}>Type:</span>
          <span className="capitalize" style={{ color: "var(--on-surface)" }}>{exposure.type}</span>
        </div>
        {exposure.category && (
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--on-surface-variant)" }}>Category:</span>
            <span
              className="rounded-lg px-2 py-0.5 text-xs font-medium capitalize"
              style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}
            >
              {exposure.category.replace("_", " ")}
            </span>
          </div>
        )}
        <div>
          <span className="block mb-2" style={{ color: "var(--on-surface-variant)" }}>Underlying tokens:</span>
          {exposure.underlying_tokens.length > 0 ? (
            <ExposurePills tokens={exposure.underlying_tokens} />
          ) : (
            <span style={{ color: "var(--outline)" }}>&mdash;</span>
          )}
        </div>
      </div>
    </div>
  );
}
