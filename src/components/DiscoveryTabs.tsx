"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { key: "all", label: "All" },
  { key: "highest_yield", label: "Highest Yield" },
  { key: "safest", label: "Safest" },
  { key: "best_long_term", label: "Best Long Term" },
  { key: "trending", label: "Trending" },
] as const;

export function DiscoveryTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("view") ?? "all";

  function selectTab(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") {
      params.delete("view");
    } else {
      params.set("view", key);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/explore?${qs}` : "/explore");
  }

  return (
    <nav
      className="flex gap-2 px-6 sm:px-8 py-3 overflow-x-auto hide-scrollbar"
      aria-label="Discovery modes"
    >
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => selectTab(tab.key)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
            active === tab.key ? "" : "hover:brightness-[0.95]"
          }`}
          style={
            active === tab.key
              ? {
                  backgroundColor: "var(--surface-container-lowest)",
                  color: "var(--on-surface)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }
              : {
                  color: "var(--on-surface-variant)",
                }
          }
          aria-current={active === tab.key ? "page" : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
