// Alchemy ERC-20 + native ETH balance fetcher for Ethereum, Arbitrum, and Base.
//
// Uses raw fetch against Alchemy's JSON-RPC HTTP endpoints — no SDK. One key
// covers all three chains (Alchemy's "Universal" key); per-chain subdomain
// switches the network.
//
// Two upstream calls per chain, fanned out in parallel (`Promise.allSettled`):
//   - `alchemy_getTokenBalances` for ERC-20 balances → metadata resolved via
//     `alchemy_getTokenMetadata`, then filtered through the curated
//     `tokens.json` allowlist (`lookupToken`) plus a symbol-shape regex.
//   - `eth_getBalance` for the wallet's native ETH balance. If non-zero, a
//     synthetic row with the canonical zero-address sentinel
//     (`0x000…000`) and `symbol: "ETH"` is prepended to `tokens[]`. All
//     three supported chains (Ethereum / Arbitrum / Base) use ETH as their
//     native gas token, so no per-chain symbol switch is required.
//
// Decision 24 fail-safe pattern: if ALCHEMY_API_KEY is missing we log a
// module-load console.error and let calls return [] per chain, mirroring how
// fetchers/lifi.ts handles a missing LIFI_API_KEY. Never throw at startup —
// the route boots in a clear-degraded state instead of taking down the whole
// chat surface.
//
// Per-chain isolation: each chain is fetched independently and a failure on
// one (RPC error, parse error, network blip) returns an empty token list for
// that chain only — the others still get through. Native and ERC-20 fetches
// are independently isolated within a chain via `Promise.allSettled`, so a
// failure on one path does not poison the other.
//
// Allowlist + prompt-injection defense: ERC-20 metadata flows through the
// `tokens.json` allowlist before reaching the chat tool result. Anything not
// in the curated 94-entry seed is silently dropped so airdrop-spam tokens
// (e.g. "VISIT-claim.com", "IGNORE PRIOR INSTRUCTIONS") never enter the
// model's context. A symbol-shape regex backstops the allowlist in case the
// seed is ever poisoned. Native ETH is exempt — it's a chain-level concept
// with no `tokens.json` entry, so it's prepended AFTER the filter.
//
// Pagination limitation (chat-review-fixes.md B12):
// `alchemy_getTokenBalances` returns up to 100 ERC-20s per call. We log a
// warning when the response is exactly 100 (likely truncated) but do not
// paginate — the allowlist filter mitigates noise, and seasoned wallets with
// >100 legitimate tokens past the truncation boundary are an edge case we
// defer until we see real demand.

import { lookupToken } from "@/lib/pipeline/tokens";

export type AlchemyChain = "ethereum" | "arbitrum" | "base";

// Canonical zero-address sentinel for native gas tokens. Mirrors the convention
// used by aggregators (LI.FI, 1inch, Paraswap) so callers can treat native and
// ERC-20 rows uniformly.
const NATIVE_ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
// Belt-and-suspenders symbol shape check applied to allowlisted tokens — guards
// against future seed corruption or hostile metadata that survived the
// allowlist (e.g. an attacker pushing a PR that adds a row with a malicious
// symbol). Mirrors the chat-tools defense-in-depth pattern.
const SAFE_SYMBOL_RE = /^[A-Za-z0-9_.\-]{1,16}$/;

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

// Per-call upstream timeout (chat-review-fixes.md B6). 8s is generous on
// Alchemy's free-tier ERC-20 paths and bounded enough that a single slow
// host doesn't drag the whole tool round to Vercel's 60s ceiling. The
// existing per-path `Promise.allSettled` (ERC-20 vs native, and the
// per-chain isolation in `getTokenBalances`) handles the resulting abort
// without poisoning sibling calls.
const ALCHEMY_FETCH_TIMEOUT_MS = 8000;

async function rpcCall<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(ALCHEMY_FETCH_TIMEOUT_MS),
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
  chain: AlchemyChain,
  address: string,
): Promise<{ contractAddress: string; balance: string }[]> {
  // alchemy_getTokenBalances returns up to 100 ERC-20 balances by default.
  // The "erc20" type filter narrows to top tokens with non-zero balances.
  const result = await rpcCall<AlchemyTokenBalancesResult>(
    url,
    "alchemy_getTokenBalances",
    [address, "erc20"],
  );
  const rawList = result.tokenBalances ?? [];
  // B12: surface likely truncation. Exactly 100 is the documented page size,
  // so an exact-100 response very probably has more behind it. The allowlist
  // filter mitigates the noise but legitimate-token loss past position 100
  // is possible — log so we can spot it in production traces if it matters.
  if (rawList.length === 100) {
    console.warn(
      `[alchemy] ${chain} returned exactly 100 tokens — likely truncated; allowlist filter mitigates but pagination not implemented`,
    );
  }
  return rawList
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

/**
 * Fetch the wallet's native ETH balance via JSON-RPC `eth_getBalance`. Returns
 * the raw hex string (preserves precision; callers convert as needed) and the
 * derived bigint. Errors propagate — caller is responsible for isolating them
 * from the ERC-20 path via `Promise.allSettled`.
 */
async function fetchNativeBalance(
  url: string,
  address: string,
): Promise<{ rawHex: string; value: bigint }> {
  const rawHex = await rpcCall<string>(url, "eth_getBalance", [
    address,
    "latest",
  ]);
  return { rawHex, value: hexToBigInt(rawHex) };
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

// Hand-rolled semaphore (chat-review-fixes.md B13). With the A3 allowlist
// filter the realistic post-allowlist token list is bounded to ~94, but a
// single seasoned wallet still fans out enough metadata calls to hit
// Alchemy's free-tier RPS cap (~25-30 RPS). Cap at 10 concurrent calls per
// chain — sequential enough to stay under the cap, parallel enough that the
// total wall time stays bounded by ceil(N/10) × ~150ms.
function createSemaphore(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return async function acquire<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      active--;
      const next = queue.shift();
      if (next) next();
    }
  };
}

