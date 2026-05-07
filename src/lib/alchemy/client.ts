// Alchemy ERC-20 + native balance fetcher for Ethereum, Arbitrum, and Base.
//
// Uses raw fetch against Alchemy's JSON-RPC HTTP endpoints — no SDK. One key
// covers all three chains (Alchemy's "Universal" key); per-chain subdomain
// switches the network.
//
// Decision 24 fail-safe pattern: if ALCHEMY_API_KEY is missing we log a
// module-load console.error and let calls return [] per chain, mirroring how
// fetchers/lifi.ts handles a missing LIFI_API_KEY. Never throw at startup —
// the route boots in a clear-degraded state instead of taking down the whole
// chat surface.
//
// Per-chain isolation: each chain is fetched independently and a failure on
// one (RPC error, parse error, network blip) returns an empty token list for
// that chain only — the others still get through.

export type AlchemyChain = "ethereum" | "arbitrum" | "base";

export type TokenBalance = {
  address: string;
  symbol: string;
  balance: string; // hex string from Alchemy, raw on-chain units
  decimals: number;
  balanceFormatted: number; // balance / 10^decimals, JS number for display
};

export type ChainBalances = {
  chain: AlchemyChain;
  address: string;
  tokens: TokenBalance[];
};

const ALCHEMY_HOSTS: Record<AlchemyChain, string> = {
  ethereum: "https://eth-mainnet.g.alchemy.com/v2",
  arbitrum: "https://arb-mainnet.g.alchemy.com/v2",
  base: "https://base-mainnet.g.alchemy.com/v2",
};

if (!process.env.ALCHEMY_API_KEY) {
  console.error(
    "[alchemy] ALCHEMY_API_KEY not set — getTokenBalances will return empty for all chains. " +
      "Set it in .env.local and Vercel env (Alchemy console → Settings → API Key, single key works for all 3 chains).",
  );
}

type AlchemyTokenBalance = {
  contractAddress: string;
  tokenBalance: string | null;
  error?: string | null;
};

type AlchemyTokenBalancesResult = {
  address: string;
  tokenBalances: AlchemyTokenBalance[];
};

type AlchemyTokenMetadata = {
  decimals: number | null;
  logo: string | null;
  name: string | null;
  symbol: string | null;
};

type RpcResponse<T> = {
  jsonrpc: "2.0";
  id: number | string;
  result?: T;
  error?: { code: number; message: string };
};

async function rpcCall<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) {
    throw new Error(`Alchemy ${method} HTTP ${res.status}`);
  }
  const json = (await res.json()) as RpcResponse<T>;
  if (json.error) {
    throw new Error(`Alchemy ${method} RPC error: ${json.error.message}`);
  }
  if (json.result === undefined) {
    throw new Error(`Alchemy ${method} returned no result`);
  }
  return json.result;
}

const ZERO = BigInt(0);
const TEN = BigInt(10);

function hexToBigInt(hex: string): bigint {
  if (!hex || hex === "0x" || hex === "0x0") return ZERO;
  return BigInt(hex);
}

function formatBalance(rawHex: string, decimals: number): number {
  const raw = hexToBigInt(rawHex);
  if (raw === ZERO) return 0;
  // For display we want a JS number — this loses precision on extremely large
  // balances, but the chat tools only use this for sorting + comparison and
  // the raw `balance` hex string is preserved for callers that need precision.
  const divisor = TEN ** BigInt(decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  // Reconstruct as floating-point. Acceptable lossiness for display-only.
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 8);
  return Number(`${whole}.${fracStr || "0"}`);
}

async function fetchChainTokenBalances(
  url: string,
  address: string,
): Promise<{ contractAddress: string; balance: string }[]> {
  // alchemy_getTokenBalances returns up to 100 ERC-20 balances by default.
  // The "erc20" type filter narrows to top tokens with non-zero balances.
  const result = await rpcCall<AlchemyTokenBalancesResult>(
    url,
    "alchemy_getTokenBalances",
    [address, "erc20"],
  );
  return (result.tokenBalances ?? [])
    .filter(
      (tb) =>
        !tb.error &&
        tb.tokenBalance !== null &&
        tb.tokenBalance !== "0x0" &&
        hexToBigInt(tb.tokenBalance) > ZERO,
    )
    .map((tb) => ({
      contractAddress: tb.contractAddress,
      balance: tb.tokenBalance!,
    }));
}

async function fetchTokenMetadata(
  url: string,
  contractAddress: string,
): Promise<AlchemyTokenMetadata | null> {
  try {
    return await rpcCall<AlchemyTokenMetadata>(url, "alchemy_getTokenMetadata", [
      contractAddress,
    ]);
  } catch (err) {
    console.warn(
      `[alchemy] getTokenMetadata failed for ${contractAddress}: ${(err as Error).message}`,
    );
    return null;
  }
}

async function getChainBalances(
  chain: AlchemyChain,
  address: string,
): Promise<ChainBalances> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    return { chain, address, tokens: [] };
  }
  const url = `${ALCHEMY_HOSTS[chain]}/${apiKey}`;

  try {
    const rawBalances = await fetchChainTokenBalances(url, address);
    if (rawBalances.length === 0) {
      return { chain, address, tokens: [] };
    }

    // Resolve metadata in parallel — Alchemy rate-limits at 25-30 RPS on free tier
    // and these are independent calls. The list is already filtered to non-zero
    // balances, so the cost is bounded by what the wallet actually holds.
    const metadataResults = await Promise.allSettled(
      rawBalances.map((b) => fetchTokenMetadata(url, b.contractAddress)),
    );

    const tokens: TokenBalance[] = [];
    for (let i = 0; i < rawBalances.length; i++) {
      const raw = rawBalances[i];
      const metadataResult = metadataResults[i];
      if (metadataResult.status !== "fulfilled" || !metadataResult.value) continue;
      const meta = metadataResult.value;
      // Drop tokens with no metadata — without symbol or decimals the row is
      // useless to the model and a likely scam token.
      if (!meta.symbol || meta.decimals === null) continue;
      tokens.push({
        address: raw.contractAddress,
        symbol: meta.symbol,
        balance: raw.balance,
        decimals: meta.decimals,
        balanceFormatted: formatBalance(raw.balance, meta.decimals),
      });
    }
    return { chain, address, tokens };
  } catch (err) {
    // Per-chain error isolation: log and return empty for this chain only.
    console.warn(
      `[alchemy] ${chain} balance fetch failed: ${(err as Error).message}`,
    );
    return { chain, address, tokens: [] };
  }
}

/**
 * Fetch ERC-20 token balances for a single wallet address across the requested
 * chains. Tokens with zero balances or missing metadata are filtered out.
 *
 * Errors on one chain do not propagate — that chain returns an empty `tokens`
 * array while the others still resolve.
 */
export async function getTokenBalances(
  address: string,
  chains: AlchemyChain[],
): Promise<ChainBalances[]> {
  const results = await Promise.all(
    chains.map((chain) => getChainBalances(chain, address)),
  );
  return results;
}
