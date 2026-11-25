/** Tipos de visão do console do analista (formato das respostas de `/api/analyst/*`). */

export type ThreadMessage = {
  id: string;
  role: string;
  authorName?: string;
  content: string;
  createdAt: string;
};

export type TraceItem = {
  messageId: string;
  content: string;
  trace: {
    understanding: string;
    actions: string[];
    confidence: number;
    rulesFired: string[];
    evidence?: { type: string; id: string; excerpt?: string }[];
    rawToolCalls?: string[] | null;
    reasoning?: string;
    usage?: { promptTokens: number; completionTokens: number; latencyMs: number } | null;
    durationMs?: number;
  };
};

export type PanelTicket = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  priority: string;
  categoryLabel?: string;
  slaBreached: boolean;
  openedAt: string;
  resolvedAt?: string | null;
};

export type TicketCounts = { open: number; closed: number };
