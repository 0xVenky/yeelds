// Route handler tests — chat-review-fixes.md C17.
//
// Covers the request-validation surface only. We do NOT exercise the
// Anthropic stream loop here — that requires a network mock far heavier than
// these guard-rail checks justify, and the loop logic is exercised manually
// during smoke tests.
//
// Test surface, in order of dispatch:
//   1. Missing connectedAddress alone   → 401 "Wallet connection required"
//   2. Malformed connectedAddress shape → 401 "Wallet connection required"
//   3. Both messages and address missing → 400 (multi-issue Zod failure;
//      the route's `isAuthOnly` short-circuit only fires when ALL issues
//      live under the connectedAddress path)
//   4. messages.length > MESSAGE_CAP    → 400 "Message cap reached"
//   5. messages[i].content > 8000 chars → 400 "Invalid request body" (B7)
//
// ANTHROPIC_API_KEY is set in beforeEach so we get past the
// "Chat service unavailable" 500 — none of these tests reach the model.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Hoist-mock the heavy imports so the route's module-evaluation side effects
// are inert. The Anthropic SDK is constructed inside POST(), but we never
// reach it on the failure paths these tests cover — still, mocking removes
// any chance of network use during test runs.
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: vi.fn() },
  })),
}));

vi.mock("@/lib/chat/tools", () => ({
  TOOL_DEFINITIONS: [],
  executeTool: vi.fn(),
}));

import { POST } from "@/app/api/v1/chat/route";

const VALID_ADDRESS = "0x1111111111111111111111111111111111111111";

function postReq(body: unknown): Request {
  return new Request("http://localhost/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
  }
});

describe("POST /api/v1/chat — auth gate (A2 Layer 2)", () => {
  it("returns 401 when connectedAddress is missing", async () => {
    const res = await POST(
      postReq({
        messages: [{ role: "user", content: "hello" }],
      }),
    );
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Wallet connection required");
  });

  it("returns 401 when connectedAddress is malformed (right shape, wrong content)", async () => {
    const res = await POST(
      postReq({
        messages: [{ role: "user", content: "hello" }],
        connectedAddress: "not-a-real-address",
      }),
    );
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Wallet connection required");
  });

  it("returns 400 when both messages and connectedAddress are missing (multi-issue Zod fail)", async () => {
    // C17 #3: Zod surfaces both failures at once, so the route's
    // isAuthOnly check (`every(i => i.path[0] === "connectedAddress")`) is
    // false. Falls through to the generic 400 path. This test asserts the
    // *actual* behavior — DO NOT change route logic to make this 401.
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Invalid request body");
  });
});

describe("POST /api/v1/chat — message-shape guards", () => {
  it("returns 400 when messages.length exceeds MESSAGE_CAP", async () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => ({
      role: "user" as const,
      content: `msg ${i}`,
    }));
    const res = await POST(
      postReq({ messages: tooMany, connectedAddress: VALID_ADDRESS }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("Message cap");
  });

  it("returns 400 when a message content exceeds 8000 chars (B7)", async () => {
    const huge = "x".repeat(8001);
    const res = await POST(
      postReq({
        messages: [{ role: "user", content: huge }],
        connectedAddress: VALID_ADDRESS,
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    // The Zod max(8000) failure surfaces under `messages.0.content` →
    // isAuthOnly is false → falls into the generic 400 branch.
    expect(json.error).toBe("Invalid request body");
  });
});
