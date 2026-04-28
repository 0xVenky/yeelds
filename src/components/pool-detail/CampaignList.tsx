import type { CampaignDetail } from "@/lib/types";

export function CampaignList({ campaigns }: { campaigns: CampaignDetail[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--surface-container-lowest)" }}>
        <h2 className="text-sm font-medium font-[family-name:var(--font-manrope)] uppercase tracking-wider mb-3" style={{ color: "var(--outline)" }}>
          Incentive Campaigns
        </h2>
        <p className="text-sm" style={{ color: "var(--outline)" }}>
          Campaign details available after Merkl/Metrom integration.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--surface-container-lowest)" }}>
      <h2 className="text-sm font-medium font-[family-name:var(--font-manrope)] uppercase tracking-wider mb-4" style={{ color: "var(--outline)" }}>
        Incentive Campaigns
      </h2>
      <div className="space-y-3">
        {campaigns.map((c, i) => (
          <div
            key={`${c.source}-${c.reward_token.address}-${i}`}
            className="flex items-center justify-between text-sm pb-2 last:pb-0"
            style={{ borderBottom: i < campaigns.length - 1 ? "1px solid var(--surface-container-high)" : "none" }}
          >
            <div>
              <span className="font-medium" style={{ color: "var(--on-surface)" }}>{c.reward_token.symbol}</span>
              <span className="ml-2 text-xs" style={{ color: "var(--outline)" }}>via {c.source}</span>
            </div>
            <div className="text-right">
              <span className="tabular-nums font-medium" style={{ color: "var(--secondary)" }}>
                {c.apr_contribution.toFixed(2)}%
              </span>
              {c.days_remaining > 0 && (
                <span className="text-xs ml-2" style={{ color: "var(--outline)" }}>
                  {c.days_remaining}d left
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
