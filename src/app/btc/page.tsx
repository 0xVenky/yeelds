import { AssetClassLayout } from "@/components/AssetClassLayout";

export default async function BtcPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AssetClassLayout
      title="Bitcoin"
      description="Yield on WBTC, cbBTC, tBTC, and other BTC derivatives."
      filterParams={{ asset_class: "btc_class" }}
      searchParams={searchParams}
    />
  );
}
