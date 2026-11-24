"use client";

import { useCallback, useRef, useState } from "react";
import type { UiBlock } from "@/lib/conversation/types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  uiBlocks?: UiBlock[];
  trace?: {
    understanding: string;
    actions: string[];
    confidence: number;
    rulesFired: string[];
  };
};

export function useChatStream(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [draftAssistant, setDraftAssistant] = useState("");
  const esRef = useRef<EventSource | null>(null);

  const loadHistory = useCallback(async (convId: string) => {
    const res = await fetch(`/api/conversations/${convId}/messages`);
    if (!res.ok) return;
    const data = (await res.json()) as { items: ChatMessage[] };
    setMessages(
      data.items.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        uiBlocks: m.uiBlocks,
        trace: m.trace ?? undefined,
      })),
    );
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) return;

      const turnId = crypto.randomUUID();
      const userId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", content },
      ]);
      setStreaming(true);
      setDraftAssistant("");

      esRef.current?.close();
      const es = new EventSource(
        `/api/conversations/${conversationId}/stream?turnId=${encodeURIComponent(turnId)}`,
      );
      esRef.current = es;

      let assistantContent = "";
      let uiBlocks: UiBlock[] | undefined;
      let trace: ChatMessage["trace"];

      const attachListeners = () => {
        es.addEventListener("token", (ev) => {
          const data = JSON.parse((ev as MessageEvent).data) as { delta: string };
          assistantContent += data.delta;
          setDraftAssistant(assistantContent);
        });
        es.addEventListener("trace", (ev) => {
          const data = JSON.parse((ev as MessageEvent).data) as NonNullable<ChatMessage["trace"]> & {
            understanding: string;
          };
          trace = data;
        });
        es.addEventListener("message", (ev) => {
          const data = JSON.parse((ev as MessageEvent).data) as {
            content: string;
            uiBlocks: UiBlock[];
            trace?: ChatMessage["trace"];
          };
          assistantContent = data.content;
          uiBlocks = data.uiBlocks;
          trace = data.trace ?? trace;
          setDraftAssistant(assistantContent);
        });
        es.addEventListener("done", (ev) => {
          const data = JSON.parse((ev as MessageEvent).data) as { messageId: string };
          setMessages((prev) => [
            ...prev,
            {
              id: data.messageId,
              role: "assistant",
              content: assistantContent,
              uiBlocks,
              trace,
            },
          ]);
          setDraftAssistant("");
          setStreaming(false);
          es.close();
        });
        es.addEventListener("error", () => {
          setStreaming(false);
          es.close();
        });
      };

      attachListeners();

      const res = await fetch("/api/conversations/active/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, turnId }),
      });

      if (!res.ok) {
        setStreaming(false);
        es.close();
      }
    },
    [conversationId],
  );

  return {
    messages,
    streaming,
    draftAssistant,
    sendMessage,
    loadHistory,
    setMessages,
  };
}