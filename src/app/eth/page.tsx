import { AssetClassLayout } from "@/components/AssetClassLayout";

export default async function EthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AssetClassLayout
      title="ETH & Liquid Staking"
      description="Yield on ETH, stETH, rETH, cbETH, and other ETH derivatives."
      filterParams={{ asset_class: "eth_class" }}
      searchParams={searchParams}
    />
  );
}
