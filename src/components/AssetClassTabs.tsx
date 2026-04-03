"use client";

import { useRouter, usePathname } from "next/navigation";

const TABS = [
  { label: "All", href: "/" },
  { label: "Stablecoins", href: "/stables" },
  { label: "USD", href: "/stables/usd" },
  { label: "EUR", href: "/stables/eur" },
  { label: "ETH & LSTs", href: "/eth" },
  { label: "Bitcoin", href: "/btc" },
  { label: "RWA", href: "/rwa" },
  { label: "Yield-Bearing", href: "/yield-bearing" },
] as const;

export function AssetClassTabs() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1.5 px-4 sm:px-6 py-2.5 border-b border-gray-100 dark:border-zinc-800/50 overflow-x-auto"
      aria-label="Asset classes"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            className={`shrink-0 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              active
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
