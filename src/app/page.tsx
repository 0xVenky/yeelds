import { Suspense } from "react";
import { Header } from "@/components/Header";
import { AssetClassTabs } from "@/components/AssetClassTabs";
import { DiscoveryTabs } from "@/components/DiscoveryTabs";
import { FilterBar } from "@/components/FilterBar";
import { PoolTable } from "@/components/PoolTable";
import { Pagination } from "@/components/Pagination";
import type { PaginatedResponse, PoolListItem, StatsResponse } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const queryString = new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
      if (typeof v === "string") acc[k] = v;
      return acc;
    }, {}),
  ).toString();

  const [poolsRes, statsRes] = await Promise.all([
    fetch(`${BASE_URL}/api/v1/pools${queryString ? `?${queryString}` : ""}`, {
      cache: "no-store",
    }),
    fetch(`${BASE_URL}/api/v1/stats`, { cache: "no-store" }),
  ]);

  const pools: PaginatedResponse<PoolListItem> = await poolsRes.json();
  const stats: StatsResponse = await statsRes.json();

  return (
    <div className="flex-1 flex flex-col">
      <Header stats={stats} />
      <Suspense>
        <AssetClassTabs />
      </Suspense>
      <Suspense>
        <DiscoveryTabs />
      </Suspense>
      <Suspense>
        <FilterBar />
      </Suspense>
      <div className="flex-1">
        <PoolTable data={pools} />
      </div>
      <Pagination
        page={pools.pagination.page}
        totalPages={pools.pagination.total_pages}
        total={pools.pagination.total}
      />
    </div>
  );
}
