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

type SessionItem = {
  conversationId: string;
  sessionSequence: number;
  state: string;
  updatedAt: string;
  preview: string;
};

function MessageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden>
      <div className="mr-auto h-16 w-2/3 rounded-2xl bg-gray-200" />
      <div className="ml-auto h-12 w-1/2 rounded-2xl bg-gray-300" />
      <div className="mr-auto h-20 w-3/4 rounded-2xl bg-gray-200" />
    </div>
  );
}

export function ChatWorkspace({ handoffPollMs = 2000 }: { handoffPollMs?: number }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [meta, setMeta] = useState<ConvMeta | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
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

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/conversations/sessions");
    if (!res.ok) return;
    const data = (await res.json()) as { items: SessionItem[] };
    setSessions(data.items);
  }, []);

  const {
    messages,
    historyLoading,
    streaming,
    draftAssistant,
    toast,
    clearToast,
    sendMessage,
    loadHistory,
    confirmDraft,
    cancelDraft,
    updateDraft,
  } = useChatStream(conversationId, () => {
    void refreshMeta();
    void loadSessions();
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refreshMeta();
      await loadSessions();
      if (cancelled) return;
      const res = await fetch("/api/conversations/active");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as ConvMeta;
      if (!viewingHistoryId) {
        await loadHistory(data.conversationId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadHistory, loadSessions, refreshMeta, viewingHistoryId]);

  const handoffActive =
    !viewingHistoryId &&
    meta?.state !== undefined &&
    (meta.state === "awaiting_analyst" || meta.state === "with_analyst");

  useEffect(() => {
    if (!handoffActive || !conversationId || streaming) return;
    const tick = () => {
      void loadHistory(conversationId, { silent: true });
      void refreshMeta();
    };
    tick();
    const id = setInterval(tick, handoffPollMs);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [conversationId, handoffActive, handoffPollMs, loadHistory, refreshMeta, streaming]);

  async function handleNewSession() {
    const res = await fetch("/api/conversations/active/new-session", {
      method: "POST",
    });
    if (!res.ok) return;
    const data = (await res.json()) as ConvMeta;
    setViewingHistoryId(null);
    setConversationId(data.conversationId);
    setMeta(data);
    setShowLimitModal(false);
    await loadHistory(data.conversationId);
    await loadSessions();
  }

  async function handleSelectHistory(id: string) {
    setViewingHistoryId(id);
    await loadHistory(id);
  }

  async function handleBackToActive() {
    setViewingHistoryId(null);
    await refreshMeta();
    const res = await fetch("/api/conversations/active");
    if (!res.ok) return;
    const data = (await res.json()) as ConvMeta;
    await loadHistory(data.conversationId);
  }

  async function handleSend(text?: string) {
    if (viewingHistoryId) return;
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

  const historyMode = viewingHistoryId !== null;
  const awaiting = meta?.state === "awaiting_analyst";
  const withAnalyst = meta?.state === "with_analyst";
  const atLimit = meta ? meta.messageCount >= meta.messageLimit : false;
  const composerDisabled =
    historyMode ||
    streaming ||
    !conversationId ||
    awaiting ||
    withAnalyst ||
    atLimit;

  const showSkeleton = !conversationId || historyLoading;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      data-chat-ready={conversationId ? "true" : "false"}
      data-conversation-state={meta?.state ?? "with_agent"}
    >
      {historyMode ? (
        <div
          className="border-b border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-800"
          role="status"
        >
          Visualizando sessão anterior — somente leitura.{" "}
          <button type="button" className="font-medium underline" onClick={() => void handleBackToActive()}>
            Voltar à sessão ativa
          </button>
        </div>
      ) : null}
      {awaiting ? (
        <div
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
          role="status"
        >
          Aguardando analista — o assistente automático está pausado.
        </div>
      ) : null}
      {withAnalyst ? (
        <div
          className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900"
          role="status"
        >
          Analista humano em atendimento — o assistente automático está pausado.
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2">
        <p className="text-xs text-gray-500">
          {meta?.messageCount ?? 0}/{meta?.messageLimit ?? 30} mensagens suas nesta sessão
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {sessions.length > 0 ? (
            <label className="flex items-center gap-1 text-xs text-gray-600">
              Histórico
              <select
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                value={viewingHistoryId ?? ""}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) void handleBackToActive();
                  else void handleSelectHistory(id);
                }}
              >
                <option value="">Sessão ativa</option>
                {sessions.map((s) => (
                  <option key={s.conversationId} value={s.conversationId}>
                    Sessão {s.sessionSequence} — {s.preview.slice(0, 40)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={handleNewSession}>
            Nova sessão
          </Button>
        </div>
      </div>

      {showLimitModal && !historyMode ? (
        <div className="border-b border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <p className="font-medium">Limite de 30 mensagens suas nesta sessão</p>
          <p className="mt-1 text-brand-800">Inicie uma nova sessão para continuar.</p>
          <Button type="button" size="sm" className="mt-2" onClick={handleNewSession}>
            Nova sessão
          </Button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {showSkeleton ? <MessageSkeleton /> : null}
        {!showSkeleton
          ? messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onQuickReply={historyMode ? undefined : handleSend}
                onConfirmDraft={historyMode ? undefined : confirmDraft}
                onCancelDraft={historyMode ? undefined : cancelDraft}
                onSaveDraft={historyMode ? undefined : updateDraft}
              />
            ))
          : null}
        {streaming ? (
          <>
            <p className="text-xs text-gray-500" role="status">
              Nexo está digitando…
            </p>
            {draftAssistant ? (
              <div className="mr-auto max-w-[85%] rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                {draftAssistant}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <form
        className="flex shrink-0 gap-2 border-t border-gray-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreva para o Nexo…"
          disabled={composerDisabled}
        />
        <Button
          type="submit"
          disabled={composerDisabled || !input.trim()}
          aria-busy={streaming}
        >
          {streaming ? "Enviando…" : "Enviar"}
        </Button>
      </form>
    </div>
  );
}