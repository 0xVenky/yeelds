import { AssetClassLayout } from "@/components/AssetClassLayout";

export default async function StablesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AssetClassLayout
      title="Stablecoins"
      description="USD and EUR stablecoin yield opportunities across all protocols."
      filterParams={{ asset_class: "stablecoin" }}
      searchParams={searchParams}
    />
  );
}
