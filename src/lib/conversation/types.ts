export type UiBlock =
  | {
      type: "ticket_card";
      ticketId: string;
      title: string;
      statusLabel: string;
      slaBreached: boolean;
    }
  | {
      type: "draft_card";
      draftId: string;
      operation: "create" | "update" | "reopen";
      title: string;
      priority: string;
      dueAtPreview: string;
      affectedScope?: string;
    }
  | { type: "kb_chips"; articles: { slug: string; title: string }[] }
  | { type: "confidence"; value: number }
  | { type: "quick_replies"; options: string[] }
  | {
      type: "ticket_selector";
      tickets: {
        ticketId: string;
        title: string;
        statusLabel: string;
        openedAt: string;
        slaBreached?: boolean;
      }[];
    };

export class SessionMessageLimitError extends Error {
  readonly code = "SESSION_MESSAGE_LIMIT";
  constructor() {
    super("Limite de 30 mensagens suas nesta sessão atingido");
    this.name = "SessionMessageLimitError";
  }
}

export class ConversationAwaitingAnalystError extends Error {
  readonly code = "CONVERSATION_AWAITING_ANALYST";
  constructor() {
    super("Conversa aguardando analista");
    this.name = "ConversationAwaitingAnalystError";
  }
}

export class ConversationWithAnalystError extends Error {
  readonly code = "CONVERSATION_WITH_ANALYST";
  constructor() {
    super("Conversa em atendimento com analista humano");
    this.name = "ConversationWithAnalystError";
  }
}

export type AgentTracePayload = {
  understanding: string;
  actions: string[];
  confidence: number;
  rulesFired: string[];
  evidence: { type: string; id: string; excerpt?: string }[];
};

export type SseEvent =
  | { event: "ready"; data: { turnId: string } }
  | { event: "trace"; data: AgentTracePayload }
  | { event: "token"; data: { delta: string } }
  | {
      event: "message";
      data: {
        id?: string;
        role: "assistant";
        content: string;
        uiBlocks: UiBlock[];
        trace?: AgentTracePayload;
      };
    }
  | { event: "done"; data: { messageId: string } }
  | { event: "agent_error"; data: { code: string; message: string } };

export const MESSAGE_LIMIT = 30;