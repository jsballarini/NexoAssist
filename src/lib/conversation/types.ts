export type UiBlock =
  | {
      type: "ticket_card";
      ticketId: string;
      title: string;
      statusLabel: string;
      slaBreached: boolean;
    }
  | { type: "kb_chips"; articles: { slug: string; title: string }[] }
  | { type: "confidence"; value: number }
  | { type: "quick_replies"; options: string[] };

export type AgentTracePayload = {
  understanding: string;
  actions: string[];
  confidence: number;
  rulesFired: string[];
  evidence: { type: string; id: string; excerpt?: string }[];
};

export type SseEvent =
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
  | { event: "error"; data: { code: string; message: string } };

export const MESSAGE_LIMIT = 30;