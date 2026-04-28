export const dynamic = "force-dynamic";

import "react-tweet/theme.css";
import "./tweet-overrides.css";
import Link from "next/link";
import { getFeedItems, ensureFeedPopulated } from "@/lib/feed/store";
import { ensureCachePopulated } from "@/lib/pipeline/cache";
import { FeedItem } from "@/components/feed/FeedItem";

export default async function FeedPage() {
  await ensureCachePopulated();
  await ensureFeedPopulated();
  const sorted = getFeedItems();

  return (
    <div className="flex-1 max-w-[640px] mx-auto w-full px-4 sm:px-6 py-8">
      <Link
        href="/"
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6 inline-block"
      >
        &larr; Back to pools
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
          Yield Feed
        </h1>
        <p className="text-[var(--text-muted)] text-sm">
          Curated yield alpha from DeFi&apos;s best analysts
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="text-[var(--text-muted)] text-sm text-center py-8">
          No articles available right now. Check back soon.
        </p>
      ) : (
        <>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-6">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              Posts
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
              Articles
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              Newsletters
            </span>
          </div>

          {/* Feed */}
          <div className="flex flex-col gap-4">
            {sorted.map((item) => (
              <FeedItem key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
