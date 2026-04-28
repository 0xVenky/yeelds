type Props = {
  category: string | null;
};

export function StabilityBadge({ category }: Props) {
  if (!category) {
    return <span style={{ color: "var(--outline)" }}>--</span>;
  }

  const isStable = category === "stablecoin" || category === "blue_chip";
  const isMixed = category === "mixed";

  let label: string;
  let color: string;
  let bg: string;

  if (isStable) {
    label = "Stable";
    color = "var(--secondary)";
    bg = "var(--surface-container-low)";
  } else if (isMixed) {
    label = "Mixed";
    color = "#d97706";
    bg = "#fef3c7";
  } else {
    label = "Volatile";
    color = "#dc2626";
    bg = "#fef2f2";
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color, backgroundColor: bg }}
    >
      {label}
    </span>
  );
}
