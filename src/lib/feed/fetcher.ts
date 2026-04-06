import Parser from "rss-parser";
import type { FeedItem } from "./types";

const parser = new Parser({ timeout: 10000 });

const RSS_FEEDS: { url: string; publication: string; type: "substack" | "article" }[] = [
  // Tier 1: Yield-Specific Analysts
  { url: "https://www.thedefidigest.io/feed", publication: "Yannis | DeFi insights", type: "article" },
  { url: "https://herculesdefi.substack.com/feed", publication: "Hercules DeFi", type: "substack" },
  { url: "https://www.ignasdefi.com/feed", publication: "Ignas | DeFi", type: "article" },
  { url: "https://defirates.substack.com/feed", publication: "DeFi Rates", type: "substack" },
  { url: "https://optimismbysublidefi.substack.com/feed", publication: "Subli DeFi", type: "substack" },
  // Tier 2: Research & Institutional
  { url: "https://gogol.substack.com/feed", publication: "Krzysztof Gogol", type: "substack" },
  { url: "https://stablecoininsider.org/rss/", publication: "Stablecoin Insider", type: "article" },
  { url: "https://blog.vaults.fyi/rss/", publication: "vaults.fyi", type: "article" },
  { url: "https://qiro.substack.com/feed", publication: "Qiro Network", type: "substack" },
  { url: "https://wublock.substack.com/feed", publication: "Wu Blockchain", type: "substack" },
  // Tier 3: Supporting
  { url: "https://hfaresearch.substack.com/feed", publication: "HFA Research", type: "substack" },
  { url: "https://deficryptovaults.substack.com/feed", publication: "DeFi Vaults", type: "substack" },
  { url: "https://defiprime.substack.com/feed", publication: "DeFi Prime", type: "substack" },
  { url: "https://thedefireport.substack.com/feed", publication: "The DeFi Report", type: "substack" },
  { url: "https://yieldfarmer.substack.com/feed", publication: "DeFi Pulse Farmer", type: "substack" },
];

const MAX_ITEMS_PER_FEED = 5;
const MAX_AGE_DAYS = 30;

function makeId(url: string): string {
  // Deterministic ID from URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

async function fetchSingleFeed(
  feed: typeof RSS_FEEDS[number],
): Promise<FeedItem[]> {
  const parsed = await parser.parseURL(feed.url);
  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
  const items: FeedItem[] = [];

  for (const entry of parsed.items.slice(0, MAX_ITEMS_PER_FEED)) {
    const url = entry.link ?? "";
    if (!url) continue;

    const published_at = entry.isoDate ?? new Date().toISOString();
    if (new Date(published_at).getTime() < cutoff) continue;

    const rawContent = entry.contentSnippet ?? entry.content ?? entry.summary ?? "";
    const excerpt = rawContent.replace(/<[^>]*>/g, "").slice(0, 300).trim();
    const title = entry.title ?? "Untitled";

    if (feed.type === "substack") {
      items.push({
        id: `substack-${makeId(url)}`,
        type: "substack",
        published_at,
        publication: feed.publication,
        author: entry.creator ?? feed.publication,
        title,
        excerpt,
        url,
      });
    } else {
      const wordCount = rawContent.split(/\s+/).length;
      items.push({
        id: `article-${makeId(url)}`,
        type: "article",
        published_at,
        source: feed.publication,
        title,
        excerpt,
        author: entry.creator ?? feed.publication,
        read_time_min: Math.max(1, Math.round(wordCount / 200)),
        url,
      });
    }
  }

  return items;
}

/**
 * Fetch all RSS feeds in parallel. Tolerates individual feed failures.
 */
export async function fetchAllFeeds(): Promise<{ items: FeedItem[]; errors: string[] }> {
  const errors: string[] = [];
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        return await fetchSingleFeed(feed);
      } catch (e) {
        errors.push(`${feed.publication}: ${(e as Error).message}`);
        return [];
      }
    }),
  );

  const items = results
    .filter((r): r is PromiseFulfilledResult<FeedItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  console.log(`Feed refresh: ${items.length} items from ${RSS_FEEDS.length} feeds, ${errors.length} errors`);
  if (errors.length > 0) {
    console.warn("Feed errors:", errors.join("; "));
  }

  return { items, errors };
}
