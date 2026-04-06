import type { FeedItem } from "./types";
import { fetchAllFeeds } from "./fetcher";

let feedItems: FeedItem[] = [];
let feedRefreshed = false;
let isRefreshing = false;

export function getFeedItems(): FeedItem[] {
  return feedItems;
}

/**
 * Refresh feed from RSS sources. Called during cache refresh cycle.
 * Non-blocking — feed failures don't affect pool data.
 */
export async function refreshFeed(): Promise<void> {
  if (isRefreshing) return;
  isRefreshing = true;

  try {
    const { items } = await fetchAllFeeds();
    if (items.length > 0) {
      feedItems = items;
      feedRefreshed = true;
    }
  } catch (e) {
    console.warn(`Feed refresh failed: ${(e as Error).message}`);
  } finally {
    isRefreshing = false;
  }
}

export async function ensureFeedPopulated(): Promise<void> {
  if (!feedRefreshed && !isRefreshing) {
    await refreshFeed();
  }
}
