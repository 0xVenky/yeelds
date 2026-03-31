import Link from "next/link";
import { notFound } from "next/navigation";
import type { PoolDetail } from "@/lib/types";
import { formatProtocolName, formatPoolType, formatTvl } from "@/lib/utils";
import { YieldCard } from "@/components/pool-detail/YieldCard";
import { RiskCard } from "@/components/pool-detail/RiskCard";
import { ExposureCard } from "@/components/pool-detail/ExposureCard";
import { SimulationCard } from "@/components/pool-detail/SimulationCard";
import { CampaignList } from "@/components/pool-detail/CampaignList";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

function chainLabel(chain: string): string {
  return chain.charAt(0).toUpperCase() + chain.slice(1);
}

export default async function PoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await fetch(`${BASE_URL}/api/v1/pools/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    notFound();
  }

  const pool: PoolDetail = await res.json();

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-6">
      {/* Back nav */}
      <Link
        href="/"
        className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        &larr; Back to pools
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {formatProtocolName(pool.protocol)}{" "}
            <span className="text-zinc-400 font-normal">{pool.symbol}</span>
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-zinc-500">
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
              {chainLabel(pool.chain)}
            </span>
            <span>{formatPoolType(pool.pool_type)}</span>
            <span>{formatTvl(pool.tvl_usd)} TVL</span>
          </div>
        </div>
        {pool.protocol_url ? (
          <a
            href={pool.protocol_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Deposit on {formatProtocolName(pool.protocol)} &rarr;
          </a>
        ) : (
          <button
            disabled
            className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-500 cursor-not-allowed"
          >
            Link unavailable
          </button>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <YieldCard pool={pool} />
        <RiskCard risk={pool.risk_detail} />
      </div>
      <div className="space-y-4">
        <ExposureCard pool={pool} />
        <SimulationCard pool={pool} />
        <CampaignList campaigns={pool.incentive_campaigns} />
      </div>
    </main>
  );
}
