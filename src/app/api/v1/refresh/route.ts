import { NextResponse } from "next/server";
import { refreshCache } from "@/lib/pipeline/cache";

// POST /api/v1/refresh — dev only, triggers a cache refresh
export async function POST() {
  const result = await refreshCache();
  return NextResponse.json(result);
}
