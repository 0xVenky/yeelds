import { AssetClassLayout } from "@/components/AssetClassLayout";

export default async function StablesUsdPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AssetClassLayout
      title="USD Stablecoins"
      description="Yield on USDC, USDT, DAI, USDS, and other USD-pegged stablecoins."
      filterParams={{ asset_class: "usd_stable" }}
      searchParams={searchParams}
    />
  );
}
