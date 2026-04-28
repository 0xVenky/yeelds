"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { FiltersResponse } from "@/lib/types";

const TVL_OPTIONS = [
  { label: "Any TVL", value: "" },
  { label: "$100K+", value: "100000" },
  { label: "$1M+", value: "1000000" },
  { label: "$10M+", value: "10000000" },
  { label: "$100M+", value: "100000000" },
];

const APR_OPTIONS = [
  { label: "Any APY", value: "" },
  { label: "0-10%", min: "0", max: "10" },
  { label: "10-50%", min: "10", max: "50" },
  { label: "50-100%", min: "50", max: "100" },
  { label: "100%+", min: "100", max: "" },
];

const ACTION_OPTIONS = [
  { label: "All Actions", value: "" },
  { label: "Lending", value: "lending" },
  { label: "LP into AMM", value: "amm_lp" },
  { label: "Vault", value: "vault" },
  { label: "Staking", value: "staking" },
];

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FiltersResponse | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

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
    router.push(qs ? `/explore?${qs}` : "/explore");
  }

  function setAprRange(option: (typeof APR_OPTIONS)[number]) {
    const params = new URLSearchParams(searchParams.toString());
    if ("min" in option && option.min) {
      params.set("min_apr", option.min);
    } else {
      params.delete("min_apr");
    }
    if ("max" in option && option.max) {
      params.set("max_apr", option.max);
    } else {
      params.delete("max_apr");
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/explore?${qs}` : "/explore");
  }

  function applyPreset(params: Record<string, string>) {
    const sp = new URLSearchParams(params);
    const qs = sp.toString();
    router.push(qs ? `/explore?${qs}` : "/explore");
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    const view = params.get("view");
    const cleared = new URLSearchParams();
    if (view) cleared.set("view", view);
    const qs = cleared.toString();
    router.push(qs ? `/explore?${qs}` : "/explore");
    setSearch("");
  }

  function handleSearch(value: string) {
    setSearch(value);
    setParam("search", value);
  }

  const activeCount = Array.from(searchParams.entries()).filter(
    ([k]) => !["view", "page", "limit"].includes(k),
  ).length;

  return (
    <div className="px-6 sm:px-8 py-3 space-y-3">
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex items-center gap-2 text-sm font-medium transition-colors md:hidden"
        style={{ color: "var(--on-surface-variant)" }}
        aria-expanded={mobileOpen}
        aria-controls="filter-panel"
      >
        <span className="material-symbols-outlined text-[18px]">filter_list</span>
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {/* Filter row */}
      <div
        id="filter-panel"
        className={`flex-wrap items-center gap-2 ${mobileOpen ? "flex" : "hidden md:flex"}`}
      >
        {/* Search */}
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px]"
            style={{ color: "var(--outline)" }}
          >
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search pools..."
            className="pl-10 pr-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 w-52 border-none"
            style={{
              backgroundColor: "var(--surface-container-lowest)",
              color: "var(--on-surface)",
            }}
            aria-label="Search pools"
          />
        </div>

        {/* Chain */}
        <select
          value={searchParams.get("chain") ?? ""}
          onChange={(e) => setParam("chain", e.target.value)}
          className="px-4 py-2 rounded-full text-sm font-medium border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          style={{
            backgroundColor: "var(--surface-container-high)",
            color: "var(--on-surface-variant)",
          }}
          aria-label="Filter by chain"
        >
          <option value="">All Chains</option>
          {filters?.chains.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        {/* Protocol */}
        <select
          value={searchParams.get("protocol") ?? ""}
          onChange={(e) => setParam("protocol", e.target.value)}
          className="px-4 py-2 rounded-full text-sm font-medium border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          style={{
            backgroundColor: "var(--surface-container-high)",
            color: "var(--on-surface-variant)",
          }}
          aria-label="Filter by protocol"
        >
          <option value="">All Protocols</option>
          {filters?.protocols.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} ({p.pool_count})
            </option>
          ))}
        </select>

        {/* Action */}
        <select
          value={searchParams.get("pool_type") ?? ""}
          onChange={(e) => setParam("pool_type", e.target.value)}
          className="px-4 py-2 rounded-full text-sm font-medium border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          style={{
            backgroundColor: "var(--surface-container-high)",
            color: "var(--on-surface-variant)",
          }}
          aria-label="Filter by action"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* TVL */}
        <select
          value={searchParams.get("min_tvl") ?? ""}
          onChange={(e) => setParam("min_tvl", e.target.value)}
          className="px-4 py-2 rounded-full text-sm font-medium border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          style={{
            backgroundColor: "var(--surface-container-high)",
            color: "var(--on-surface-variant)",
          }}
          aria-label="Filter by TVL"
        >
          {TVL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* APR range */}
        <select
          value={
            searchParams.get("min_apr") && searchParams.get("max_apr")
              ? `${searchParams.get("min_apr")}-${searchParams.get("max_apr")}`
              : searchParams.get("min_apr")
                ? `${searchParams.get("min_apr")}-`
                : ""
          }
          onChange={(e) => {
            const val = e.target.value;
            if (!val) {
              setAprRange({ label: "", value: "" });
            } else {
              const match = APR_OPTIONS.find((o) => {
                if (!("min" in o)) return false;
                return `${o.min}-${o.max}` === val;
              });
              if (match) setAprRange(match);
            }
          }}
          className="px-4 py-2 rounded-full text-sm font-medium border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          style={{
            backgroundColor: "var(--surface-container-high)",
            color: "var(--on-surface-variant)",
          }}
          aria-label="Filter by APY range"
        >
          <option value="">Any APY</option>
          {APR_OPTIONS.filter((o) => "min" in o).map((o) => (
            <option key={o.label} value={`${"min" in o ? o.min : ""}-${"max" in o ? o.max : ""}`}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Presets */}
        <select
          value=""
          onChange={(e) => {
            const val = e.target.value;
            if (val === "stablecoin_vaults") {
              applyPreset({ exposure_category: "stablecoin", pool_type: "vault" });
            } else if (val === "maximize_eth") {
              applyPreset({ exposure: "ETH", sort: "apr_total", order: "desc" });
            }
          }}
          className="px-4 py-2 rounded-full text-sm font-bold border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/20 ml-auto"
          style={{
            backgroundColor: "var(--surface-container-high)",
            color: "var(--on-surface-variant)",
          }}
          aria-label="Apply preset"
        >
          <option value="">Presets</option>
          <option value="stablecoin_vaults">Stablecoin Vaults</option>
          <option value="maximize_eth">Maximize ETH</option>
        </select>

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs font-semibold transition-colors hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            Clear ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
