import type { TokenInfo } from "@/lib/types";

const CATEGORY_STYLES: Record<string, string> = {
  stable: "border-green-300 dark:border-green-600/60 text-green-700 dark:text-green-300",
  blue_chip: "border-blue-300 dark:border-blue-600/60 text-blue-700 dark:text-blue-300",
};

const DEFAULT_STYLE = "border-gray-300 dark:border-zinc-600/60 text-gray-500 dark:text-zinc-400";

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function tokenStyle(token: TokenInfo): string {
  if (token.is_stable) return CATEGORY_STYLES.stable;
  const BLUE_CHIP = ["ETH", "WETH", "WBTC", "BTC", "stETH", "wstETH", "cbETH", "rETH"];
  if (BLUE_CHIP.includes(token.symbol)) return CATEGORY_STYLES.blue_chip;
  return DEFAULT_STYLE;
}

const MAX_VISIBLE = 4;

export function ExposurePills({ tokens }: { tokens: TokenInfo[] }) {
  if (tokens.length === 0) return null;

  const visible = tokens.slice(0, MAX_VISIBLE);
  const overflow = tokens.length - MAX_VISIBLE;

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {visible.map((token) => (
        <span
          key={token.address}
          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${tokenStyle(token)}`}
          title={token.address}
        >
          {token.symbol === "UNKNOWN" ? truncateAddress(token.address) : token.symbol}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">
          +{overflow} more
        </span>
      )}
    </span>
  );
}
