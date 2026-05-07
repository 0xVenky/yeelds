// Chat types — canonical shapes shared by the route handler and (eventually) the
// frontend ChatInterface. Pixel currently inlines its own copy; that's fine —
// a small post-launch cleanup will dedupe.

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatPostBody = {
  messages: ChatMessage[];
  // Required — backend rejects with 401 when missing or malformed
  // (chat-review-fixes.md A2 Layer 2).
  connectedAddress: string;
};
