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

export type TicketDetail = TicketSummary & {
  description: string;
  category: TicketCategory;
  categoryLabel: string;
  affectedScope: AffectedScope;
  lastUpdatedAt: string;
  resolvedAt: string | null;
};