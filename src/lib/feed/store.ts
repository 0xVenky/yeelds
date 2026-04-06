import type { FeedItem } from "./types";
import { fetchAllFeeds } from "./fetcher";

let feedItems: FeedItem[] = [];
let feedRefreshed = false;
let refreshPromise: Promise<void> | null = null;

export function getFeedItems(): FeedItem[] {
  return feedItems;
}

/**
 * Refresh feed from RSS sources.
 */
export async function refreshFeed(): Promise<void> {
  try {
    const { items } = await fetchAllFeeds();
    if (items.length > 0) {
      feedItems = items;
      feedRefreshed = true;
    }
  } catch (e) {
    console.warn(`Feed refresh failed: ${(e as Error).message}`);
  }
}

/**
 * Ensure feed is populated. Waits for any in-progress refresh.
 * Called by the feed page — must block until data is ready.
 */
export async function ensureFeedPopulated(): Promise<void> {
  if (feedRefreshed) return;

  // If a refresh is already running, wait for it
  if (refreshPromise) {
    await refreshPromise;
    return;
  }

  // Start a new refresh and wait
  refreshPromise = refreshFeed();
  await refreshPromise;
  refreshPromise = null;
}
