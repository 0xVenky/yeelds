"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

type NavItem = {
  label: string;
  param?: Record<string, string>;
  href?: string;
  disabled?: boolean;
  children?: NavItem[];
};

const DISCOVER_ITEMS: NavItem[] = [
  {
    label: "Yields",
    param: {},
    children: [
      { label: "Lending", param: { pool_type: "lending" } },
      { label: "LP into AMM", param: { pool_type: "amm_lp" } },
      { label: "Vaults", param: { pool_type: "vault" } },
    ],
  },
  { label: "Protocols", disabled: true },
  { label: "Chains", disabled: true },
];

const RESEARCH_ITEMS: NavItem[] = [
  { label: "Research", disabled: true },
  { label: "Copy trading", disabled: true },
  { label: "Bookmarked", disabled: true },
];

const DEALS_ITEMS: NavItem[] = [
  { label: "Liquidity Deals", disabled: true },
];

const PRESET_ITEMS: NavItem[] = [
  { label: "Stablecoin Vaults", param: { exposure_category: "stablecoin", pool_type: "vault" } },
  { label: "Maximize ETH", param: { exposure: "ETH", sort: "apr_total", order: "desc" } },
];

function buildUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return qs ? `/?${qs}` : "/";
}

export function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [yieldsExpanded, setYieldsExpanded] = useState(true);

  function isActive(param?: Record<string, string>): boolean {
    if (!param) return false;
    if (Object.keys(param).length === 0) {
      // "Yields" root — active when no pool_type filter
      return !searchParams.get("pool_type") && !searchParams.get("exposure_category");
    }
    return Object.entries(param).every(([k, v]) => searchParams.get(k) === v);
  }

  function navigate(param: Record<string, string>, replace = false) {
    let qs: string;
    if (replace || Object.keys(param).length === 0) {
      qs = new URLSearchParams(param).toString();
    } else {
      const merged = new URLSearchParams(searchParams.toString());
      Object.entries(param).forEach(([k, v]) => merged.set(k, v));
      merged.delete("page");
      qs = merged.toString();
    }
    router.push(qs ? `/?${qs}` : "/");
    setMobileOpen(false);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-zinc-800">
        <span className="text-lg font-bold font-[family-name:var(--font-geist-mono)] text-gray-900 dark:text-zinc-100 tracking-tight">
          YEELDS
        </span>
        <ThemeToggle />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main navigation">
        {/* DISCOVER */}
        <Section title="DISCOVER">
          {DISCOVER_ITEMS.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <>
                  <button
                    onClick={() => {
                      setYieldsExpanded(!yieldsExpanded);
                      if (item.param) navigate(item.param, true);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.param) && !searchParams.get("pool_type")
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                        : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
                      </svg>
                      {item.label}
                    </span>
                    <svg
                      className={`h-4 w-4 transition-transform ${yieldsExpanded ? "rotate-90" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {yieldsExpanded && (
                    <div className="ml-6 mt-1 space-y-0.5">
                      {item.children.map((child) => (
                        <button
                          key={child.label}
                          onClick={() => child.param && navigate(child.param)}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                            isActive(child.param)
                              ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-medium"
                              : "text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                          }`}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <DisabledItem label={item.label} />
              )}
            </div>
          ))}
        </Section>

        {/* RESEARCH */}
        <Section title="RESEARCH">
          {RESEARCH_ITEMS.map((item) => (
            <DisabledItem key={item.label} label={item.label} />
          ))}
        </Section>

        {/* DEALS */}
        <Section title="DEALS">
          {DEALS_ITEMS.map((item) => (
            <DisabledItem key={item.label} label={item.label} />
          ))}
        </Section>

        {/* PRESET */}
        <Section title="PRESET">
          {PRESET_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => item.param && navigate(item.param, true)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive(item.param)
                  ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-medium"
                  : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-zinc-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </Section>
      </nav>

      {/* Bottom CTA */}
      <div className="px-3 pb-4 mt-auto">
        <a
          href="https://metrom.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-3 text-xs text-gray-500 dark:text-zinc-500 hover:border-gray-300 dark:hover:border-zinc-700 transition-colors"
        >
          <p className="font-medium text-gray-700 dark:text-zinc-300 mb-1">
            Want your protocol listed or boosted here?
          </p>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            Boost with Metrom &rarr;
          </span>
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="absolute top-3 left-3 z-30 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 md:hidden"
        aria-label="Open navigation"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-56 h-full bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 overflow-y-auto">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
              aria-label="Close navigation"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 h-screen sticky top-0 overflow-y-auto">
        {sidebarContent}
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-600">
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DisabledItem({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 dark:text-zinc-700 cursor-not-allowed">
      <span>{label}</span>
      <span className="text-[10px] text-gray-300 dark:text-zinc-700">Coming soon</span>
    </div>
  );
}
