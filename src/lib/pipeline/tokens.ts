import seedData from "../../../docs/seed/tokens.json";

export type TokenSeed = {
  address: string;
  chain: string;
  symbol: string;
  name: string;
  decimals: number;
  asset_class: "usd_stable" | "eur_stable" | "eth_class" | "btc_class" | "rwa";
  is_stablecoin: boolean;
  is_blue_chip: boolean;
  is_lsd: boolean;
  is_wrapped: boolean;
  is_yield_bearing: boolean;
  base_token: string | null;
  peg_target: string | null;
};

// Build lookup map once on module load
// Key: "chain:address" (address lowercased)
const tokenMap = new Map<string, TokenSeed>();

for (const entry of seedData) {
  const token = entry as TokenSeed;
  const key = `${token.chain}:${token.address.toLowerCase()}`;
  tokenMap.set(key, token);
}

export function lookupToken(address: string, chain: string): TokenSeed | null {
  const key = `${chain}:${address.toLowerCase()}`;
  return tokenMap.get(key) ?? null;
}

export function isYieldBearing(address: string, chain: string): boolean {
  return lookupToken(address, chain)?.is_yield_bearing ?? false;
}

export function getAssetClass(address: string, chain: string): string | null {
  return lookupToken(address, chain)?.asset_class ?? null;
}

export function getTokenCount(): number {
  return tokenMap.size;
}
