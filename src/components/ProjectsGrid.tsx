"use client";

import { useState } from "react";
import type { ProtocolSummary } from "@/lib/api/query";
import { ProtocolCard } from "./ProtocolCard";
import { ChainDot } from "./ChainDot";

const CHAIN_OPTIONS = ["ethereum", "arbitrum", "base"] as const;
const ASSET_CLASS_OPTIONS = [
  { value: "usd_stable", label: "Stablecoins" },
  { value: "eth_class", label: "ETH" },
  { value: "btc_class", label: "BTC" },
  { value: "rwa", label: "RWA" },
] as const;

export function ProjectsGrid({ protocols }: { protocols: ProtocolSummary[] }) {
  const [chainFilter, setChainFilter] = useState<string | null>(null);
  const [assetClassFilter, setAssetClassFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  let filtered = protocols;

  if (chainFilter) {
    filtered = filtered.filter(p => p.chains.includes(chainFilter));
  }
  if (assetClassFilter) {
    filtered = filtered.filter(p => p.asset_classes.includes(assetClassFilter));
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Chain chips */}
        {CHAIN_OPTIONS.map((chain) => (
          <button
            key={chain}
            onClick={() => setChainFilter(chainFilter === chain ? null : chain)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              chainFilter === chain
                ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                : "border-zinc-300 dark:border-zinc-700 text-[var(--text-muted)] hover:border-zinc-400 dark:hover:border-zinc-600"
            }`}
          >
            <ChainDot chain={chain} size={14} />
            {chain.charAt(0).toUpperCase() + chain.slice(1)}
          </button>
        ))}

        <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />

        {/* Asset class chips */}
        {ASSET_CLASS_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setAssetClassFilter(assetClassFilter === value ? null : value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              assetClassFilter === value
                ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                : "border-zinc-300 dark:border-zinc-700 text-[var(--text-muted)] hover:border-zinc-400 dark:hover:border-zinc-600"
            }`}
          >
            {label}
          </button>
        ))}

        <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search protocols..."
          className="rounded-full border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-emerald-500 w-40"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-[var(--text-muted)] text-sm">No protocols match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((protocol) => (
            <ProtocolCard key={protocol.id} protocol={protocol} />
          ))}
        </div>
      )}
    </div>
  );
}
