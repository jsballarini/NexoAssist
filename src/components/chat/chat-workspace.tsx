"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useState } from "react";
import { MessageBubble } from "./message-bubble";
import { useChatStream } from "./use-chat-stream";

type ConvMeta = {
  conversationId: string;
  messageCount: number;
  messageLimit: number;
  state: "with_agent" | "awaiting_analyst" | "with_analyst" | "closed";
};

export function ChatWorkspace() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [meta, setMeta] = useState<ConvMeta | null>(null);
  const [input, setInput] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);

  const refreshMeta = useCallback(async () => {
    const res = await fetch("/api/conversations/active");
    if (!res.ok) return;
    const data = (await res.json()) as ConvMeta;
    setConversationId(data.conversationId);
    setMeta(data);
    if (data.messageCount >= data.messageLimit) {
      setShowLimitModal(true);
    }
  }, []);

  const {
    messages,
    streaming,
    draftAssistant,
    toast,
    clearToast,
    sendMessage,
    loadHistory,
    confirmDraft,
    cancelDraft,
  } = useChatStream(conversationId, () => {
    void refreshMeta();
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refreshMeta();
      if (cancelled) return;
      const res = await fetch("/api/conversations/active");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as ConvMeta;
      await loadHistory(data.conversationId);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadHistory, refreshMeta]);

  async function handleNewSession() {
    const res = await fetch("/api/conversations/active/new-session", {
      method: "POST",
    });
    if (!res.ok) return;
    const data = (await res.json()) as ConvMeta;
    setConversationId(data.conversationId);
    setMeta(data);
    setShowLimitModal(false);
    await loadHistory(data.conversationId);
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput("");
    const result = await sendMessage(content);
    if (!result.ok) {
      if (result.code === "SESSION_MESSAGE_LIMIT" || result.status === 429) {
        setShowLimitModal(true);
      }
      await refreshMeta();
    }
  }

  const awaiting = meta?.state === "awaiting_analyst";
  const atLimit = meta ? meta.messageCount >= meta.messageLimit : false;
  const composerDisabled = streaming || !conversationId || awaiting || atLimit;

  return (
    <div
      className="flex flex-1 flex-col"
      data-chat-ready={conversationId ? "true" : "false"}
      data-conversation-state={meta?.state ?? "with_agent"}
    >
      {awaiting ? (
        <div
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
          role="status"
        >
          Aguardando analista — o assistente automático está pausado.
        </div>
      ) : null}

      {toast ? (
        <div
          className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
          role="alert"
        >
          <span>{toast}</span>
          <button type="button" className="underline" onClick={clearToast}>
            Fechar
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <p className="text-xs text-gray-500">
          {meta?.messageCount ?? 0}/{meta?.messageLimit ?? 30} mensagens suas nesta sessão
        </p>
        <Button type="button" variant="outline" size="sm" onClick={handleNewSession}>
          Nova sessão
        </Button>
      </div>

      {showLimitModal ? (
        <div className="border-b border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <p className="font-medium">Limite de 30 mensagens suas nesta sessão</p>
          <p className="mt-1 text-brand-800">Inicie uma nova sessão para continuar.</p>
          <Button type="button" size="sm" className="mt-2" onClick={handleNewSession}>
            Nova sessão
          </Button>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            onQuickReply={handleSend}
            onConfirmDraft={confirmDraft}
            onCancelDraft={cancelDraft}
          />
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
          disabled={composerDisabled}
        />
        <Button type="submit" disabled={composerDisabled || !input.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}