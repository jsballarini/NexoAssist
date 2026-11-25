"use client";

import { useCallback, useRef, useState } from "react";
import type { UiBlock } from "@/lib/conversation/types";
import type { SaveDraftResult } from "./draft-card";
import { blockFromSummary, type DraftBlock } from "./draft-edit";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "analyst";
  authorName?: string;
  content: string;
  uiBlocks?: UiBlock[];
  trace?: {
    understanding: string;
    actions: string[];
    confidence: number;
    rulesFired: string[];
    evidence?: { type: string; id: string; excerpt?: string }[];
    reasoning?: string;
    usage?: { promptTokens: number; completionTokens: number; latencyMs: number } | null;
  };
};

/** Metadados da conversa devolvidos junto com o histórico de mensagens. */
export type ConversationMessageMeta = {
  state: "with_agent" | "awaiting_analyst" | "with_analyst" | "closed";
  messageCount: number;
  messageLimit: number;
};

type SendResult =
  | { ok: true }
  | { ok: false; code?: string; message: string; status: number };

export function useChatStream(
  conversationId: string | null,
  onAfterTurn?: () => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [draftAssistant, setDraftAssistant] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const loadHistory = useCallback(
    async (
      convId: string,
      options?: { silent?: boolean },
    ): Promise<{ ok: boolean; meta?: ConversationMessageMeta }> => {
      if (!options?.silent) setHistoryLoading(true);
      try {
        const res = await fetch(`/api/conversations/${convId}/messages`);
        if (!res.ok) return { ok: false };
        const data = (await res.json()) as {
          items: ChatMessage[];
          meta?: ConversationMessageMeta;
        };
        setMessages(
          data.items.map((m) => ({
            id: m.id,
            role: m.role as ChatMessage["role"],
            authorName: m.authorName,
            content: m.content,
            uiBlocks: m.uiBlocks,
            trace: m.trace ?? undefined,
          })),
        );
        return { ok: true, meta: data.meta };
      } finally {
        if (!options?.silent) setHistoryLoading(false);
      }
    },
    [],
  );

  const sendMessage = useCallback(
    async (content: string): Promise<SendResult> => {
      if (!conversationId || !content.trim()) {
        return { ok: false, message: "Conversa indisponível", status: 0 };
      }

      const turnId = crypto.randomUUID();
      const userId = crypto.randomUUID();

      setMessages((prev) => [...prev, { id: userId, role: "user", content }]);
      setStreaming(true);
      setDraftAssistant("");

      const convId = conversationId;
      esRef.current?.close();
      const es = new EventSource(
        `/api/conversations/${convId}/stream?turnId=${encodeURIComponent(turnId)}`,
      );
      esRef.current = es;

      let assistantContent = "";
      let uiBlocks: UiBlock[] | undefined;
      let trace: ChatMessage["trace"];
      let turnFinished = false;

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
          turnFinished = true;
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
          onAfterTurn?.();
        });
        es.addEventListener("agent_error", (ev) => {
          const data = JSON.parse((ev as MessageEvent).data) as { message?: string };
          turnFinished = true;
          setToast(data.message ?? "Erro ao processar mensagem.");
          setStreaming(false);
          es.close();
        });
        es.addEventListener("error", () => {
          setStreaming(false);
          es.close();
        });
      };

      attachListeners();

      try {
        await new Promise<void>((resolve, reject) => {
          const onOpen = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error("Não foi possível conectar ao stream do assistente."));
          };
          const cleanup = () => {
            es.removeEventListener("open", onOpen);
            es.removeEventListener("error", onError);
          };
          es.addEventListener("open", onOpen);
          es.addEventListener("error", onError);
        });
      } catch {
        setStreaming(false);
        es.close();
        return { ok: false, message: "Falha de conexão SSE", status: 0 };
      }

      const res = await fetch("/api/conversations/active/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, turnId }),
      });

      if (!res.ok) {
        setStreaming(false);
        es.close();
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        const message = body.error ?? "Não foi possível enviar a mensagem";
        if (res.status === 503) {
          setToast("Sistema de chamados temporariamente indisponível. Tente novamente em instantes.");
        }
        return { ok: false, message, code: body.code, status: res.status };
      }

      await Promise.race([
        new Promise<void>((resolve) => {
          if (turnFinished) {
            resolve();
            return;
          }
          const finish = () => {
            es.removeEventListener("done", finish);
            es.removeEventListener("agent_error", finish);
            resolve();
          };
          es.addEventListener("done", finish);
          es.addEventListener("agent_error", finish);
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 45_000)),
      ]);

      if (!turnFinished) {
        es.close();
        setStreaming(false);
        await loadHistory(convId);
        onAfterTurn?.();
      }

      return { ok: true };
    },
    [conversationId, loadHistory, onAfterTurn],
  );

  async function confirmDraft(draftId: string): Promise<boolean> {
    if (!conversationId) return false;
    const res = await fetch(`/api/tickets/drafts/${encodeURIComponent(draftId)}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    });
    if (res.status === 503) {
      setToast("Sistema de chamados temporariamente indisponível. Tente novamente em instantes.");
      return false;
    }
    if (!res.ok) return false;
    await loadHistory(conversationId);
    onAfterTurn?.();
    return true;
  }

  async function cancelDraft(draftId: string): Promise<boolean> {
    const res = await fetch(`/api/tickets/drafts/${encodeURIComponent(draftId)}/cancel`, {
      method: "POST",
    });
    if (res.status === 503) {
      setToast("Sistema de chamados temporariamente indisponível.");
      return false;
    }
    if (!res.ok) return false;
    if (conversationId) await loadHistory(conversationId);
    return true;
  }

  async function updateDraft(
    block: DraftBlock,
    patch: Record<string, string>,
  ): Promise<SaveDraftResult> {
    const res = await fetch(`/api/tickets/drafts/${encodeURIComponent(block.draftId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.status === 503) {
      return { ok: false, error: "Sistema de chamados temporariamente indisponível. Tente novamente." };
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: string[] };
      const fields = data.fields?.length ? ` (${data.fields.join(", ")})` : "";
      return { ok: false, error: `${data.error ?? "Não foi possível salvar o rascunho"}${fields}` };
    }
    const summary = (await res.json()) as Parameters<typeof blockFromSummary>[1];
    setMessages((prev) =>
      prev.map((m) => ({
        ...m,
        uiBlocks: m.uiBlocks?.map((b) =>
          b.type === "draft_card" && b.draftId === block.draftId ? blockFromSummary(b, summary) : b,
        ),
      })),
    );
    return { ok: true };
  }

  return {
    messages,
    historyLoading,
    streaming,
    draftAssistant,
    toast,
    clearToast: () => setToast(null),
    sendMessage,
    loadHistory,
    confirmDraft,
    cancelDraft,
    updateDraft,
  };
}