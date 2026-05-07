"use client";

import { useSyncExternalStore } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme, darkTheme } from "@rainbow-me/rainbowkit";
import { config } from "@/lib/wallet/config";

import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

const ACCENT = "#630ed4"; // Atelier primary, Decision 18

// Subscribe to <html class="dark"> changes (driven by ThemeToggle).
// Uses useSyncExternalStore so the initial read and updates flow through
// the same external-store API — avoids the set-state-in-effect lint rule.
function subscribeToDarkClass(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getDarkSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getDarkServerSnapshot(): boolean {
  return false;
}

function useIsDark(): boolean {
  return useSyncExternalStore(subscribeToDarkClass, getDarkSnapshot, getDarkServerSnapshot);
}

export function ProvidersInner({ children }: { children: React.ReactNode }) {
  const isDark = useIsDark();
  const theme = isDark
    ? darkTheme({ accentColor: ACCENT, accentColorForeground: "white", borderRadius: "medium" })
    : lightTheme({ accentColor: ACCENT, accentColorForeground: "white", borderRadius: "medium" });

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
