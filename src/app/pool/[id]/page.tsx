import Link from "next/link";
import { notFound } from "next/navigation";
import { formatProtocolName, formatTvl, formatApr, computeOrganicRatio } from "@/lib/utils";
import { YieldCard } from "@/components/pool-detail/YieldCard";
import { RiskCard } from "@/components/pool-detail/RiskCard";
import { ExposureCard } from "@/components/pool-detail/ExposureCard";
import { SimulationCard } from "@/components/pool-detail/SimulationCard";
import { CampaignList } from "@/components/pool-detail/CampaignList";
import { VaultAllocationCard } from "@/components/pool-detail/VaultAllocationCard";
import { VaultInfoCard } from "@/components/pool-detail/VaultInfoCard";
import { ChainBadge } from "@/components/ChainDot";
import { ProtocolLogo } from "@/components/ProtocolLogo";
import { queryPoolById } from "@/lib/api/query";

export default async function PoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pool = await queryPoolById(id);

  if (!pool) {
    notFound();
  }

  const organicRatio = computeOrganicRatio(
    pool.yield.apr_base,
    pool.yield.apr_reward,
    pool.yield.apr_total,
  );

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-6 sm:px-8 py-8">
      {/* Back nav */}
      <Link
        href="/explore"
        className="inline-flex items-center text-sm font-medium transition-colors mb-6 hover:opacity-80"
        style={{ color: "var(--primary)" }}
      >
        &larr; Back to vaults
      </Link>

      {/* Centered hero */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-1">
          <ProtocolLogo protocol={pool.protocol} symbol={pool.symbol} size={36} />
          <h1
            className="text-3xl font-extrabold font-[family-name:var(--font-manrope)] tracking-tight"
            style={{ color: "var(--on-surface)" }}
          >
            {formatProtocolName(pool.protocol)}
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
          {pool.symbol}
        </p>
        <div
          className="flex items-center justify-center gap-3 mt-3 flex-wrap"
          style={{ color: "var(--outline)" }}
        >
          <ChainBadge
            chain={pool.chain}
            className="px-3 py-0.5"
            style={{
              backgroundColor: "var(--secondary-container)",
              color: "var(--on-secondary-container)",
            }}
          />
          <span className="text-sm font-semibold" style={{ color: "var(--secondary)" }}>
            {formatApr(pool.yield.apr_total)} APY
          </span>
          <span className="text-sm">{formatTvl(pool.tvl_usd)} TVL</span>
          {organicRatio !== null && (
            <span className="text-xs">{organicRatio}% organic</span>
          )}
        </div>

        {/* Deposit CTA */}
        <div className="flex justify-center mt-6">
          {pool.protocol_url ? (
            <a
              href={pool.protocol_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-8 py-4 text-base font-bold text-white transition-all shadow-lg shadow-purple-500/20 hover:opacity-90 inline-flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #630ed4, #7c3aed)" }}
            >
              Deposit on {formatProtocolName(pool.protocol)}
              <span aria-hidden="true">&rarr;</span>
            </a>
          ) : (
            <button
              disabled
              className="rounded-full px-8 py-4 text-base font-medium cursor-not-allowed"
              style={{ backgroundColor: "var(--surface-container-high)", color: "var(--outline)" }}
            >
              Link unavailable
            </button>
          )}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <YieldCard pool={pool} />
        <RiskCard risk={pool.risk_detail} />
      </div>
      <div className="space-y-5">
        <ExposureCard pool={pool} />
        {pool.morpho_vault && (
          <VaultAllocationCard data={pool.morpho_vault} />
        )}
        {pool.upshift_vault && (
          <VaultInfoCard data={pool.upshift_vault} />
        )}
        <SimulationCard pool={pool} />
        <CampaignList campaigns={pool.incentive_campaigns} />
      </div>
    </div>
  );
}
