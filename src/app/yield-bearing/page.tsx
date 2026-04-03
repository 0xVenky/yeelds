import { AssetClassLayout } from "@/components/AssetClassLayout";

export default async function YieldBearingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AssetClassLayout
      title="Yield-Bearing Tokens"
      description="Pools containing tokens that earn yield just by holding them."
      filterParams={{ yield_bearing: "true" }}
      searchParams={searchParams}
    />
  );
}
