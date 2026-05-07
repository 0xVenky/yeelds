// LI.FI Earn portfolio fetcher.
//
// Yeelds' main LI.FI integration lives in src/lib/pipeline/fetchers/lifi.ts —
// that fetcher is owned by the cache pipeline and only handles the vault
// catalog. Portfolio (per-wallet positions) is a separate read path used by
// the chat route's `get_wallet_defi_positions` tool, so it gets its own thin
// client here. Mirrors lyfi/src/lib/lifi/client.ts so the route is a verbatim
// port.
//
// LIFI_API_KEY: required server-side under v2 API. Reuses the same key as the
// pipeline fetcher; no separate provisioning.

import { z } from "zod";
import { LIFI_EARN_BASE_URL } from "@/lib/constants";

const BASE_URL = process.env.LIFI_EARN_URL ?? LIFI_EARN_BASE_URL;

export const LifiPositionSchema = z.object({
  chainId: z.number(),
  protocolName: z.string(),
  asset: z.object({
    address: z.string(),
    name: z.string(),
    symbol: z.string(),
    decimals: z.number(),
  }),
  balanceUsd: z.string(),
  balanceNative: z.string(),
});

export type LifiPosition = z.infer<typeof LifiPositionSchema>;

export const LifiPortfolioResponseSchema = z.object({
  positions: z.array(LifiPositionSchema),
});

async function fetchJson(url: string): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.LIFI_API_KEY) {
    headers["x-lifi-api-key"] = process.env.LIFI_API_KEY;
  }
  const res = await fetch(url, {
    headers,
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`LI.FI API ${res.status}: ${url}`);
  }
  return res.json();
}

/**
 * Fetch portfolio positions for a wallet address.
 * Endpoint: GET /v1/earn/portfolio/{address}/positions
 */
export async function fetchPortfolio(address: string): Promise<LifiPosition[]> {
  try {
    const raw = await fetchJson(
      `${BASE_URL}/v1/earn/portfolio/${address}/positions`,
    );
    const parsed = LifiPortfolioResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(
        "[lifi] Portfolio validation failed:",
        parsed.error.issues.slice(0, 3),
      );
      return [];
    }
    return parsed.data.positions;
  } catch (err) {
    console.error("[lifi] Failed to fetch portfolio:", err);
    return [];
  }
}
