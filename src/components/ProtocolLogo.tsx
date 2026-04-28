"use client";

import { useState } from "react";

export function ProtocolLogo({
  protocol,
  symbol,
  size = 40,
}: {
  protocol: string;
  symbol: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/20"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #630ed4, #7c3aed)",
        }}
        aria-label={protocol}
      >
        <span className="text-sm font-bold text-white">
          {symbol.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://icons.llama.fi/${protocol}.png`}
      alt={protocol}
      width={size}
      height={size}
      className="rounded-full shrink-0 object-cover"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

export function ProtocolLogoServer({
  protocol,
  size = 40,
}: {
  protocol: string;
  size?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://icons.llama.fi/${protocol}.png`}
      alt={protocol}
      width={size}
      height={size}
      className="rounded-full shrink-0 object-cover"
      style={{ width: size, height: size }}
    />
  );
}
