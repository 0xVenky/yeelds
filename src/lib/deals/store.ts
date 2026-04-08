import type { Deal } from "./types";
import { loadDealsFromJson } from "./loader";

let deals: Deal[] = [];
let dealsLoaded = false;

export function getDeals(): Deal[] {
  return deals;
}

/**
 * Load deals from JSON into memory.
 * Synchronous — JSON is a static import, no async needed.
 */
export function loadDeals(): void {
  try {
    deals = loadDealsFromJson();
    dealsLoaded = true;
    console.log(`Deals loaded: ${deals.length} deals (${deals.filter(d => d.status === "live").length} live)`);
  } catch (e) {
    console.warn(`Deals load failed: ${(e as Error).message}`);
  }
}

/**
 * Ensure deals are loaded. Called by pages/API before accessing deals.
 * Follows the same pattern as ensureFeedPopulated() / ensureCachePopulated().
 */
export function ensureDealsPopulated(): void {
  if (dealsLoaded) return;
  loadDeals();
}
