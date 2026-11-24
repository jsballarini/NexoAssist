"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { MessageBubble } from "./message-bubble";
import { useChatStream } from "./use-chat-stream";

export function ChatWorkspace() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [input, setInput] = useState("");
  const { messages, streaming, draftAssistant, sendMessage, loadHistory } =
    useChatStream(conversationId);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/conversations/active");
      if (!res.ok) return;
      const data = (await res.json()) as {
        conversationId: string;
        messageCount: number;
      };
      setConversationId(data.conversationId);
      setMessageCount(data.messageCount);
      await loadHistory(data.conversationId);
    })();
  }, [loadHistory]);

  async function handleNewSession() {
    const res = await fetch("/api/conversations/active/new-session", {
      method: "POST",
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      conversationId: string;
      messageCount: number;
    };
    setConversationId(data.conversationId);
    setMessageCount(0);
    await loadHistory(data.conversationId);
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput("");
    await sendMessage(content);
    setMessageCount((c) => c + 1);
  }

  return (
    <div
      className="flex flex-1 flex-col"
      data-chat-ready={conversationId ? "true" : "false"}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <p className="text-xs text-gray-500">
          {messageCount}/30 mensagens nesta sessão
        </p>
        <Button type="button" variant="outline" size="sm" onClick={handleNewSession}>
          Nova sessão
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onQuickReply={handleSend} />
        ))}
        {streaming && draftAssistant ? (
          <div className="mr-auto max-w-[85%] rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
            {draftAssistant}
          </div>
        ) : null}
      </div>

      <form
        className="flex gap-2 border-t border-gray-200 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem…"
          disabled={streaming || !conversationId}
        />
        <Button
          type="submit"
          disabled={streaming || !conversationId || !input.trim()}
        >
          Enviar
        </Button>
      </form>
    </div>
  );
}