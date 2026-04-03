import type { CampaignDetail } from "@/lib/types";

export function CampaignList({ campaigns }: { campaigns: CampaignDetail[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 p-5">
        <h2 className="text-sm font-medium text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-3">
          Incentive Campaigns
        </h2>
        <p className="text-sm text-gray-400 dark:text-zinc-600">
          Campaign details available after Merkl/Metrom integration.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 p-5">
      <h2 className="text-sm font-medium text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-4">
        Incentive Campaigns
      </h2>
      <div className="space-y-3">
        {campaigns.map((c, i) => (
          <div
            key={`${c.source}-${c.reward_token.address}-${i}`}
            className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-zinc-800/50 pb-2 last:border-0"
          >
            <div>
              <span className="text-gray-800 dark:text-zinc-200 font-medium">{c.reward_token.symbol}</span>
              <span className="text-gray-400 dark:text-zinc-500 ml-2 text-xs">via {c.source}</span>
            </div>
            <div className="text-right">
              <span className="font-[family-name:var(--font-geist-mono)] text-blue-600 dark:text-blue-400">
                {c.apr_contribution.toFixed(2)}%
              </span>
              {c.days_remaining > 0 && (
                <span className="text-gray-400 dark:text-zinc-500 text-xs ml-2">
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
