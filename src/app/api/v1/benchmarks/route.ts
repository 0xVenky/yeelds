import { NextResponse } from "next/server";
import { ensureCachePopulated, getCachedBenchmarks, getLastRefreshed } from "@/lib/pipeline/cache";
import type { BenchmarksResponse } from "@/lib/types";

export async function GET() {
  await ensureCachePopulated();

  const response: BenchmarksResponse = {
    benchmarks: getCachedBenchmarks(),
    last_refreshed: getLastRefreshed()?.toISOString() ?? null,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
