import type { DraftSummary } from "./draft-types";

export type TurnHistoryRole = "user" | "assistant" | "system" | "analyst";

export type TurnHistoryMessage = {
  role: TurnHistoryRole;
  content: string;
};

/** Estado da conversa entregue ao agent a cada turno (sem acesso a persistência). */
export type TurnContext = {
  /** Mensagens anteriores em ordem cronológica; pode incluir a mensagem atual como última. */
  messages: TurnHistoryMessage[];
  pendingDraft?: DraftSummary;
  conversationState: string;
  focusedTicketId?: string;
};

export type ModelMessage = {
  role: "user" | "assistant";
  content: string;
};

export const EMPTY_TURN_CONTEXT: TurnContext = {
  messages: [],
  conversationState: "with_agent",
};

/**
 * Converte o histórico em mensagens para o modelo.
 * Remove a mensagem atual duplicada, descarta falas de analista, resume `system`
 * como nota curta e mantém só as últimas `maxMessages`.
 */
export function buildModelMessages(
  turnContext: TurnContext,
  currentUserMessage: string,
  maxMessages: number,
): ModelMessage[] {
  const history = [...turnContext.messages];
  const last = history[history.length - 1];
  if (last && last.role === "user" && last.content === currentUserMessage) {
    history.pop();
  }

  const mapped: ModelMessage[] = [];
  for (const m of history) {
    if (m.role === "analyst") continue;
    if (m.role === "system") {
      mapped.push({ role: "assistant", content: `[nota do sistema] ${m.content}` });
      continue;
    }
    mapped.push({ role: m.role, content: m.content });
  }

  const limit = Math.max(0, maxMessages);
  const window = limit === 0 ? [] : mapped.slice(-limit);
  return [...window, { role: "user", content: currentUserMessage }];
}

/** Resumo textual do estado não conversacional, anexado às instruções do modelo. */
export function describeTurnState(turnContext: TurnContext): string {
  const lines: string[] = [];
  if (turnContext.pendingDraft) {
    const d = turnContext.pendingDraft;
    lines.push(
      `Rascunho pendente: ${d.draftId} (${d.operation}) "${d.title}", prioridade ${d.priority}` +
        (d.affectedScope ? `, afetados ${d.affectedScope}` : "") +
        (d.targetTicketId ? `, chamado ${d.targetTicketId}` : "") +
        ".",
    );
  }
  if (turnContext.focusedTicketId) {
    lines.push(`Chamado em foco na conversa: ${turnContext.focusedTicketId}.`);
  }
  return lines.length > 0 ? lines.join("\n") : "Sem rascunho pendente nem chamado em foco.";
}
