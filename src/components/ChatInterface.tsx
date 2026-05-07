"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ChatMessage } from "./ChatMessage";

// Inlined per Phase B dispatch — Mario owns the canonical types.ts in Phase A.
// Post-merge cleanup can swap to a shared import.
type ChatMessageT = { role: "user" | "assistant"; content: string };

// Plan canonical prompts — docs/plans/chatbot.md lines 67-72.
const SUGGESTED_PROMPTS = [
  "Where are the best USDC yields on Base?",
  "What could I be earning on assets in my wallet?",
  "Compare Steakhouse PYUSD vs. Aave V3 USDC.",
  "Show me low-risk stablecoin vaults across all chains.",
];

const MESSAGE_CAP_ERROR = "Message cap reached. Start a new conversation.";

// Per-chunk inactivity timeout for the streaming response. Measures the gap
// between successive chunks, not from request start — first-chunk latency on
// a slow tool round can exceed total request budgets, but once data starts
// flowing each chunk should arrive promptly. 30s gives slow tool rounds room
// without leaving ThinkingIndicator stuck forever on a server stall.
const STREAM_CHUNK_TIMEOUT_MS = 30_000;
const STREAM_TIMEOUT_MESSAGE =
  "The response took too long. Please try again.";

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageT[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [capReached, setCapReached] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const walletConnected = !!account.address;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function resetConversation() {
    setMessages([]);
    setCapReached(false);
    inputRef.current?.focus();
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading || capReached) return;

    const userMessage: ChatMessageT = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Body shape matches POST /api/v1/chat contract in docs/plans/chatbot.md.
      // Omit connectedAddress when wallet is disconnected — do not pass null/"".
      const payload: {
        messages: ChatMessageT[];
        connectedAddress?: string;
      } = { messages: newMessages };
      if (account.address) {
        payload.connectedAddress = account.address;
      }

      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // 401 = wallet got disconnected mid-session (server's Layer 2 gate).
        // Roll back the optimistic user message and re-open the connect modal
        // instead of surfacing as an assistant message.
        if (res.status === 401) {
          setMessages(messages);
          setInput(text.trim());
          if (openConnectModal) openConnectModal();
          return;
        }
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        const errorText = err.error ?? "Something went wrong. Please try again.";
        const isCap = errorText === MESSAGE_CAP_ERROR;
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: errorText,
          },
        ]);
        if (isCap) setCapReached(true);
        return;
      }

      // Streaming: chunked-fetch + ReadableStream + TextDecoder.
      // Ported verbatim from lyfi/src/components/ChatInterface.tsx — the
      // server returns plain text chunks, no SSE framing.
      const reader = res.body?.getReader();
      if (!reader) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "No response received." },
        ]);
        return;
      }

      const decoder = new TextDecoder();
      let assistantContent = "";
      let timedOut = false;

      // Add empty assistant message that we'll update as chunks arrive.
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      try {
        while (true) {
          // New timer per iteration — measures gap between chunks. If a
          // chunk arrives in time we clearTimeout in the finally below; if
          // it doesn't, the race resolves with __timeout and we bail out.
          let timeoutId: ReturnType<typeof setTimeout> | undefined;
          const timeoutPromise = new Promise<{ __timeout: true }>((resolve) => {
            timeoutId = setTimeout(
              () => resolve({ __timeout: true }),
              STREAM_CHUNK_TIMEOUT_MS
            );
          });

          let result: ReadableStreamReadResult<Uint8Array> | { __timeout: true };
          try {
            result = await Promise.race([reader.read(), timeoutPromise]);
          } finally {
            if (timeoutId !== undefined) clearTimeout(timeoutId);
          }

          if ("__timeout" in result) {
            timedOut = true;
            break;
          }

          if (result.done) break;
          assistantContent += decoder.decode(result.value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantContent,
            };
            return updated;
          });
        }
      } finally {
        // Idempotent — cancel() is a no-op if the reader already drained.
        // Wrapped because the spec rejects cancel() on a released reader and
        // we don't want a stray rejection during the success path.
        try {
          await reader.cancel();
        } catch {
          // ignore — abort is best-effort once the loop has exited.
        }
      }

      if (timedOut) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: STREAM_TIMEOUT_MESSAGE,
          };
          return updated;
        });
        return;
      }

      // Final fallback if the stream produced nothing.
      if (!assistantContent.trim()) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "I couldn't generate a response. Please try again.",
          };
          return updated;
        });
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Network error. Please check your connection and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isEmpty = messages.length === 0;
  const lastMessage = messages[messages.length - 1];
  const showThinking = isLoading && lastMessage?.role === "user";
  const isStreaming =
    isLoading &&
    lastMessage?.role === "assistant" &&
    lastMessage.content.length > 0;

  return (
    // Layout: TopBar (h-14 = 56px) + DisclaimerBanner ≈ ~80px. Use min-h-0
    // and flex-1 so the chat fills remaining viewport without overflow.
    <div
      className="flex flex-col h-[calc(100vh-56px)]"
      style={{
        backgroundColor: "var(--surface)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {isEmpty ? (
            <EmptyState
              onSelect={(prompt) => {
                if (!walletConnected) {
                  if (openConnectModal) openConnectModal();
                  return;
                }
                sendMessage(prompt);
              }}
              walletConnected={walletConnected}
            />
          ) : (
            messages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
                streaming={
                  i === messages.length - 1 &&
                  msg.role === "assistant" &&
                  isStreaming
                }
              />
            ))
          )}

          {showThinking && <ThinkingIndicator />}

          {capReached && (
            <div className="flex justify-center pt-2">
              <button
                onClick={resetConversation}
                className="px-5 py-2.5 rounded-2xl text-sm font-medium transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--on-primary)",
                }}
              >
                Start a new conversation
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div
        className="px-4 py-4 sm:px-6"
        style={{ backgroundColor: "var(--surface-container-low)" }}
      >
        <div className="max-w-3xl mx-auto">
          {walletConnected ? (
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  capReached
                    ? "Start a new conversation to continue."
                    : "Ask about yields, vaults, or your wallet..."
                }
                disabled={isLoading}
                rows={1}
                className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm focus:outline-none focus:[box-shadow:0_0_0_2px_var(--primary)] disabled:opacity-50"
                style={{
                  backgroundColor: "var(--surface-container-lowest)",
                  color: "var(--on-surface)",
                }}
                aria-label="Chat input"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim() || capReached}
                className="px-5 py-3 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--on-primary)",
                }}
              >
                Send
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (openConnectModal) openConnectModal();
              }}
              className="w-full px-5 py-3 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--on-primary)",
              }}
            >
              Connect wallet to chat
            </button>
          )}
        </div>
        <p
          className="text-center text-[10px] mt-2"
          style={{ color: "var(--outline)" }}
        >
          Yields change; this isn&apos;t financial advice. Always verify before depositing.
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  onSelect,
  walletConnected,
}: {
  onSelect: (prompt: string) => void;
  walletConnected: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-lg shadow-purple-500/20">
          <span
            className="material-symbols-outlined text-white"
            style={{ fontSize: 28 }}
            aria-hidden="true"
          >
            forum
          </span>
        </div>
        <h2
          className="text-2xl font-bold font-[family-name:var(--font-manrope)]"
          style={{ color: "var(--on-surface)" }}
        >
          Yeelds Chat
        </h2>
        <p
          className="text-sm max-w-md mx-auto leading-relaxed"
          style={{ color: "var(--on-surface-variant)" }}
        >
          Ask about vaults, compare yields across chains, or get yield ideas
          for the assets in your wallet.
        </p>
        {walletConnected && (
          <p
            className="text-xs uppercase tracking-[0.15em] font-semibold font-[family-name:var(--font-manrope)]"
            style={{ color: "var(--secondary)" }}
          >
            Wallet connected &mdash; portfolio prompts ready
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="group text-left px-5 py-4 rounded-2xl text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              backgroundColor: "var(--surface-container-lowest)",
              color: "var(--on-surface)",
              boxShadow: "0 2px 8px rgba(25, 28, 30, 0.04)",
            }}
          >
            <span className="block font-medium leading-snug">{prompt}</span>
            <span
              className="block mt-2 text-[10px] uppercase tracking-[0.2em] font-semibold opacity-0 group-hover:opacity-100 transition-opacity font-[family-name:var(--font-manrope)]"
              style={{ color: "var(--primary)" }}
            >
              Ask &rarr;
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-[2rem] rounded-bl-md px-5 py-4"
        style={{ backgroundColor: "var(--surface-container-low)" }}
      >
        <div className="flex space-x-1.5" aria-label="Assistant is thinking">
          <Dot delayMs={0} />
          <Dot delayMs={150} />
          <Dot delayMs={300} />
        </div>
      </div>
    </div>
  );
}

function Dot({ delayMs }: { delayMs: number }) {
  return (
    <div
      className="w-2 h-2 rounded-full animate-bounce"
      style={{
        backgroundColor: "var(--primary)",
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}
