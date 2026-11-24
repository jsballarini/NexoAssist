import type { DraftOperation, DraftPayloadBody, DraftSummary } from "./draft-types";
import type { TicketDetail, TicketSummary } from "../../src/lib/ticket-service/types";
import type { UiBlock } from "../../src/lib/conversation/types";

export type KbArticleHit = {
  slug: string;
  title: string;
  excerpt: string;
};

export type TicketClient = {
  listOpen(requesterId: string): Promise<TicketSummary[]>;
  listRecentResolved(requesterId: string, withinDays?: number): Promise<TicketSummary[]>;
  getById(requesterId: string, publicId: string): Promise<TicketDetail>;
  createDraft(
    requesterId: string,
    operation: DraftOperation,
    payload: DraftPayloadBody,
  ): Promise<DraftSummary>;
  cancelDraft(requesterId: string, draftId: string): Promise<void>;
};

export type ConversationClient = {
  transferToAnalyst(conversationId: string, reason: string): Promise<void>;
};

export type KbSearch = (query: string) => Promise<KbArticleHit[]>;

export type AgentUserContext = {
  userId: string;
  userName: string;
  department: string;
  conversationId: string;
};

export type AgentAdapters = {
  ticketClient: TicketClient;
  kbSearch: KbSearch;
  conversationClient: ConversationClient;
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
  uiBlocks: UiBlock[];
};

export type TurnStreamCallbacks = {
  onTrace?: (partial: TurnResult["trace"]) => void;
  onToken?: (delta: string) => void;
};