import { AssetClassLayout } from "@/components/AssetClassLayout";

export default async function StablesEurPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AssetClassLayout
      title="EUR Stablecoins"
      description="Yield on EURC and other EUR-pegged stablecoins."
      filterParams={{ asset_class: "eur_stable" }}
      searchParams={searchParams}
    />
  );
}
