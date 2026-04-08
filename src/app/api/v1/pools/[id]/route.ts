import { NextResponse, type NextRequest } from "next/server";
import { ensureCachePopulated, getCachedPools, getMorphoVaultData, getUpshiftVaultData } from "@/lib/pipeline/cache";
import type { PoolDetail } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureCachePopulated();
  const { id } = await params;
  const pool = getCachedPools().find(p => p.id === id);

  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  // Extend with detail fields (empty/null for Phase 1)
  const detail: PoolDetail = {
    ...pool,
    incentive_campaigns: [], // populated in Phase 3
    risk_detail: {
      contract_age_days: pool.risk.contract_age_days,
      contract_address: null,
      is_verified: pool.risk.is_verified,
      is_audited: pool.risk.is_audited,
      audit_firms: null,
      top_lp_concentration: pool.risk.top_lp_concentration,
      pool_age_days: null,
      has_admin_key: null,
      underlying_depeg_risk: pool.risk.underlying_depeg_risk,
      notes: null,
    },
    morpho_vault: getMorphoVaultData(pool.id),
    upshift_vault: getUpshiftVaultData(pool.id),
  };

  return NextResponse.json(detail);
}
