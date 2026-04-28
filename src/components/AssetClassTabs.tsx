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
      className="flex gap-2 px-6 sm:px-8 pb-2 overflow-x-auto hide-scrollbar"
      aria-label="Asset classes"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${
              active ? "text-white shadow-md shadow-purple-500/20" : "hover:brightness-[0.95]"
            }`}
            style={
              active
                ? { background: "linear-gradient(135deg, #630ed4, #7c3aed)" }
                : { backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }
            }
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
