import type { TicketDetail, TicketSummary } from "../../src/lib/ticket-service/types";

export type KbArticleHit = {
  slug: string;
  title: string;
  excerpt: string;
};

export type TicketClient = {
  listOpen(requesterId: string): Promise<TicketSummary[]>;
  listRecentResolved(requesterId: string, withinDays?: number): Promise<TicketSummary[]>;
  getById(requesterId: string, publicId: string): Promise<TicketDetail>;
};

export type KbSearch = (query: string) => Promise<KbArticleHit[]>;

export type AgentUserContext = {
  userId: string;
  userName: string;
  department: string;
};

export type AgentAdapters = {
  ticketClient: TicketClient;
  kbSearch: KbSearch;
};

export type TurnResult = {
  content: string;
  trace: {
    understanding: string;
    actions: string[];
    confidence: number;
    rulesFired: string[];
    evidence: { type: string; id: string; excerpt?: string }[];
    rawToolCalls?: unknown;
  };
  uiBlocks: import("../../src/lib/conversation/types").UiBlock[];
};

export type TurnStreamCallbacks = {
  onTrace?: (partial: TurnResult["trace"]) => void;
  onToken?: (delta: string) => void;
};