// Chat route — Anthropic tool-use loop with prompt caching, streamed back.
//
// Mirrors lyfi/src/app/api/v1/chat/route.ts at the loop level but rewires:
//   - Tools target the Yeelds in-memory cache (not LI.FI direct).
//   - Drops get_deposit_quote (V1 read-only).
//   - Adds prompt caching on the SYSTEM_PROMPT block + the last tool definition.
//   - Uses client.messages.stream() (per chatbot.md) so when the terminal
//     round emits text, deltas reach the browser as the model produces them.
//
// POST body must include `connectedAddress` (validated 0x[40hex]). A missing
// or malformed value returns 401 `{ error: "Wallet connection required" }` —
// the 401 status communicates auth-required semantics to the frontend, which
// uses it to trigger the wallet-connect modal. Per chat-review-fixes.md A2
// (Layers 1+2). Layers 3 (rate limiting) and 4 (SIWE) are deferred for CTO
// discussion.
//
// Address-injection design (chatbot.md dispatch decision):
//   The `connectedAddress` is appended as a SECOND, UNCACHED system block.
//   Inlining it into SYSTEM_PROMPT would change the prefix bytes per distinct
//   address and invalidate the cache key on every connect.
//
// Stream-format contract for Pixel (matches lyfi's wire shape):
//   - Content-Type: text/plain; charset=utf-8
//   - Transfer-Encoding: chunked
//   - Body: raw text deltas concatenated (no SSE framing, no JSON envelope)
//   - Stream closes when the final-round message completes

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/chat/system-prompt";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/chat/tools";
import type { ChatPostBody } from "@/lib/chat/types";

export const maxDuration = 60;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const MESSAGE_CAP = 20;
const MAX_TOOL_ROUNDS = 5;
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

// Per-message content cap (chat-review-fixes.md B7). 8000 chars ≈ 2000 tokens
// worst case — generous for chat input while bounding the input-token budget
// so a single oversized message can't blow the model's context window.
const MAX_MESSAGE_CONTENT_CHARS = 8000;

const ChatPostBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(MAX_MESSAGE_CONTENT_CHARS),
      }),
    )
    .min(1),
  // Required — drive-by traffic without a connected wallet is rejected at
  // the auth boundary (chat-review-fixes.md A2 Layer 2). Shape validated by
  // ADDRESS_RE below; Zod presence-check fails fast with a 401 wrapper.
  connectedAddress: z.string(),
});

// Build the tools array with cache_control on the LAST tool definition.
// Caching the last tool extends the breakpoint to cover the whole tools
// array (cache prefix is `tools` → `system` → `messages`, so a cache_control
// on the final tool block caches all tools). 5-minute ephemeral TTL.
function buildCachedTools(): Anthropic.Tool[] {
  if (TOOL_DEFINITIONS.length === 0) return [];
  return TOOL_DEFINITIONS.map((t, i) =>
    i === TOOL_DEFINITIONS.length - 1
      ? { ...t, cache_control: { type: "ephemeral" as const } }
      : t,
  );
}

function buildSystemBlocks(
  connectedAddress: string,
): Anthropic.TextBlockParam[] {
  // After the c7b0001 Zod tightening + ADDRESS_RE check, `connectedAddress`
  // is always a non-empty 0x-prefixed string by the time we get here.
  return [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
    // Second block, UNCACHED — see file-header comment for why.
    {
      type: "text",
      text:
        `The user's connected wallet address is ${connectedAddress}. ` +
        `Use it as the default address for any wallet-aware tool unless ` +
        `the user explicitly provides a different one.`,
    },
  ];
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Chat service unavailable" },
      { status: 500 },
    );
  }

  // Parse + validate body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ChatPostBodySchema.safeParse(raw);
  if (!parsed.success) {
    // If the only thing that failed is the connectedAddress presence/type,
    // surface a 401 so the frontend can trigger the wallet-connect modal.
    // Any other Zod failure is a client bug → 400.
    const issues = parsed.error.issues;
    const isAuthOnly =
      issues.length > 0 &&
      issues.every((i) => i.path[0] === "connectedAddress");
    if (isAuthOnly) {
      return Response.json(
        { error: "Wallet connection required" },
        { status: 401 },
      );
    }
    return Response.json(
      {
        error: "Invalid request body",
        issues: issues.slice(0, 3),
      },
      { status: 400 },
    );
  }
  const body: ChatPostBody = parsed.data;

  if (body.messages.length > MESSAGE_CAP) {
    return Response.json(
      { error: "Message cap reached. Start a new conversation." },
      { status: 400 },
    );
  }

  // Second-line validator: presence guaranteed by Zod, shape guaranteed here.
  // Malformed addresses (right-shape string, wrong content) return 401 to
  // match the missing-address case — both signal "frontend should re-prompt
  // for a real wallet connection."
  if (!ADDRESS_RE.test(body.connectedAddress)) {
    return Response.json(
      { error: "Wallet connection required" },
      { status: 401 },
    );
  }

  const client = new Anthropic({ apiKey });

  const apiMessages: Anthropic.MessageParam[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const systemBlocks = buildSystemBlocks(body.connectedAddress);
  const tools = buildCachedTools();

  // The route returns a streamed Response. We open the stream early so we can
  // forward final-round text deltas as they arrive from Anthropic. Tool rounds
  // run inside the stream's start() callback; the body sees only text deltas
  // (or, on a hard error, a single fallback message).
  return openStreamedResponse(async (write) => {
    try {
      await runToolLoop(client, apiMessages, systemBlocks, tools, write);
    } catch (err) {
      console.error(
        "[chat] route error:",
        err instanceof Error ? err.message : err,
      );
      // Don't leak stack traces to the wire. Empty deltas are fine; the
      // client treats stream-close as end-of-message.
      await write("\n\n[Chat request failed. Please try again.]");
    }
  });
}

