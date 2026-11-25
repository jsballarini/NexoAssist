"use client";

import { BareInput } from "@/components/ui/bare-input";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, ResetIcon } from "@/components/ui/icons";
import { MESSAGE_LIMIT } from "@/lib/conversation/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./message-bubble";
import { useChatStream } from "./use-chat-stream";

/** Coluna central do chat (≈600px no protótipo). */
const CHAT_COLUMN = "mx-auto w-full max-w-[600px] px-4";

const BANNER_TONE = {
  neutral: "border-nexo-rule bg-nexo-desk text-nexo-ink-2",
  warning: "border-nexo-warning/30 bg-nexo-warning-soft text-nexo-warning-text",
  success: "border-nexo-success/30 bg-nexo-success-soft text-nexo-success-text",
  danger: "border-nexo-danger/30 bg-nexo-danger-soft text-nexo-danger-text",
} as const;

function Banner({
  tone,
  role = "status",
  children,
}: {
  tone: keyof typeof BANNER_TONE;
  role?: "status" | "alert";
  children: React.ReactNode;
}) {
  return (
    <div className={`border-b px-4 py-2 text-center text-sm ${BANNER_TONE[tone]}`} role={role}>
      {children}
    </div>
  );
}

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
    <div className="space-y-5 animate-pulse" aria-hidden>
      <div className="ml-auto h-10 w-1/2 rounded-nexo-md bg-gray-200" />
      <div className="mr-auto h-16 w-2/3 rounded-nexo-md bg-gray-100" />
      <div className="mr-auto h-24 w-full rounded-nexo-lg bg-gray-100" />
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshMeta = useCallback(async (): Promise<ConvMeta | null> => {
    const res = await fetch("/api/conversations/active");
    if (!res.ok) return null;
    const data = (await res.json()) as ConvMeta;
    setConversationId(data.conversationId);
    setMeta(data);
    if (data.messageCount >= data.messageLimit) {
      setShowLimitModal(true);
    }
    return data;
  }, []);

  const applyMessageMeta = useCallback(
    (patch: {
      state: ConvMeta["state"];
      messageCount: number;
      messageLimit: number;
    }) => {
      setMeta((prev) => (prev ? { ...prev, ...patch } : prev));
      if (patch.messageCount >= patch.messageLimit) {
        setShowLimitModal(true);
      }
    },
    [],
  );

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
    sendHandoffMessage,
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
      const active = await refreshMeta();
      await loadSessions();
      if (cancelled || !active || viewingHistoryId) return;
      await loadHistory(active.conversationId);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadHistory, loadSessions, refreshMeta, viewingHistoryId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, streaming, draftAssistant]);

  const handoffActive =
    !viewingHistoryId &&
    meta?.state !== undefined &&
    (meta.state === "awaiting_analyst" || meta.state === "with_analyst");

  useEffect(() => {
    if (!handoffActive || !conversationId || streaming) return;
    const tick = async () => {
      const result = await loadHistory(conversationId, { silent: true });
      if (result.meta) applyMessageMeta(result.meta);
    };
    void tick();
    const id = setInterval(() => void tick(), handoffPollMs);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [conversationId, handoffActive, handoffPollMs, loadHistory, applyMessageMeta, streaming]);

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
    const active = await refreshMeta();
    if (active) await loadHistory(active.conversationId);
  }

  const historyMode = viewingHistoryId !== null;
  const awaiting = meta?.state === "awaiting_analyst";
  const withAnalyst = meta?.state === "with_analyst";

  async function handleSend(text?: string) {
    if (viewingHistoryId) return;
    const content = (text ?? input).trim();
    if (!content) return;
    setInput("");
    const result = withAnalyst ? await sendHandoffMessage(content) : await sendMessage(content);
    if (!result.ok) {
      if (result.code === "SESSION_MESSAGE_LIMIT" || result.status === 429) {
        setShowLimitModal(true);
      }
      await refreshMeta();
    }
  }
  const atLimit =
    meta && !withAnalyst ? meta.messageCount >= meta.messageLimit : false;
  const composerDisabled =
    historyMode || streaming || !conversationId || awaiting || atLimit;
  const composerPlaceholder = withAnalyst
    ? "Mensagem para o analista…"
    : "Escreva para o Nexo…";

  const showSkeleton = !conversationId || historyLoading;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      data-chat-ready={conversationId ? "true" : "false"}
      data-conversation-state={meta?.state ?? "with_agent"}
    >
      {historyMode ? (
        <Banner tone="neutral">
          Visualizando sessão anterior — somente leitura.{" "}
          <button type="button" className="font-medium underline" onClick={() => void handleBackToActive()}>
            Voltar à sessão ativa
          </button>
        </Banner>
      ) : null}
      {awaiting ? (
        <Banner tone="warning">Aguardando analista — o assistente automático está pausado.</Banner>
      ) : null}
      {withAnalyst ? (
        <Banner tone="success">Analista humano em atendimento — o assistente automático está pausado.</Banner>
      ) : null}
      {toast ? (
        <Banner tone="danger" role="alert">
          <span>{toast}</span>{" "}
          <button type="button" className="font-medium underline" onClick={clearToast}>
            Fechar
          </button>
        </Banner>
      ) : null}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className={`${CHAT_COLUMN} flex flex-col gap-5 py-8`}>
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
            <div className="space-y-1.5">
              <p className="text-xs text-nexo-ink-3" role="status">
                <span className="font-semibold text-nexo-ink">Nexo Assist</span> · Nexo está digitando…
              </p>
              {draftAssistant ? (
                <div className="max-w-[75%] rounded-nexo-md border border-nexo-rule bg-white px-3.5 py-2.5 text-sm text-nexo-ink-2">
                  {draftAssistant}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 bg-white pb-4">
        <div className={`${CHAT_COLUMN} space-y-2`}>
          {showLimitModal && !historyMode ? (
            <div className="rounded-nexo-md border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm text-brand-900">
              <p className="font-medium">Limite de 30 mensagens suas nesta sessão</p>
              <p className="mt-0.5 text-brand-800">Inicie uma nova sessão para continuar.</p>
              <Button type="button" size="sm" className="mt-2" onClick={handleNewSession}>
                Nova sessão
              </Button>
            </div>
          ) : null}
          <form
            className="flex items-center gap-2 rounded-nexo-md border border-nexo-rule bg-white p-1.5 pl-3.5 shadow-theme-xs focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/12"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <BareInput
              className="h-9"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={composerPlaceholder}
              aria-label={withAnalyst ? "Mensagem para o analista" : "Mensagem para o Nexo"}
              disabled={composerDisabled}
            />
            <Button
              type="submit"
              size="sm"
              className="bg-nexo-cta hover:bg-brand-900"
              disabled={composerDisabled || !input.trim()}
              aria-busy={streaming}
            >
              <ArrowUpIcon className="size-4" />
              {streaming ? "Enviando…" : "Enviar"}
            </Button>
          </form>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-nexo-ink-3">
            <div className="flex flex-wrap items-center gap-3">
              {sessions.length > 0 ? (
                <label className="flex items-center gap-1.5">
                  Histórico
                  <select
                    className="rounded-nexo-sm border border-nexo-rule bg-white px-1.5 py-0.5 text-xs text-nexo-ink-2"
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
              <button
                type="button"
                className="inline-flex items-center gap-1 font-medium text-nexo-ink-2 hover:text-brand-700"
                onClick={() => void handleNewSession()}
              >
                <ResetIcon className="size-3.5" />
                Nova sessão
              </button>
            </div>
            <p>
              {meta?.messageCount ?? 0}/{meta?.messageLimit ?? MESSAGE_LIMIT} mensagens nesta sessão
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}