import type { TurnContext, TurnHistoryRole } from "../../../lib/agent/turn-context";
import { createTicketServiceClient } from "@/lib/ticket-service";
import { getConversationById, listRecentMessages } from "./repository";

/** Margem para o histórico incluir mensagens além da janela enviada ao modelo. */
const HISTORY_FETCH_PADDING = 2;

type EvidenceItem = { type?: string; id?: string };

function lastTicketEvidence(evidence: unknown): string | undefined {
  if (!Array.isArray(evidence)) return undefined;
  for (let i = evidence.length - 1; i >= 0; i--) {
    const item = evidence[i] as EvidenceItem;
    if (item?.type === "ticket" && typeof item.id === "string") return item.id;
  }
  return undefined;
}

/**
 * Monta o contexto do turno: histórico recente, rascunho pendente, estado da
 * conversa e chamado em foco (último chamado citado nas evidências do assistente).
 */
export async function loadTurnContext(
  conversationId: string,
  userId: string,
  options: { maxMessages: number },
): Promise<TurnContext> {
  const [conversation, rows, pendingDraft] = await Promise.all([
    getConversationById(conversationId),
    listRecentMessages(conversationId, options.maxMessages + HISTORY_FETCH_PADDING),
    createTicketServiceClient().findPendingDraft(userId),
  ]);

  let focusedTicketId: string | undefined;
  for (let i = rows.length - 1; i >= 0 && !focusedTicketId; i--) {
    const row = rows[i];
    if (row.role === "assistant") {
      focusedTicketId = lastTicketEvidence(row.agentTrace?.evidence);
    }
  }
  focusedTicketId ??= pendingDraft?.targetTicketId;

  return {
    messages: rows.map((m) => ({
      role: m.role as TurnHistoryRole,
      content: m.content,
    })),
    pendingDraft: pendingDraft ?? undefined,
    conversationState: conversation?.state ?? "with_agent",
    focusedTicketId,
  };
}
