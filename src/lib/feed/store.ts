import type { FeedItem } from "./types";
import { MOCK_FEED } from "./mock-data";

const MAX_FEED_ITEMS = 200;
const MAX_AGE_DAYS = 30;

let feedItems: FeedItem[] = [...MOCK_FEED];

export function getFeedItems(): FeedItem[] {
  return feedItems;
}

/**
 * Ingest new feed items. Deduplicates by ID, trims old items,
 * and keeps the store bounded.
 */
export function ingestFeedItems(items: FeedItem[]): { added: number; total: number } {
  const existingIds = new Set(feedItems.map((f) => f.id));
  const newItems = items.filter((item) => !existingIds.has(item.id));

  feedItems = [...newItems, ...feedItems]
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, MAX_FEED_ITEMS);

  // Trim items older than MAX_AGE_DAYS
  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
  feedItems = feedItems.filter((f) => new Date(f.published_at).getTime() > cutoff);

  return { added: newItems.length, total: feedItems.length };
}
