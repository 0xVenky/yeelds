import { getTokenBalances, type AlchemyChain } from "@/lib/alchemy/client";

const DEFAULT_CHAINS: AlchemyChain[] = ["ethereum", "arbitrum", "base"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return Response.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const balances = await getTokenBalances(address, DEFAULT_CHAINS);
    return Response.json({ balances });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Balance fetch failed";
    console.error("[balances] Error:", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
