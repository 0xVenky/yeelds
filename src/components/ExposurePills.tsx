import type { TokenInfo } from "@/lib/types";

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function tokenColors(token: TokenInfo): { bg: string; color: string } {
  if (token.is_stable) return { bg: "var(--secondary-container)", color: "var(--on-secondary-container)" };
  const BLUE_CHIP = ["ETH", "WETH", "WBTC", "BTC", "stETH", "wstETH", "cbETH", "rETH"];
  if (BLUE_CHIP.includes(token.symbol)) return { bg: "#dbeafe", color: "#2563eb" };
  return { bg: "var(--surface-container-high)", color: "var(--on-surface-variant)" };
}

const MAX_VISIBLE = 4;

export function ExposurePills({ tokens }: { tokens: TokenInfo[] }) {
  if (tokens.length === 0) return null;

  const visible = tokens.slice(0, MAX_VISIBLE);
  const overflow = tokens.length - MAX_VISIBLE;

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {visible.map((token) => {
        const colors = tokenColors(token);
        return (
          <span
            key={token.address}
            className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold leading-tight"
            style={{ backgroundColor: colors.bg, color: colors.color }}
            title={token.address}
          >
            {token.symbol === "UNKNOWN" ? truncateAddress(token.address) : token.symbol}
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="text-[10px] font-medium" style={{ color: "var(--outline)" }}>
          +{overflow} more
        </span>
      )}
    </span>
  );
}
