import { NextRequest, NextResponse } from "next/server";
import { ensureDealsPopulated, getDeals } from "@/lib/deals/store";
import { DEAL_SOURCES, DEAL_STATUSES, type DealSource, type DealStatus } from "@/lib/deals/types";
import { SUPPORTED_CHAINS, type SupportedChain } from "@/lib/constants";

export async function GET(request: NextRequest) {
  ensureDealsPopulated();

  let deals = getDeals();
  const params = request.nextUrl.searchParams;

  // Filter by source
  const source = params.get("source");
  if (source && (DEAL_SOURCES as readonly string[]).includes(source)) {
    deals = deals.filter(d => d.source === (source as DealSource));
  }

  // Filter by status
  const status = params.get("status");
  if (status && (DEAL_STATUSES as readonly string[]).includes(status)) {
    deals = deals.filter(d => d.status === (status as DealStatus));
  }

  // Filter by chain
  const chain = params.get("chain");
  if (chain && (SUPPORTED_CHAINS as readonly string[]).includes(chain)) {
    deals = deals.filter(d => d.chains.includes(chain as SupportedChain));
  }

  return NextResponse.json(
    { deals, total: deals.length },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
