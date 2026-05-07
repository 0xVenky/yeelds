import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, arbitrum, base } from "wagmi/chains";

export const chains = [mainnet, arbitrum, base] as const;

// Surface a clear, actionable error before RainbowKit's internal hard-throw
// fires deep inside the providers tree. The `?? ""` below preserves the
// existing behavior so this file is still cheap to import in environments
// that legitimately have no project ID (e.g. isolated unit tests), but the
// log makes the misconfiguration debuggable instead of mysterious.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!projectId) {
  console.error(
    "[wallet] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set — wallet connect modal will fail at module evaluation. " +
    "Get a project ID free at https://cloud.reown.com and set in .env.local + Vercel env."
  );
}

export const config = getDefaultConfig({
  appName: "Yeelds — DeFi Yield Discovery",
  appDescription: "Discover and compare yield opportunities across EVM chains.",
  appUrl: "https://yeelds.ai",
  projectId: projectId ?? "",
  chains: [...chains],
  ssr: true,
});
