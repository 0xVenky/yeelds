"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { FiltersResponse } from "@/lib/types";

const PRESETS = [
  { label: "Stablecoins", param: "exposure_category", value: "stablecoin" },
  { label: "High TVL", param: "min_tvl", value: "10000000" },
  { label: "Organic Only", param: "has_incentives", value: "false" },
] as const;

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FiltersResponse | null>(null);

  useEffect(() => {
    fetch("/api/v1/filters")
      .then((r) => r.json())
      .then(setFilters)
      .catch((e) => console.error("Failed to fetch filters:", e));
  }, []);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function togglePreset(param: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(param) === value) {
      params.delete(param);
    } else {
      params.set(param, value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    // Keep only the view param
    const view = params.get("view");
    const cleared = new URLSearchParams();
    if (view) cleared.set("view", view);
    const qs = cleared.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  const activeCount = Array.from(searchParams.entries()).filter(
    ([k]) => !["view", "page", "limit"].includes(k),
  ).length;

  return (
    <div className="px-6 py-3 border-b border-zinc-800/50 space-y-3">
      {/* Dropdowns row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Chain */}
        <select
          value={searchParams.get("chain") ?? ""}
          onChange={(e) => setParam("chain", e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
          aria-label="Filter by chain"
        >
          <option value="">All Chains</option>
          {filters?.chains.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        {/* Pool type */}
        <select
          value={searchParams.get("pool_type") ?? ""}
          onChange={(e) => setParam("pool_type", e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
          aria-label="Filter by pool type"
        >
          <option value="">All Types</option>
          {filters?.pool_types.map((t) => (
            <option key={t} value={t}>
              {t === "amm_lp" ? "AMM LP" : t === "lending" ? "Lending" : t === "vault" ? "Vault" : t}
            </option>
          ))}
        </select>

        {/* Protocol */}
        <select
          value={searchParams.get("protocol") ?? ""}
          onChange={(e) => setParam("protocol", e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
          aria-label="Filter by protocol"
        >
          <option value="">All Protocols</option>
          {filters?.protocols.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} ({p.pool_count})
            </option>
          ))}
        </select>

        {/* Min TVL */}
        <input
          type="number"
          placeholder="Min TVL ($)"
          value={searchParams.get("min_tvl") ?? ""}
          onChange={(e) => setParam("min_tvl", e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-300 w-32 focus:outline-none focus:border-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label="Minimum TVL"
        />

        {/* Min APR */}
        <input
          type="number"
          placeholder="Min APR (%)"
          value={searchParams.get("min_apr") ?? ""}
          onChange={(e) => setParam("min_apr", e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-300 w-28 focus:outline-none focus:border-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label="Minimum APR"
        />

        {/* Max APR */}
        <input
          type="number"
          placeholder="Max APR (%)"
          value={searchParams.get("max_apr") ?? ""}
          onChange={(e) => setParam("max_apr", e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-300 w-28 focus:outline-none focus:border-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label="Maximum APR"
        />

        {/* Has incentives */}
        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={searchParams.get("has_incentives") === "true"}
            onChange={(e) => setParam("has_incentives", e.target.checked ? "true" : "")}
            className="rounded border-zinc-600 bg-zinc-900 text-emerald-500 focus:ring-0"
          />
          Has incentives
        </label>

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
          >
            Clear filters ({activeCount})
          </button>
        )}
      </div>

      {/* Quick presets */}
      <div className="flex gap-2">
        {PRESETS.map((preset) => {
          const isActive = searchParams.get(preset.param) === preset.value;
          return (
            <button
              key={preset.label}
              onClick={() => togglePreset(preset.param, preset.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700"
                  : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 border border-zinc-700/50"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
