export const dynamic = "force-dynamic";

import Link from "next/link";
import { queryDeals } from "@/lib/api/query";
import { DealCard } from "@/components/DealCard";
import type { DealStatus } from "@/lib/deals/types";

const STATUS_SECTIONS: { status: DealStatus; label: string }[] = [
  { status: "live", label: "Live Deals" },
  { status: "upcoming", label: "Upcoming" },
  { status: "paused", label: "Paused" },
  { status: "ended", label: "Past Deals" },
];

export default async function DealsPage() {
  const { deals } = queryDeals();

  // Group deals by status
  const grouped = new Map<DealStatus, typeof deals>();
  for (const deal of deals) {
    const list = grouped.get(deal.status) ?? [];
    list.push(deal);
    grouped.set(deal.status, list);
  }

  // Only show section headers if there are multiple statuses with deals
  const activeStatuses = STATUS_SECTIONS.filter((s) => (grouped.get(s.status)?.length ?? 0) > 0);
  const showHeaders = activeStatuses.length > 1;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
      <Link
        href="/"
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6 inline-block"
      >
        &larr; Back to pools
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
          LP Deals
        </h1>
        <p className="text-[var(--text-muted)] text-sm">
          Curated yield opportunities from LP syndicates and private deals
        </p>
      </div>

      {deals.length === 0 ? (
        <p className="text-[var(--text-muted)] text-sm">No deals available right now. Check back soon.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {activeStatuses.map(({ status, label }) => {
            const sectionDeals = grouped.get(status) ?? [];
            return (
              <section key={status}>
                {showHeaders && (
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
                    {label}
                  </h2>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sectionDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
