import type { Metadata } from "next";
import { ChatInterface } from "@/components/ChatInterface";

export const metadata: Metadata = {
  title: "Chat — Yeelds",
};

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return <ChatInterface />;
}
