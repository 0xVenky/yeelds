import { z } from "zod";
import { SUPPORTED_CHAINS, MAX_REASONABLE_APR } from "@/lib/constants";

// --- Enums ---

export const DEAL_SOURCES = ["turtle", "liquidity_land", "telegram", "other"] as const;
export type DealSource = (typeof DEAL_SOURCES)[number];

export const DEAL_STATUSES = ["live", "upcoming", "ended", "paused"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

// --- Zod schema for deals.json validation ---

export const DealSchema = z.object({
  id: z.string().min(1),
  source: z.enum(DEAL_SOURCES),
  title: z.string().min(1),
  description: z.string(),
  protocol: z.string().min(1),
  chains: z.array(z.enum(SUPPORTED_CHAINS)).min(1),
  assets: z.array(z.string().min(1)).min(1),
  apr_estimate: z.number().min(0).max(MAX_REASONABLE_APR).nullable(),
  bonus_apr: z.number().min(0).max(MAX_REASONABLE_APR).nullable(),
  native_apr: z.number().min(0).max(MAX_REASONABLE_APR).nullable(),
  tvl: z.number().min(0).nullable(),
  cap: z.number().min(0).nullable(),
  cap_filled_pct: z.number().min(0).max(100).nullable(),
  status: z.enum(DEAL_STATUSES),
  deposit_url: z.string().url().startsWith("https://"),
  source_url: z.string().url().startsWith("https://").nullable(),
  starts_at: z.string().nullable(), // ISO date
  ends_at: z.string().nullable(),   // ISO date
  duration_label: z.string().nullable(),
  steps: z.array(z.string()),
  notes: z.string().nullable(),
  contacts: z.string().nullable(),
  featured: z.boolean(),
  added_at: z.string(), // ISO date
});

export type Deal = z.infer<typeof DealSchema>;

export const DealsFileSchema = z.array(DealSchema);