type WriteFn = (text: string) => Promise<void>;

/**
 * Tool-use loop. Each round calls Claude; if the model emits tool_use blocks
 * we execute them server-side and feed `tool_result` back, then loop. When a
 * round emits no tool_use (either pure text or end_turn), that's the final
 * round and we stream its text deltas straight to the client.
 *
 * MAX_TOOL_ROUNDS rounds is a hard cap. If we exit the loop without a clean
 * resolution (model still trying to call tools after 5 rounds), we emit a
 * graceful fallback so the user sees something.
 */
async function runToolLoop(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
  systemBlocks: Anthropic.TextBlockParam[],
  tools: Anthropic.Tool[],
  write: WriteFn,
): Promise<void> {
  const apiMessages = [...messages];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const live = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemBlocks,
      tools,
      messages: apiMessages,
    });

    // Forward text deltas to the wire as they arrive. They may turn out to
    // belong to a tool_use round (where the model thinks aloud before calling
    // a tool); that text is part of the assistant turn and should reach the
    // user. lyfi behaves this way too — text + tool_use can interleave in
    // one response.
    live.on("text", (delta: string) => {
      // Fire-and-forget on the write — backpressure is handled by the
      // ReadableStream queue inside openStreamedResponse.
      void write(delta);
    });

    const final = await live.finalMessage();

    const toolUseBlocks = final.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (toolUseBlocks.length === 0) {
      // Terminal round — text already streamed, we're done.
      return;
    }

    // Append assistant turn (text + tool_use), then execute tools and append
    // tool_results.
    apiMessages.push({ role: "assistant", content: final.content });

    // Per-tool error isolation (chat-review-fixes.md B5). `executeTool` already
    // wraps its switch in try/catch, but the surrounding round-trip used
    // `Promise.all` which rejects the whole batch on a single thrown rejection.
    // The catch here makes that path identical to the inner-catch path: a
    // shaped `{error}` flows back to the model with `is_error: true`, so the
    // model can recover within the same turn instead of seeing the route
    // handler's generic fallback.
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (b) => {
        let result: unknown;
        try {
          result = await executeTool(b.name, b.input);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          result = { error: `Tool ${b.name} failed: ${message}` };
        }
        const isError =
          result !== null &&
          typeof result === "object" &&
          "error" in (result as Record<string, unknown>);
        return {
          type: "tool_result" as const,
          tool_use_id: b.id,
          content: JSON.stringify(result),
          is_error: isError,
        };
      }),
    );
    apiMessages.push({ role: "user", content: toolResults });
  }

  // 5 rounds of tool-use without a final text answer.
  await write(
    "\n\nI gathered some data but ran out of tool rounds before reaching a clean answer. Try a more specific question.",
  );
}

/**
 * Build a chunked text Response whose body is filled by the supplied async
 * producer via a write callback. Matches lyfi's wire shape (raw text bytes,
 * no SSE framing).
 */
function openStreamedResponse(
  produce: (write: WriteFn) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write: WriteFn = async (text) => {
        if (!text) return;
        controller.enqueue(encoder.encode(text));
      };
      try {
        await produce(write);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
