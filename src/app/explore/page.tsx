import { Suspense } from "react";
import { Header } from "@/components/Header";
import { AssetClassTabs } from "@/components/AssetClassTabs";
import { DiscoveryTabs } from "@/components/DiscoveryTabs";
import { FilterBar } from "@/components/FilterBar";
import { PoolTable } from "@/components/PoolTable";
import { Pagination } from "@/components/Pagination";
import { queryPools, queryStats } from "@/lib/api/query";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") params[k] = v;
  }

  const [pools, stats] = await Promise.all([
    queryPools(params),
    queryStats(),
  ]);

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
