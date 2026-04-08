import { DealsFileSchema, type Deal, type DealStatus } from "./types";
import rawDeals from "../../../data/deals.json";

const STATUS_ORDER: Record<DealStatus, number> = {
  live: 0,
  upcoming: 1,
  paused: 2,
  ended: 3,
};

/**
 * Derive deal status from dates if starts_at/ends_at are present.
 * Manual `status` field is used as fallback or override for "paused".
 */
function deriveStatus(deal: Deal): DealStatus {
  // Paused is always a manual override — don't auto-derive
  if (deal.status === "paused") return "paused";

  const now = Date.now();

  if (deal.starts_at) {
    const start = new Date(deal.starts_at).getTime();
    if (now < start) return "upcoming";
  }

  if (deal.ends_at) {
    const end = new Date(deal.ends_at).getTime();
    // End date is inclusive — deal ends at end of that day (23:59:59 UTC)
    const endOfDay = end + 24 * 60 * 60 * 1000 - 1;
    if (now > endOfDay) return "ended";
  }

  // Has started (or no start date) and hasn't ended (or no end date)
  return deal.status;
}

/**
 * Load deals from data/deals.json, validate, derive status, sort.
 */
export function loadDealsFromJson(): Deal[] {
  const parsed = DealsFileSchema.safeParse(rawDeals);

  if (!parsed.success) {
    console.warn("Deals JSON validation errors:");
    for (const issue of parsed.error.issues) {
      console.warn(`  [${issue.path.join(".")}] ${issue.message}`);
    }
    // Try to load valid entries individually
    const deals: Deal[] = [];
    for (let i = 0; i < (rawDeals as unknown[]).length; i++) {
      const single = DealsFileSchema.element.safeParse((rawDeals as unknown[])[i]);
      if (single.success) {
        deals.push(single.data);
      } else {
        console.warn(`  Skipping deal at index ${i}: ${single.error.issues[0]?.message}`);
      }
    }
    return sortDeals(deals.map(applyDerivedStatus));
  }

  return sortDeals(parsed.data.map(applyDerivedStatus));
}

function applyDerivedStatus(deal: Deal): Deal {
  const derived = deriveStatus(deal);
  return derived !== deal.status ? { ...deal, status: derived } : deal;
}

function sortDeals(deals: Deal[]): Deal[] {
  return deals.sort((a, b) => {
    // Sort by status priority first
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    // Within same status, featured first, then by added_at desc
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return b.added_at.localeCompare(a.added_at);
  });
}
