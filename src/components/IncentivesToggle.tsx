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
    router.push(qs ? `/explore?${qs}` : "/explore");
  }

  return (
    <button
      onClick={toggle}
      className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all"
      style={
        active
          ? {
              background: "linear-gradient(135deg, var(--secondary), #2ee0ad)",
              color: "var(--on-secondary)",
            }
          : {
              backgroundColor: "var(--surface-container-high)",
              color: "var(--on-surface-variant)",
            }
      }
      aria-pressed={active}
    >
      Has incentives
    </button>
  );
}
