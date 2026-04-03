import { Suspense } from "react";
import { AssetClassTabs } from "@/components/AssetClassTabs";
import { DiscoveryTabs } from "@/components/DiscoveryTabs";
import { FilterBar } from "@/components/FilterBar";
import { PoolTable } from "@/components/PoolTable";
import { Pagination } from "@/components/Pagination";
import { IncentivesToggle } from "@/components/IncentivesToggle";
import { formatTvl } from "@/lib/utils";
import { queryPools } from "@/lib/api/query";

type AssetClassLayoutProps = {
  title: string;
  description: string;
  filterParams: Record<string, string>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function AssetClassLayout({
  title,
  description,
  filterParams,
  searchParams,
}: AssetClassLayoutProps) {
  const raw = await searchParams;

  // Merge user params with locked asset-class params (locked params win)
  const params: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") params[k] = v;
  }
  for (const [k, v] of Object.entries(filterParams)) {
    params[k] = v;
  }

  const pools = await queryPools(params);

  return (
    <div className="flex-1 flex flex-col">
      {/* Asset class header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-zinc-800/50">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{title}</h1>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-zinc-500">
          <span>{pools.pagination.total} pools</span>
          <span aria-hidden="true">&middot;</span>
          <span>
            {formatTvl(
              pools.data.reduce((sum, p) => sum + p.tvl_usd, 0),
            )}{" "}
            TVL
          </span>
          <Suspense>
            <IncentivesToggle />
          </Suspense>
        </div>
      </div>

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
