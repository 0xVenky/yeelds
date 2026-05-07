// Chat tools — 6 executors that bridge Claude tool calls to the Yeelds cache,
// Alchemy, and the LI.FI portfolio wrapper.
//
// Tool output discipline (chatbot.md risk #1): summary tools return slim row
// shapes — full PoolListItem records explode to ~30KB+ per tool round and
// blow the context budget after 2-3 rounds. Only get_vault_details returns
// the full record. Aim < 5KB per slim search/compare call.
//
// Defense-in-depth: every executor that takes an address re-validates the
// 0x[40hex] regex inside the executor. Don't trust the input_schema alone —
// the model can ignore schemas, and the route handler's regex check covers
// only `connectedAddress`, not tool args.

import type Anthropic from "@anthropic-ai/sdk";
import {
  ensureCachePopulated,
  getCachedPools,
  getCacheStatus,
  type CacheStatus,
} from "@/lib/pipeline/cache";
import type { PoolListItem } from "@/lib/types";
import { CHAT_ASSET_CLASSES, type SupportedChain } from "@/lib/constants";
import { getTokenBalances, type AlchemyChain } from "@/lib/alchemy/client";
import { fetchPortfolio, type LifiPosition } from "@/lib/lifi/client";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SUPPORTED_CHAINS = ["ethereum", "arbitrum", "base"] as const;
const DEPEG_RISKS = ["known-safe", "caution", "high-risk"] as const;

// Slim row shape for search_vaults / compare_vaults / find_yields_for_holdings.
// This is the contract Mario reports in the completion handoff — keep these
// fields stable so the model's prompt-budgeting stays predictable.
//
// Naming note: keys read `apy_*` per Decision 21 (LI.FI returns APY natively).
// The right-hand-side `pool.yield.apr_*` reads remain unchanged — that's the
// underlying data model, separately Decision-pending to rename.
export type SearchVaultRow = {
  vault_address: string;
  chain: string;
  protocol_name: string;
  asset_symbols: string[];
  apy_total: number;
  apy_base: number | null;
  apy_reward: number | null;
  tvl_usd: number;
  asset_class: string | null;
  contract_age_days: number | null;
  depeg_risk: string | null;
};

