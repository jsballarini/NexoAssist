import type { Ticket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isBreached } from "@/lib/domain/sla";
import { getClock } from "@/lib/domain/clock";
import {
  ticketCategoryLabel,
  ticketStatusLabel,
} from "@/lib/domain/ticket-labels";
import { shouldSimulateOutage } from "../chaos";
import {
  TicketForbiddenError,
  TicketLegacyUnavailableError,
  TicketNotFoundError,
  TicketNotImplementedError,
} from "../errors";
import type { TicketDetail, TicketSummary } from "../types";

const OPEN_STATUSES = [
  "open",
  "in_progress",
  "waiting_analyst",
  "in_service",
  "approved",
] as const;

function toSummary(ticket: Ticket): TicketSummary {
  const now = getClock().now();
  return {
    id: ticket.publicId,
    title: ticket.title,
    type: ticket.type,
    priority: ticket.priority,
    status: ticket.status,
    statusLabel: ticketStatusLabel[ticket.status],
    dueAt: ticket.dueAt.toISOString(),
    slaBreached: isBreached(ticket.dueAt, now, ticket.status),
    openedAt: ticket.openedAt.toISOString(),
  };
}

function toDetail(ticket: Ticket): TicketDetail {
  return {
    ...toSummary(ticket),
    description: ticket.description,
    category: ticket.category,
    categoryLabel: ticketCategoryLabel[ticket.category],
    affectedScope: ticket.affectedScope,
    lastUpdatedAt: ticket.lastUpdatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
  };
}

function guardChaos() {
  if (shouldSimulateOutage()) {
    throw new TicketLegacyUnavailableError(3000);
  }
}

export class TicketServiceImpl {
  async listOpen(requesterId: string): Promise<TicketSummary[]> {
    guardChaos();
    const rows = await prisma.ticket.findMany({
      where: {
        requesterId,
        status: { in: [...OPEN_STATUSES] },
      },
      orderBy: { openedAt: "desc" },
    });
    return rows.map(toSummary);
  }

  async listRecentResolved(
    requesterId: string,
    withinDays = 7,
  ): Promise<TicketSummary[]> {
    guardChaos();
    const since = getClock().now();
    since.setDate(since.getDate() - withinDays);

    const rows = await prisma.ticket.findMany({
      where: {
        requesterId,
        status: "resolved",
        resolvedAt: { gte: since },
      },
      orderBy: { resolvedAt: "desc" },
    });
    return rows.map(toSummary);
  }

  async getById(requesterId: string, publicId: string): Promise<TicketDetail> {
    guardChaos();
    const ticket = await prisma.ticket.findUnique({ where: { publicId } });
    if (!ticket) {
      throw new TicketNotFoundError();
    }
    if (ticket.requesterId !== requesterId) {
      throw new TicketForbiddenError();
    }
    return toDetail(ticket);
  }

  async createDraft(): Promise<never> {
    throw new TicketNotImplementedError("createDraft");
  }

  async confirmDraft(): Promise<never> {
    throw new TicketNotImplementedError("confirmDraft");
  }

  async cancelDraft(): Promise<never> {
    throw new TicketNotImplementedError("cancelDraft");
  }
}