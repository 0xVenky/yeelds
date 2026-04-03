"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function IncentivesToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("has_incentives") === "true";

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (active) {
      params.delete("has_incentives");
    } else {
      params.set("has_incentives", "true");
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <button
      onClick={toggle}
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
        active
          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
          : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:text-gray-700 dark:hover:text-zinc-300"
      }`}
      aria-pressed={active}
    >
      Has incentives
    </button>
  );
}
