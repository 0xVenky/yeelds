import {
  CHAIN_BY_ID,
  LIFI_EARN_BASE_URL,
  MAX_REASONABLE_APY,
} from "@/lib/constants";
import {
  LifiVaultsResponseSchema,
  type LifiVaultRaw,
} from "./lifi-schemas";

const BASE_URL = process.env.LIFI_EARN_URL ?? LIFI_EARN_BASE_URL;
const PAGE_LIMIT = 100;
// Safety cap on cursor pagination. LI.FI's total catalog is ~640 vaults across
// 17 chains (~7 pages at 100/page), so 20 pages = 2000-vault headroom.
const MAX_CATALOG_PAGES = 20;

// LI.FI v2 API (2026-04-19 breaking change) requires `x-lifi-api-key` on every
// data-endpoint request. Same key as the Composer API. Log loudly at module
// load if unset — don't throw: a clear degraded mode (401s → fetcher returns
// [] → cache.ts preserves stale) beats blocking server startup.
if (!process.env.LIFI_API_KEY) {
  console.error(
    "[lifi] LIFI_API_KEY not set — all LI.FI requests will 401 under v2 API. Set it in .env.local and Vercel env (same key used for LI.FI Composer).",
  );
}

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

type PageResult = {
  vaults: LifiVaultRaw[];
  nextCursor: string | null | undefined;
  total: number;
};

async function fetchVaultPage(url: string): Promise<PageResult> {
  try {
    const raw = await fetchJson(url);
    const parsed = LifiVaultsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`[lifi] Validation failed for ${url}:`, parsed.error.issues.slice(0, 3));
      return { vaults: [], nextCursor: null, total: 0 };
    }
    return {
      vaults: parsed.data.data,
      nextCursor: parsed.data.nextCursor,
      total: parsed.data.total,
    };
  } catch (err) {
    console.error(`[lifi] Fetch failed for ${url}:`, err);
    return { vaults: [], nextCursor: null, total: 0 };
  }
}

/**
 * Sanitize a single vault record:
 *   - TVL must parse to a non-negative number (else drop the vault).
 *   - Cap apy.total / apy.base / apy.reward at MAX_REASONABLE_APY.
 *   - Negative APY clamps to 0.
 */
function sanitizeVault(v: LifiVaultRaw): LifiVaultRaw | null {
  const tvl = parseFloat(v.analytics.tvl.usd);
  if (!Number.isFinite(tvl) || tvl < 0) {
    console.warn(`[lifi] Dropping vault ${v.slug}: invalid TVL "${v.analytics.tvl.usd}"`);
    return null;
  }

  const capApy = (x: number | null): number | null => {
    if (x === null) return null;
    if (!Number.isFinite(x)) return null;
    if (x < 0) return 0;
    if (x > MAX_REASONABLE_APY) {
      console.warn(`[lifi] Capping APY ${x}% → ${MAX_REASONABLE_APY}% on ${v.slug}`);
      return MAX_REASONABLE_APY;
    }
    return x;
  };

  return {
    ...v,
    analytics: {
      ...v.analytics,
      apy: {
        base: capApy(v.analytics.apy.base) ?? 0,
        reward: capApy(v.analytics.apy.reward),
        total: capApy(v.analytics.apy.total) ?? 0,
      },
      apy1d: capApy(v.analytics.apy1d),
      apy7d: capApy(v.analytics.apy7d),
      apy30d: capApy(v.analytics.apy30d),
    },
  };
}

/**
 * Fetch LI.FI's full vault catalog across all chains via cursor pagination.
 *
 * Note: LI.FI's `?chainId=N` query filter regressed 2026-04-17 to return
 * empty `{data: [], total: 0}` for all chains. We now fetch the unfiltered
 * catalog and apply the chain filter client-side in `fetchAllVaults`.
 * The per-chain path is deliberately removed rather than retried so a
 * silent upstream re-break can't cause partial coverage.
 */
async function fetchCatalogPages(): Promise<LifiVaultRaw[]> {
  const vaults: LifiVaultRaw[] = [];
  let cursor: string | null | undefined = null;
  let pages = 0;

  while (pages < MAX_CATALOG_PAGES) {
    const url = new URL(`${BASE_URL}/v1/vaults`);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    if (cursor) url.searchParams.set("cursor", cursor);

    const { vaults: page, nextCursor, total } = await fetchVaultPage(url.toString());
    vaults.push(...page);
    pages++;

    if (pages === 1) {
      console.log(`[lifi] catalog page 1: got ${page.length}, server total=${total}`);
    }

    if (!nextCursor || page.length === 0) break;
    cursor = nextCursor;
  }

  if (pages === MAX_CATALOG_PAGES) {
    console.warn(`[lifi] hit MAX_CATALOG_PAGES=${MAX_CATALOG_PAGES} — bump cap if catalog grew.`);
  }
  return vaults;
}

/**
 * Fetch all LI.FI Earn vaults on Ethereum + Arbitrum + Base.
 *
 * Per gap-analysis findings (confirmed again 2026-04-17):
 *   - The `?tags=X` query is ignored server-side — no tag-filter loop.
 *   - The `?chainId=N` query is currently broken upstream — we fetch the
 *     full catalog and filter locally.
 *   - A hard throw here triggers the cache layer's stale-cache-wins path;
 *     cache.ts also refuses to overwrite a non-empty cache with an empty
 *     successful fetch, so a flat catalog response won't silently wipe.
 */
export async function fetchAllVaults(): Promise<LifiVaultRaw[]> {
  const catalog = await fetchCatalogPages();
  const supportedChains = new Set(Object.keys(CHAIN_BY_ID).map(Number));
  const inScope = catalog.filter(v => supportedChains.has(v.chainId));

  // Dedup by slug (cursor pagination can occasionally repeat)
  const seen = new Set<string>();
  const deduped = inScope.filter(v => {
    if (seen.has(v.slug)) return false;
    seen.add(v.slug);
    return true;
  });

  // Sanitize each vault (drop bad TVL, cap APY).
  const sanitized: LifiVaultRaw[] = [];
  let dropped = 0;
  for (const v of deduped) {
    const clean = sanitizeVault(v);
    if (clean) sanitized.push(clean);
    else dropped++;
  }

  console.log(
    `[lifi] Fetched ${sanitized.length} vaults (${catalog.length} catalog, ${inScope.length} in scope, ${deduped.length} deduped, ${dropped} dropped)`,
  );
  return sanitized;
}
