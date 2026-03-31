import type { NextRequest } from "next/server";
import { SUPPORTED_CHAINS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

export type PoolQueryParams = {
  chain?: string;
  pool_type?: string;
  protocol?: string;
  exposure?: string;
  exposure_category?: string;
  min_tvl?: number;
  min_apr?: number;
  max_apr?: number;
  has_incentives?: boolean;
  view?: string;
  sort?: string;
  order: "asc" | "desc";
  page: number;
  limit: number;
};

const VALID_POOL_TYPES = ["lending", "amm_lp", "vault"];
const VALID_EXPOSURE_CATEGORIES = ["stablecoin", "blue_chip", "volatile", "mixed"];

function validateChain(val: string | null): string | undefined {
  if (val && (SUPPORTED_CHAINS as readonly string[]).includes(val)) return val;
  return undefined;
}

function validatePoolType(val: string | null): string | undefined {
  if (val && VALID_POOL_TYPES.includes(val)) return val;
  return undefined;
}

function validateExposureCategory(val: string | null): string | undefined {
  if (val && VALID_EXPOSURE_CATEGORIES.includes(val)) return val;
  return undefined;
}

function parsePositiveNumber(val: string | null): number | undefined {
  if (!val) return undefined;
  const n = parseFloat(val);
  if (isNaN(n) || n < 0) return undefined;
  return n;
}

export function parsePoolParams(req: NextRequest): PoolQueryParams {
  const sp = req.nextUrl.searchParams;

  return {
    chain: validateChain(sp.get("chain")),
    pool_type: validatePoolType(sp.get("pool_type")),
    protocol: sp.get("protocol") ?? undefined,
    exposure: sp.get("exposure") ?? undefined,
    exposure_category: validateExposureCategory(sp.get("exposure_category")),
    min_tvl: parsePositiveNumber(sp.get("min_tvl")),
    min_apr: parsePositiveNumber(sp.get("min_apr")),
    max_apr: parsePositiveNumber(sp.get("max_apr")),
    has_incentives: sp.get("has_incentives") === "true" ? true : undefined,
    view: sp.get("view") ?? undefined,
    sort: sp.get("sort") ?? undefined,
    order: sp.get("order") === "asc" ? "asc" : "desc",
    page: Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1),
    limit: Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(sp.get("limit") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)),
  };
}
