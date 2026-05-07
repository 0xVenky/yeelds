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
  connectedAddress?: string;
};