const METADATA_CONCURRENCY = 10;

async function getChainBalances(
  chain: AlchemyChain,
  address: string,
): Promise<ChainBalances> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    return { chain, address, tokens: [] };
  }
  const url = `${ALCHEMY_HOSTS[chain]}/${apiKey}`;

  // Fan out ERC-20 and native ETH fetches in parallel. `Promise.allSettled`
  // ensures a failure on one path does not poison the other — e.g., if the
  // ERC-20 call fails we still surface native ETH (and vice-versa).
  const [erc20Settled, nativeSettled] = await Promise.allSettled([
    fetchChainTokenBalances(url, chain, address),
    fetchNativeBalance(url, address),
  ]);

  const tokens: TokenBalance[] = [];

  // --- ERC-20 path ---
  if (erc20Settled.status === "fulfilled") {
    const rawBalances = erc20Settled.value;
    if (rawBalances.length > 0) {
      try {
        // Resolve metadata in parallel, but capped at METADATA_CONCURRENCY per
        // chain (B13). Alchemy's free tier rate-limits at 25-30 RPS, and a
        // seasoned wallet × 3 chains can otherwise fan out enough simultaneous
        // calls to trip it. The list is already filtered to non-zero balances
        // and the allowlist is the deeper filter, so cost stays bounded.
        const acquire = createSemaphore(METADATA_CONCURRENCY);
        const metadataResults = await Promise.allSettled(
          rawBalances.map((b) =>
            acquire(() => fetchTokenMetadata(url, b.contractAddress)),
          ),
        );

        for (let i = 0; i < rawBalances.length; i++) {
          const raw = rawBalances[i];
          const metadataResult = metadataResults[i];
          if (metadataResult.status !== "fulfilled" || !metadataResult.value) {
            continue;
          }
          const meta = metadataResult.value;
          // Drop tokens with no metadata — without symbol or decimals the row is
          // useless to the model and a likely scam token.
          if (!meta.symbol || meta.decimals === null) continue;

          // Allowlist gate: only tokens present in the curated `tokens.json`
          // seed flow through. Defends the chat surface against airdrop-spam
          // names that double as prompt-injection payloads.
          if (!lookupToken(raw.contractAddress, chain)) continue;

          // Belt-and-suspenders: even allowlisted tokens must clear a symbol
          // shape check. Defends against future seed corruption.
          if (!SAFE_SYMBOL_RE.test(meta.symbol)) continue;

          tokens.push({
            address: raw.contractAddress,
            symbol: meta.symbol,
            balance: raw.balance,
            decimals: meta.decimals,
            balanceFormatted: formatBalance(raw.balance, meta.decimals),
          });
        }
      } catch (err) {
        // Metadata-stage error: log but don't poison native-ETH path.
        console.warn(
          `[alchemy] ${chain} metadata stage failed: ${(err as Error).message}`,
        );
      }
    }
  } else {
    console.warn(
      `[alchemy] ${chain} ERC-20 fetch failed: ${erc20Settled.reason instanceof Error ? erc20Settled.reason.message : String(erc20Settled.reason)}`,
    );
  }

  // --- Native ETH path ---
  // Prepended AFTER the allowlist filter — native ETH has no `tokens.json`
  // entry but is always trusted (chain-level concept). Skip if the value is
  // zero so we don't pollute the row list with empty natives.
  if (nativeSettled.status === "fulfilled") {
    const { rawHex, value } = nativeSettled.value;
    if (value > ZERO) {
      tokens.unshift({
        address: NATIVE_ETH_ADDRESS,
        symbol: "ETH",
        balance: rawHex,
        decimals: 18,
        balanceFormatted: formatBalance(rawHex, 18),
      });
    }
  } else {
    console.warn(
      `[alchemy] ${chain} native ETH fetch failed: ${nativeSettled.reason instanceof Error ? nativeSettled.reason.message : String(nativeSettled.reason)}`,
    );
  }

  return { chain, address, tokens };
}

/**
 * Fetch ERC-20 + native ETH balances for a single wallet address across the
 * requested chains.
 *
 * - Native ETH (when held) is returned as a synthetic row with the canonical
 *   zero-address (`0x000…000`), `symbol: "ETH"`, `decimals: 18`, and is
 *   prepended ahead of the ERC-20 entries.
 * - ERC-20 entries are filtered through the curated `tokens.json` allowlist
 *   plus a symbol-shape regex (defense against airdrop-spam / prompt-injection
 *   tokens). Anything outside the allowlist is silently dropped.
 * - Tokens with zero balances or missing metadata are filtered out.
 *
 * Errors on one chain do not propagate — that chain returns an empty `tokens`
 * array while the others still resolve. Within a chain, native and ERC-20
 * fetches are independently isolated, so a failure on one path does not
 * poison the other.
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
