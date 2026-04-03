import { AssetClassLayout } from "@/components/AssetClassLayout";

export default async function RwaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AssetClassLayout
      title="Real World Assets"
      description="Yield backed by treasuries, bonds, and real-world lending."
      filterParams={{ yield_source: "rwa_yield" }}
      searchParams={searchParams}
    />
  );
}
