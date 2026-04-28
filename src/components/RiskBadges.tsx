import type { PoolListItem } from "@/lib/types";

export function RiskBadges({ risk }: { risk: PoolListItem["risk"] }) {
  const hasAny =
    risk.contract_age_days !== null ||
    risk.is_verified !== null ||
    risk.is_audited !== null;

  if (!hasAny) return null;

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {risk.contract_age_days !== null && (
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={
            risk.contract_age_days < 30
              ? { backgroundColor: "#fef2f2", color: "#dc2626" }
              : { backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }
          }
          aria-label={`Contract age: ${risk.contract_age_days} days`}
        >
          {risk.contract_age_days < 30 ? "New" : `${risk.contract_age_days}d`}
        </span>
      )}
      {risk.is_verified === true && (
        <span
          className="inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: "var(--secondary-container)", color: "var(--on-secondary-container)" }}
          aria-label="Contract verified"
        >
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M13.25 4.75L6 12 2.75 8.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Verified
        </span>
      )}
      {risk.is_audited === true && (
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: "var(--secondary-container)", color: "var(--on-secondary-container)" }}
          aria-label="Protocol audited"
        >
          Audited
        </span>
      )}
    </span>
  );
}
