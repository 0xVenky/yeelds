import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, arbitrum, base } from "wagmi/chains";

export const chains = [mainnet, arbitrum, base] as const;

export const config = getDefaultConfig({
  appName: "Yeelds — DeFi Yield Discovery",
  appDescription: "Discover and compare yield opportunities across EVM chains.",
  appUrl: "https://yeelds.ai",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  chains: [...chains],
  ssr: true,
});
