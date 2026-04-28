import { z } from "zod";

// LI.FI Earn API — Zod schemas.
// Ported from lyfi/src/lib/lifi/schemas.ts (the proven shape).

export const LifiTokenSchema = z.object({
  address: z.string(),
  symbol: z.string(),
  decimals: z.number(),
});

export const LifiVaultSchema = z.object({
  address: z.string(),
  chainId: z.number(),
  network: z.string(),
  slug: z.string(),
  name: z.string(),
  protocol: z.object({
    name: z.string(),
    url: z.string(),
  }),
  // `provider` was always "DEFILLAMA_PRO" under v1 and is absent from v2
  // (confirmed 2026-04-19). Kept optional to tolerate either shape. The
  // normalizer derives yield_source from `protocol.name`, not this field.
  provider: z.string().optional(),
  tags: z.array(z.string()),
  underlyingTokens: z.array(LifiTokenSchema),
  analytics: z.object({
    apy: z.object({
      base: z.number(),
      reward: z.number().nullable(),
      total: z.number(),
    }),
    apy1d: z.number().nullable(),
    apy7d: z.number().nullable(),
    apy30d: z.number().nullable(),
    tvl: z.object({
      usd: z.string(), // LI.FI returns TVL as string — parseFloat in normalizer
    }),
    updatedAt: z.string(),
  }),
  depositPacks: z.array(z.object({
    name: z.string(),
    stepsType: z.string(),
  })),
  redeemPacks: z.array(z.object({
    name: z.string(),
    stepsType: z.string(),
  })),
  isTransactional: z.boolean(),
  isRedeemable: z.boolean(),
  lpTokens: z.array(z.unknown()),
  syncedAt: z.string(),
  description: z.string().optional(),
});

export type LifiVaultRaw = z.infer<typeof LifiVaultSchema>;

export const LifiVaultsResponseSchema = z.object({
  data: z.array(LifiVaultSchema),
  nextCursor: z.string().nullable().optional(),
  total: z.number(),
});
