import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { TweetItem } from "./types";

const TweetRowSchema = z.object({
  url: z
    .string()
    .regex(
      /^https:\/\/(x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+(\?.*)?$/,
      "must be a tweet URL",
    ),
  added_at: z.string().datetime(),
  notes: z.string().optional(),
});

function makeId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  return `tweet-${Math.abs(hash).toString(36)}`;
}

export async function loadCuratedTweets(): Promise<TweetItem[]> {
  try {
    const filePath = path.join(process.cwd(), "data", "tweets.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn("tweets.json: root is not an array, skipping");
      return [];
    }

    const items: TweetItem[] = [];
    for (const entry of parsed) {
      const result = TweetRowSchema.safeParse(entry);
      if (!result.success) {
        console.warn(
          `tweets.json: skipping invalid entry — ${result.error.issues[0]?.message ?? "unknown error"}`,
        );
        continue;
      }
      items.push({
        id: makeId(result.data.url),
        type: "tweet",
        render_mode: "embed",
        published_at: result.data.added_at,
        url: result.data.url,
      });
    }
    return items;
  } catch (e) {
    console.warn(`Failed to load curated tweets: ${(e as Error).message}`);
    return [];
  }
}
