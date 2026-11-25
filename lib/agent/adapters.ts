import type { DraftOperation, DraftPayloadBody, DraftSummary } from "./draft-types";
import type { TicketDetail, TicketSummary } from "../../src/lib/ticket-service/types";
import type { UiBlock } from "../../src/lib/conversation/types";
import type { AgentUsage } from "./schemas";
import type { HandoffSummary } from "./handoff-summary";

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
  /** Marca o chamado como aguardando analista e registra o motivo. */
  transfer(requesterId: string, publicId: string, reason: string): Promise<TicketDetail>;
};

export type ConversationClient = {
  /** Pausa o agent e entrega a conversa ao analista com o resumo estruturado do caso. */
  transferToAnalyst(conversationId: string, reason: string, summary?: HandoffSummary): Promise<void>;
  /** Completa o resumo de uma transferência já feita no turno (confiança, regras, passos). */
  updateHandoffSummary?(conversationId: string, patch: Partial<HandoffSummary>): Promise<void>;
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

export type TurnTrace = {
  understanding: string;
  actions: string[];
  confidence: number;
  rulesFired: string[];
  evidence: { type: string; id: string; excerpt?: string }[];
  /** Justificativa em linguagem natural das ações escolhidas. */
  reasoning: string;
  /** Chamadas de ferramenta reais (nome, argumentos, resultado resumido) ou erro do turno. */
  rawToolCalls?: unknown;
  usage?: AgentUsage;
};

export type TurnResult = {
  content: string;
  trace: TurnTrace;
  uiBlocks: UiBlock[];
};

export type TurnStreamCallbacks = {
  onTrace?: (partial: TurnTrace) => void;
  onToken?: (delta: string) => void;
};