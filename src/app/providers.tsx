"use client";

// SSR notes (B11 verification, 2026-05-07):
//
// Prior comment claimed RainbowKit's localStorage access broke SSR on
// Node.js 25 / Next 16, requiring a `dynamic({ ssr: false })` wrap of the
// entire provider tree. With Node 25.6.1 / Next 16.2.1 / wagmi 3.6.9 /
// RainbowKit 2.2.11 (current pins), the wrap is no longer needed:
// wagmi's `config({ ssr: true })` already produces an SSR-safe storage
// mock during render, and RainbowKit 2.2.x respects it. Verified by
// curl-ing /, /explore, /chat, /projects under `npm run dev` and
// confirming vault/protocol content is now in the HTML body (Morpho/USDC
// counts roughly 2x post-fix vs. pre-fix payload-only emission), no
// localStorage errors in `.next/dev/logs/next-development.log`, and a
// clean `npm run build` covering all 26 routes.
//
// If a future RainbowKit/wagmi/Node bump breaks SSR again, the prior
// workaround was: `dynamic(() => import("./providers-inner"), { ssr: false })`.
import { ProvidersInner } from "./providers-inner";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ProvidersInner>{children}</ProvidersInner>;
}