// === Tool definitions ===
// Schemas mirror docs/plans/chatbot.md § "Tool definitions" exactly. Don't
// drift — the model has been prompt-tested against these shapes.

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "search_vaults",
    description:
      "Search the Yeelds vault catalog. Returns up to 20 results sorted by APY descending.",
    input_schema: {
      type: "object" as const,
      properties: {
        asset_symbol: {
          type: "string",
          description: "Token symbol, e.g. USDC, ETH, WBTC",
        },
        asset_class: {
          type: "string",
          enum: [...CHAT_ASSET_CLASSES],
        },
        chain: {
          type: "string",
          enum: [...SUPPORTED_CHAINS],
        },
        min_apy: {
          type: "number",
          description: "Minimum APY as percent, e.g. 5 = 5%",
        },
        max_depeg_risk: {
          type: "string",
          enum: [...DEPEG_RISKS],
        },
        min_contract_age_days: { type: "number" },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          default: 10,
        },
      },
    },
  },
  {
    name: "get_vault_details",
    description:
      "Get full details for one vault by its contract address or Yeelds ID. Includes APY breakdown (base + reward), TVL, risk signals, asset class, and protocol metadata.",
    input_schema: {
      type: "object" as const,
      properties: {
        vault_address: {
          type: "string",
          description: "0x-prefixed vault contract address",
        },
        chain: {
          type: "string",
          enum: [...SUPPORTED_CHAINS],
        },
      },
      required: ["vault_address", "chain"],
    },
  },
  {
    name: "compare_vaults",
    description:
      "Compare 2 to 4 vaults side by side on APY, TVL, risk signals, and protocol.",
    input_schema: {
      type: "object" as const,
      properties: {
        vaults: {
          type: "array",
          items: {
            type: "object",
            properties: {
              vault_address: { type: "string" },
              chain: {
                type: "string",
                enum: [...SUPPORTED_CHAINS],
              },
            },
            required: ["vault_address", "chain"],
          },
          minItems: 2,
          maxItems: 4,
        },
      },
      required: ["vaults"],
    },
  },
  {
    name: "get_wallet_holdings",
    description:
      "Fetch ERC-20 and native ETH token balances on Ethereum, Arbitrum, and Base. Returns tokens with non-zero balance, native ETH first if held.",
    input_schema: {
      type: "object" as const,
      properties: {
        address: {
          type: "string",
          description: "0x-prefixed 40-char wallet address",
          pattern: "^0x[a-fA-F0-9]{40}$",
        },
        chains: {
          type: "array",
          items: { type: "string", enum: [...SUPPORTED_CHAINS] },
          description: "Subset of chains to check; defaults to all three",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "find_yields_for_holdings",
    description:
      "Given a wallet address, find the highest-APY vaults in the Yeelds catalog that accept the assets the wallet holds. Combines wallet token balances with vault matching.",
    input_schema: {
      type: "object" as const,
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "get_wallet_defi_positions",
    description:
      "Fetch the wallet's current DeFi vault positions from LI.FI Earn (covers vaults in the Yeelds catalog).",
    input_schema: {
      type: "object" as const,
      properties: {
        address: {
          type: "string",
          pattern: "^0x[a-fA-F0-9]{40}$",
        },
      },
      required: ["address"],
    },
  },
];

// === Helpers ===

function toSlimRow(pool: PoolListItem): SearchVaultRow {
  return {
    vault_address: pool.vault_address,
    chain: pool.chain,
    protocol_name: pool.protocol,
    asset_symbols: pool.exposure.underlying_tokens.map((t) => t.symbol),
    apy_total: pool.yield.apr_total,
    apy_base: pool.yield.apr_base,
    apy_reward: pool.yield.apr_reward,
    tvl_usd: pool.tvl_usd,
    asset_class: pool.exposure.asset_class,
    contract_age_days: pool.risk.contract_age_days,
    depeg_risk: pool.risk.underlying_depeg_risk,
  };
}

function findPoolByAddress(
  address: string,
  chain: string,
): PoolListItem | undefined {
  const lower = address.toLowerCase();
  return getCachedPools().find(
    (p) =>
      p.chain === chain &&
      p.vault_address.toLowerCase() === lower,
  );
}

function isAddressValid(address: unknown): address is string {
  return typeof address === "string" && ADDRESS_RE.test(address);
}

function isSupportedChain(chain: unknown): chain is SupportedChain {
  return (
    typeof chain === "string" &&
    (SUPPORTED_CHAINS as readonly string[]).includes(chain)
  );
}

// === Executors ===

type SearchVaultsInput = {
  asset_symbol?: string;
  asset_class?: string;
  chain?: string;
  min_apy?: number;
  max_depeg_risk?: string;
  min_contract_age_days?: number;
  limit?: number;
};

const DEPEG_RANK: Record<string, number> = {
  "known-safe": 0,
  caution: 1,
  "high-risk": 2,
};

async function execSearchVaults(
  input: SearchVaultsInput,
): Promise<{ vaults: SearchVaultRow[]; cache_status: CacheStatus }> {
  await ensureCachePopulated();
  const cache_status = getCacheStatus();
  let pools = getCachedPools();

  if (input.chain) {
    pools = pools.filter((p) => p.chain === input.chain);
  }
  if (input.asset_symbol) {
    const sym = input.asset_symbol.toUpperCase();
    pools = pools.filter((p) =>
      p.exposure.underlying_tokens.some(
        (t) => t.symbol.toUpperCase() === sym,
      ),
    );
  }
  if (input.asset_class) {
    pools = pools.filter((p) => p.exposure.asset_class === input.asset_class);
  }
  if (typeof input.min_apy === "number") {
    pools = pools.filter((p) => p.yield.apr_total >= input.min_apy!);
  }
  if (typeof input.min_contract_age_days === "number") {
    pools = pools.filter(
      (p) =>
        p.risk.contract_age_days !== null &&
        p.risk.contract_age_days >= input.min_contract_age_days!,
    );
  }
  if (input.max_depeg_risk) {
    const cap = DEPEG_RANK[input.max_depeg_risk] ?? 2;
    pools = pools.filter((p) => {
      const risk = p.risk.underlying_depeg_risk;
      if (risk === null) return true; // unclassified → don't filter out
      return (DEPEG_RANK[risk] ?? 2) <= cap;
    });
  }

  // Sort by APY desc.
  pools = [...pools].sort((a, b) => b.yield.apr_total - a.yield.apr_total);

  const limit = Math.max(1, Math.min(20, input.limit ?? 10));
  const top = pools.slice(0, limit);
  return { vaults: top.map(toSlimRow), cache_status };
}

type GetVaultDetailsInput = {
  vault_address?: unknown;
  chain?: unknown;
};

async function execGetVaultDetails(input: GetVaultDetailsInput) {
  if (!isAddressValid(input.vault_address)) {
    return { error: "Invalid vault_address — must be 0x-prefixed 40-char hex" };
  }
  if (!isSupportedChain(input.chain)) {
    return { error: "Invalid chain — must be ethereum, arbitrum, or base" };
  }
  await ensureCachePopulated();
  const cache_status = getCacheStatus();
  const pool = findPoolByAddress(input.vault_address, input.chain);
  if (!pool) {
    return { error: "Vault not found", cache_status };
  }
  // PoolListItem already excludes the heaviest fields (no raw_data, no full
  // morpho/upshift dumps). Returning as-is is safe.
  return { vault: pool, cache_status };
}

type CompareVaultsInput = {
  vaults?: Array<{ vault_address?: unknown; chain?: unknown }>;
};

async function execCompareVaults(input: CompareVaultsInput) {
  const list = Array.isArray(input.vaults) ? input.vaults : [];
  if (list.length < 2 || list.length > 4) {
    return { error: "Provide 2 to 4 vaults to compare" };
  }
  await ensureCachePopulated();
  const cache_status = getCacheStatus();

  const rows: Array<SearchVaultRow | { error: string; vault_address: string }> = [];
  for (const v of list) {
    const addr = v.vault_address;
    const chain = v.chain;
    if (!isAddressValid(addr)) {
      rows.push({
        error: "Invalid vault_address",
        vault_address: typeof addr === "string" ? addr : "(missing)",
      });
      continue;
    }
    if (!isSupportedChain(chain)) {
      rows.push({
        error: "Invalid chain",
        vault_address: addr,
      });
      continue;
    }
    const pool = findPoolByAddress(addr, chain);
    if (!pool) {
      rows.push({ error: "Vault not found", vault_address: addr });
      continue;
    }
    rows.push(toSlimRow(pool));
  }
  return { vaults: rows, cache_status };
}

type GetWalletHoldingsInput = {
  address?: unknown;
  chains?: unknown;
};

async function execGetWalletHoldings(input: GetWalletHoldingsInput) {
  if (!isAddressValid(input.address)) {
    return { error: "Invalid address — must be 0x-prefixed 40-char hex" };
  }
  let chains: AlchemyChain[] = ["ethereum", "arbitrum", "base"];
  if (Array.isArray(input.chains)) {
    const filtered = input.chains.filter(
      (c): c is AlchemyChain =>
        typeof c === "string" &&
        (SUPPORTED_CHAINS as readonly string[]).includes(c),
    );
    if (filtered.length > 0) chains = filtered;
  }
  const balances = await getTokenBalances(input.address, chains);
  return { balances };
}

type FindYieldsInput = {
  address?: unknown;
};

async function execFindYieldsForHoldings(input: FindYieldsInput) {
  if (!isAddressValid(input.address)) {
    return { error: "Invalid address — must be 0x-prefixed 40-char hex" };
  }

  await ensureCachePopulated();
  const cache_status = getCacheStatus();
  const balances = await getTokenBalances(input.address, [
    "ethereum",
    "arbitrum",
    "base",
  ]);

  // Build a unique set of held symbols across all chains.
  const heldSymbols = new Set<string>();
  for (const cb of balances) {
    for (const t of cb.tokens) {
      heldSymbols.add(t.symbol.toUpperCase());
    }
  }

  if (heldSymbols.size === 0) {
    return { matches: [], cache_status };
  }

  const pools = getCachedPools();
  const matches: Array<{
    held_token: string;
    top_vaults: SearchVaultRow[];
  }> = [];

  for (const sym of heldSymbols) {
    const matched = pools
      .filter((p) =>
        p.exposure.underlying_tokens.some(
          (t) => t.symbol.toUpperCase() === sym,
        ),
      )
      .sort((a, b) => b.yield.apr_total - a.yield.apr_total)
      .slice(0, 5);
    if (matched.length > 0) {
      matches.push({
        held_token: sym,
        top_vaults: matched.map(toSlimRow),
      });
    }
  }

  return { matches, cache_status };
}

type GetWalletDefiPositionsInput = { address?: unknown };

async function execGetWalletDefiPositions(input: GetWalletDefiPositionsInput) {
  if (!isAddressValid(input.address)) {
    return { error: "Invalid address — must be 0x-prefixed 40-char hex" };
  }
  try {
    const positions: LifiPosition[] = await fetchPortfolio(input.address);
    return { positions };
  } catch (err) {
    return {
      error:
        "Couldn't fetch DeFi positions right now. " +
        (err instanceof Error ? err.message : String(err)),
    };
  }
}

// === Dispatcher ===

export async function executeTool(
  name: string,
  input: unknown,
): Promise<unknown> {
  // Tool-execution exceptions are caught and returned to the model as the
  // tool_result content (`{error: "..."}`) so the model can recover within
  // the same turn — see chatbot.md route.ts step.
  try {
    const i = (input ?? {}) as Record<string, unknown>;
    switch (name) {
      case "search_vaults":
        return await execSearchVaults(i as SearchVaultsInput);
      case "get_vault_details":
        return await execGetVaultDetails(i as GetVaultDetailsInput);
      case "compare_vaults":
        return await execCompareVaults(i as CompareVaultsInput);
      case "get_wallet_holdings":
        return await execGetWalletHoldings(i as GetWalletHoldingsInput);
      case "find_yields_for_holdings":
        return await execFindYieldsForHoldings(i as FindYieldsInput);
      case "get_wallet_defi_positions":
        return await execGetWalletDefiPositions(
          i as GetWalletDefiPositionsInput,
        );
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[chat-tools] ${name} failed: ${message}`);
    return { error: `Tool ${name} failed: ${message}` };
  }
}

