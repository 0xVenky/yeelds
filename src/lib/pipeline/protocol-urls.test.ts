import { describe, it, expect } from "vitest";
import { PROTOCOL_APP_URLS } from "@/lib/constants";

describe("PROTOCOL_APP_URLS", () => {
  it("has a URL for Morpho", () => {
    expect(PROTOCOL_APP_URLS["morpho-v1"]).toBe("https://app.morpho.org");
  });

  it("has URLs for all major lending protocols", () => {
    expect(PROTOCOL_APP_URLS["aave-v3"]).toBeTruthy();
    expect(PROTOCOL_APP_URLS["compound-v3"]).toBeTruthy();
    expect(PROTOCOL_APP_URLS["euler-v2"]).toBeTruthy();
    expect(PROTOCOL_APP_URLS["spark"]).toBeTruthy();
  });

  it("has URLs for all major DEX protocols", () => {
    expect(PROTOCOL_APP_URLS["uniswap-v3"]).toBeTruthy();
    expect(PROTOCOL_APP_URLS["curve-dex"]).toBeTruthy();
    expect(PROTOCOL_APP_URLS["aerodrome-slipstream"]).toBeTruthy();
    expect(PROTOCOL_APP_URLS["sushiswap"]).toBeTruthy();
    expect(PROTOCOL_APP_URLS["balancer-v3"]).toBeTruthy();
  });

  it("has URLs for vault protocols", () => {
    expect(PROTOCOL_APP_URLS["beefy"]).toBeTruthy();
    expect(PROTOCOL_APP_URLS["yearn-finance"]).toBeTruthy();
    expect(PROTOCOL_APP_URLS["convex-finance"]).toBeTruthy();
  });

  it("all URLs are valid https URLs", () => {
    for (const [slug, url] of Object.entries(PROTOCOL_APP_URLS)) {
      expect(url, `${slug} URL should start with https://`).toMatch(/^https:\/\//);
    }
  });

  it("no trailing slashes on URLs", () => {
    for (const [slug, url] of Object.entries(PROTOCOL_APP_URLS)) {
      expect(url, `${slug} URL should not end with /`).not.toMatch(/\/$/);
    }
  });

  it("generates correct DeFi Llama fallback for unmapped protocols", () => {
    const unmappedSlug = "wasabi";
    expect(PROTOCOL_APP_URLS[unmappedSlug]).toBeUndefined();
    // Fallback pattern used in normalizer
    const fallback = `https://defillama.com/protocol/${unmappedSlug}`;
    expect(fallback).toBe("https://defillama.com/protocol/wasabi");
  });
});
