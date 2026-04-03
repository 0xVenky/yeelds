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
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
            risk.contract_age_days < 30
              ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
              : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
          }`}
          aria-label={`Contract age: ${risk.contract_age_days} days`}
        >
          {risk.contract_age_days < 30 ? "New" : `${risk.contract_age_days}d`}
        </span>
      )}
      {risk.is_verified === true && (
        <span
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          aria-label="Contract verified"
        >
          <svg
            className="h-3 w-3"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M13.25 4.75L6 12 2.75 8.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Verified
        </span>
      )}
      {risk.is_audited === true && (
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          aria-label="Protocol audited"
        >
          Audited
        </span>
      )}
    </span>
  );
}
