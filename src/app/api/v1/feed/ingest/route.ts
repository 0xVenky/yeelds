import { NextRequest, NextResponse } from "next/server";
import { ingestFeedItems } from "@/lib/feed/store";
import type { FeedItem } from "@/lib/feed/types";

const VALID_TYPES = ["tweet", "article", "substack"] as const;

function validateItem(item: unknown): item is FeedItem {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  if (typeof obj.id !== "string" || !obj.id) return false;
  if (typeof obj.published_at !== "string") return false;
  if (!VALID_TYPES.includes(obj.type as typeof VALID_TYPES[number])) return false;
  return true;
}

export async function POST(request: NextRequest) {
  // Simple API key auth
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.FEED_INGEST_API_KEY;

  if (!expectedKey) {
    return NextResponse.json(
      { error: "Feed ingestion not configured (FEED_INGEST_API_KEY not set)" },
      { status: 503 },
    );
  }

  if (authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: "Body must be an array of feed items" },
      { status: 400 },
    );
  }

  const valid: FeedItem[] = [];
  const invalid: number[] = [];

  for (let i = 0; i < body.length; i++) {
    if (validateItem(body[i])) {
      valid.push(body[i] as FeedItem);
    } else {
      invalid.push(i);
    }
  }

  const result = ingestFeedItems(valid);

  return NextResponse.json({
    accepted: valid.length,
    rejected: invalid.length,
    rejected_indices: invalid.length > 0 ? invalid : undefined,
    added: result.added,
    total: result.total,
  });
}
