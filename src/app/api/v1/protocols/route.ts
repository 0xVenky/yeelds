import { NextRequest, NextResponse } from "next/server";
import { queryProtocols } from "@/lib/api/query";
import { SUPPORTED_CHAINS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { protocols } = await queryProtocols();
  const params = request.nextUrl.searchParams;

  let filtered = protocols;

  // Filter by chain — only include protocols that have pools on this chain
  const chain = params.get("chain");
  if (chain && (SUPPORTED_CHAINS as readonly string[]).includes(chain)) {
    filtered = filtered.filter(p => p.chains.includes(chain));
  }

  // Filter by asset class — only include protocols that have pools in this class
  const assetClass = params.get("asset_class");
  if (assetClass) {
    filtered = filtered.filter(p => p.asset_classes.includes(assetClass));
  }

  // Search by protocol name
  const search = params.get("search");
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  }

  return NextResponse.json(
    { protocols: filtered, total: filtered.length },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
