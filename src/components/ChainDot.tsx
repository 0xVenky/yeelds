"use client";

import { useState } from "react";

// Chain ID mapping for logo URLs
const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  base: 8453,
};

export const CHAIN_COLORS: Record<string, string> = {
  ethereum: "#627EEA",
  arbitrum: "#12AAFF",
  base: "#0052FF",
};

function chainLogoUrl(chain: string): string | null {
  const id = CHAIN_IDS[chain];
  if (!id) return null;
  return `https://assets.smold.app/api/chain/${id}/logo-128.png`;
}

/**
 * Small round chain icon (24x24) with logo image and letter fallback.
 */
export function ChainDot({ chain, size = 24 }: { chain: string; size?: number }) {
  const name = chain.charAt(0).toUpperCase() + chain.slice(1);
  const letter = chain.charAt(0).toUpperCase();
  const logoUrl = chainLogoUrl(chain);
  const color = CHAIN_COLORS[chain] ?? "#9ca3af";
  const [imgError, setImgError] = useState(false);

  return (
    <span
      className="inline-flex items-center justify-center rounded-full overflow-hidden shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
      title={name}
      aria-label={name}
    >
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-white font-bold" style={{ fontSize: size * 0.42 }}>
          {letter}
        </span>
      )}
    </span>
  );
}

/**
 * Chain badge with logo + name text, for use in pool detail and cards.
 */
export function ChainBadge({
  chain,
  className = "",
  style,
}: {
  chain: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const name = chain.charAt(0).toUpperCase() + chain.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${className}`}
      style={style}
    >
      <ChainDot chain={chain} size={16} />
      {name}
    </span>
  );
}
