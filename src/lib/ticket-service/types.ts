import type {
  AffectedScope,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@prisma/client";

export type TicketSummary = {
  id: string;
  title: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  statusLabel: string;
  dueAt: string;
  slaBreached: boolean;
  openedAt: string;
};

/** Complemento registrado em um chamado (histórico; a descrição original é preservada). */
export type TicketUpdateEntry = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type TicketDetail = TicketSummary & {
  description: string;
  category: TicketCategory;
  categoryLabel: string;
  affectedScope: AffectedScope;
  lastUpdatedAt: string;
  resolvedAt: string | null;
  /** Motivo da última transferência para analista, quando houver. */
  transferReason?: string | null;
  /** Complementos em ordem cronológica (mais antigo primeiro). */
  updates: TicketUpdateEntry[];
};
