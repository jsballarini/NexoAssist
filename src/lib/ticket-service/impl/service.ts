import type { DraftOperation, Prisma, Ticket, TicketDraft, TicketUpdate } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeDueAt, isBreached } from "@/lib/domain/sla";
import { getClock } from "@/lib/domain/clock";
import {
  ticketCategoryLabel,
  ticketStatusLabel,
} from "@/lib/domain/ticket-labels";
import { shouldSimulateOutage } from "../chaos";
import {
  DraftExpiredError,
  DraftInvalidError,
  DraftNotFoundError,
  TicketForbiddenError,
  TicketInvalidStateError,
  TicketLegacyUnavailableError,
  TicketNotFoundError,
} from "../errors";
import {
  checkCreatePayload,
  DraftPatchSchema,
  type DraftPatch,
  type CreateTicketPayload,
  type DraftPayloadBody,
  type DraftSummary,
} from "../draft-payload";
import { nextTicketPublicId } from "../ids";
import type { TicketDetail, TicketSummary } from "../types";

type TicketWithUpdates = Ticket & { updates: TicketUpdate[] };

const WITH_UPDATES = { updates: { orderBy: { createdAt: "asc" } } } as const;

function createPayloadError(check: { missing: string[]; invalid: string[] }): DraftInvalidError {
  const parts: string[] = [];
  if (check.missing.length) parts.push(`campos obrigatórios ausentes: ${check.missing.join(", ")}`);
  if (check.invalid.length) parts.push(`campos inválidos: ${check.invalid.join(", ")}`);
  return new DraftInvalidError(parts.join("; "), [...check.missing, ...check.invalid]);
}

const OPEN_STATUSES = [
  "open",
  "in_progress",
  "waiting_analyst",
  "in_service",
  "approved",
] as const;

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

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

function toDetail(ticket: TicketWithUpdates): TicketDetail {
  return {
    ...toSummary(ticket),
    description: ticket.description,
    category: ticket.category,
    categoryLabel: ticketCategoryLabel[ticket.category],
    affectedScope: ticket.affectedScope,
    lastUpdatedAt: ticket.lastUpdatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    transferReason: ticket.transferReason,
    updates: ticket.updates.map((u) => ({
      id: u.id,
      authorId: u.authorId,
      body: u.body,
      createdAt: u.createdAt.toISOString(),
    })),
  };
}

async function appendUpdate(
  tx: Prisma.TransactionClient,
  ticketPublicId: string,
  authorId: string,
  body: string | undefined,
  createdAt: Date,
) {
  const text = body?.trim();
  if (!text) return;
  await tx.ticketUpdate.create({ data: { ticketPublicId, authorId, body: text, createdAt } });
}

function guardChaos() {
  if (shouldSimulateOutage()) {
    throw new TicketLegacyUnavailableError(3000);
  }
}

function parseDraftNum(id: string): number {
  if (!id.startsWith("D-")) return 0;
  const n = Number.parseInt(id.slice(2), 10);
  return Number.isFinite(n) ? n : 0;
}

async function maxNumericIdLocal(): Promise<number> {
  const rows = await prisma.ticketDraft.findMany({
    where: { publicId: { startsWith: "D-" } },
    select: { publicId: true },
  });
  return rows.reduce((m, r) => Math.max(m, parseDraftNum(r.publicId)), 0);
}

function parsePayload(raw: unknown): DraftPayloadBody {
  if (!raw || typeof raw !== "object") return {};
  return raw as DraftPayloadBody;
}

function draftDuePreview(
  operation: DraftOperation,
  body: DraftPayloadBody,
  existing?: Ticket,
): string {
  const priority = body.priority ?? existing?.priority ?? "medium";
  const base = getClock().now();
  return computeDueAt(priority, base).toISOString();
}

function toDraftSummary(draft: TicketDraft, body: DraftPayloadBody, existing?: Ticket): DraftSummary {
  const title =
    body.title ??
    existing?.title ??
    (draft.operation === "create" ? "Novo chamado" : body.targetTicketId ?? "Chamado");
  const priority = body.priority ?? existing?.priority ?? "medium";
  return {
    draftId: draft.publicId,
    operation: draft.operation,
    title,
    priority,
    dueAtPreview: draftDuePreview(draft.operation, body, existing),
    affectedScope: body.affectedScope ?? existing?.affectedScope,
    targetTicketId: body.targetTicketId,
    type: body.type ?? existing?.type,
    category: body.category ?? existing?.category,
    description: body.description,
  };
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
    const ticket = await prisma.ticket.findUnique({
      where: { publicId },
      include: WITH_UPDATES,
    });
    if (!ticket) {
      throw new TicketNotFoundError();
    }
    if (ticket.requesterId !== requesterId) {
      throw new TicketForbiddenError();
    }
    return toDetail(ticket);
  }

  /**
   * Transfere o chamado do solicitante para um analista: status `waiting_analyst`
   * e motivo registrado. Chamados resolvidos não podem ser transferidos.
   */
  async transfer(requesterId: string, publicId: string, reason: string): Promise<TicketDetail> {
    guardChaos();
    const motive = reason.trim();
    if (!motive) throw new DraftInvalidError("motivo da transferência obrigatório", ["reason"]);

    const ticket = await prisma.ticket.findUnique({ where: { publicId } });
    if (!ticket) throw new TicketNotFoundError();
    if (ticket.requesterId !== requesterId) throw new TicketForbiddenError();
    if (ticket.status === "resolved") {
      throw new TicketInvalidStateError("Chamado resolvido não pode ser transferido");
    }

    const updated = await prisma.ticket.update({
      where: { publicId },
      data: {
        status: "waiting_analyst",
        transferReason: motive,
        lastUpdatedAt: getClock().now(),
      },
      include: WITH_UPDATES,
    });
    return toDetail(updated);
  }

  async createDraft(
    requesterId: string,
    operation: DraftOperation,
    payload: DraftPayloadBody,
  ): Promise<DraftSummary> {
    guardChaos();
    const now = getClock().now();
    const expiresAt = new Date(now.getTime() + DRAFT_TTL_MS);

    if (operation === "update" || operation === "reopen") {
      const targetId = payload.targetTicketId;
      if (!targetId) {
        throw new DraftInvalidError("targetTicketId obrigatório para update/reopen");
      }
      const target = await prisma.ticket.findUnique({ where: { publicId: targetId } });
      if (!target || target.requesterId !== requesterId) {
        throw new TicketForbiddenError();
      }
      if (operation === "reopen" && target.status !== "resolved") {
        throw new DraftInvalidError("Reabertura exige ticket resolvido");
      }
    }

    if (operation === "create") {
      const check = checkCreatePayload(payload);
      if (!check.ok) throw createPayloadError(check);
    }

    const max = await maxNumericIdLocal();
    let draft: TicketDraft | null = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidateId = `D-${max + 1 + attempt}`;
      try {
        draft = await prisma.ticketDraft.create({
          data: {
            publicId: candidateId,
            requesterId,
            operation,
            payload: payload as object,
            status: "pending",
            expiresAt,
          },
        });
        break;
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code !== "P2002") throw err;
      }
    }
    if (!draft) {
      throw new DraftInvalidError("Não foi possível alocar ID do rascunho");
    }

    let existing: Ticket | undefined;
    if (payload.targetTicketId) {
      existing =
        (await prisma.ticket.findUnique({ where: { publicId: payload.targetTicketId } })) ??
        undefined;
    }

    return toDraftSummary(draft, payload, existing);
  }

  /** Rascunho pendente mais recente do solicitante (leitura; não passa pelo guard de chaos). */
  async findPendingDraft(requesterId: string): Promise<DraftSummary | null> {
    const now = getClock().now();
    const draft = await prisma.ticketDraft.findFirst({
      where: { requesterId, status: "pending", expiresAt: { gt: now } },
      orderBy: { expiresAt: "desc" },
    });
    if (!draft) return null;
    const body = parsePayload(draft.payload);
    const existing = body.targetTicketId
      ? ((await prisma.ticket.findUnique({ where: { publicId: body.targetTicketId } })) ??
        undefined)
      : undefined;
    if (existing && existing.requesterId !== requesterId) return null;
    return toDraftSummary(draft, body, existing);
  }

  async confirmDraft(requesterId: string, draftId: string): Promise<TicketDetail> {
    guardChaos();
    const now = getClock().now();

    return prisma.$transaction(async (tx) => {
      const draft = await tx.ticketDraft.findUnique({ where: { publicId: draftId } });
      if (!draft) throw new DraftNotFoundError();
      if (draft.requesterId !== requesterId) throw new TicketForbiddenError();
      if (draft.status !== "pending") {
        throw new DraftInvalidError("Rascunho já finalizado");
      }
      if (draft.expiresAt < now) {
        await tx.ticketDraft.update({
          where: { publicId: draftId },
          data: { status: "expired" },
        });
        throw new DraftExpiredError();
      }

      const body = parsePayload(draft.payload);
      let ticket: Ticket;

      if (draft.operation === "create") {
        const check = checkCreatePayload(body);
        if (!check.ok) throw createPayloadError(check);
        const fields: CreateTicketPayload = check.payload;
        const publicId = await nextTicketPublicId(fields.type);
        ticket = await tx.ticket.create({
          data: {
            publicId,
            requesterId,
            title: fields.title,
            description: fields.description,
            type: fields.type,
            category: fields.category,
            priority: fields.priority,
            status: "open",
            affectedScope: fields.affectedScope,
            openedAt: now,
            dueAt: computeDueAt(fields.priority, now),
            lastUpdatedAt: now,
          },
        });
      } else if (draft.operation === "update") {
        const targetId = body.targetTicketId;
        if (!targetId) throw new DraftInvalidError("targetTicketId ausente");
        const existing = await tx.ticket.findUnique({ where: { publicId: targetId } });
        if (!existing || existing.requesterId !== requesterId) {
          throw new TicketForbiddenError();
        }
        const priority = body.priority ?? existing.priority;
        const dueAt =
          priority !== existing.priority
            ? computeDueAt(priority, now)
            : existing.dueAt;
        ticket = await tx.ticket.update({
          where: { publicId: targetId },
          data: {
            title: body.title ?? existing.title,
            category: body.category ?? existing.category,
            priority,
            affectedScope: body.affectedScope ?? existing.affectedScope,
            dueAt,
            lastUpdatedAt: now,
          },
        });
        await appendUpdate(tx, targetId, requesterId, body.description, now);
      } else {
        const targetId = body.targetTicketId;
        if (!targetId) throw new DraftInvalidError("targetTicketId ausente");
        const existing = await tx.ticket.findUnique({ where: { publicId: targetId } });
        if (!existing || existing.requesterId !== requesterId) {
          throw new TicketForbiddenError();
        }
        if (existing.status !== "resolved") {
          throw new DraftInvalidError("Ticket não está resolvido");
        }
        const since = new Date(now);
        since.setDate(since.getDate() - 7);
        if (!existing.resolvedAt || existing.resolvedAt < since) {
          throw new DraftInvalidError("Reabertura permitida só até 7 dias após resolução");
        }
        const priority = body.priority ?? existing.priority;
        ticket = await tx.ticket.update({
          where: { publicId: targetId },
          data: {
            status: "open",
            resolvedAt: null,
            priority,
            dueAt: computeDueAt(priority, now),
            lastUpdatedAt: now,
          },
        });
        await appendUpdate(tx, targetId, requesterId, body.description, now);
      }

      await tx.ticketDraft.update({
        where: { publicId: draftId },
        data: { status: "confirmed" },
      });

      const updates = await tx.ticketUpdate.findMany({
        where: { ticketPublicId: ticket.publicId },
        orderBy: { createdAt: "asc" },
      });
      return toDetail({ ...ticket, updates });
    });
  }

  /**
   * Edita campos de um rascunho pendente do solicitante (não toca em chamados).
   * Valida o patch e, em `create`, revalida o payload completo; devolve o rascunho atualizado.
   */
  async updateDraft(
    requesterId: string,
    draftId: string,
    patch: DraftPatch,
  ): Promise<DraftSummary> {
    guardChaos();
    const parsed = DraftPatchSchema.safeParse(patch);
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? "")).filter(Boolean))];
      throw new DraftInvalidError("Campos do rascunho inválidos", fields);
    }

    const draft = await prisma.ticketDraft.findUnique({ where: { publicId: draftId } });
    if (!draft) throw new DraftNotFoundError();
    if (draft.requesterId !== requesterId) throw new TicketForbiddenError();
    if (draft.status !== "pending") throw new DraftInvalidError("Rascunho já finalizado");
    if (draft.expiresAt < getClock().now()) throw new DraftExpiredError();

    const merged: DraftPayloadBody = { ...parsePayload(draft.payload), ...parsed.data };
    if (draft.operation === "create") {
      const check = checkCreatePayload(merged);
      if (!check.ok) throw createPayloadError(check);
    }

    const saved = await prisma.ticketDraft.update({
      where: { publicId: draftId },
      data: { payload: merged as object },
    });
    const existing = merged.targetTicketId
      ? ((await prisma.ticket.findUnique({ where: { publicId: merged.targetTicketId } })) ?? undefined)
      : undefined;
    return toDraftSummary(saved, merged, existing);
  }

  async cancelDraft(requesterId: string, draftId: string): Promise<void> {
    guardChaos();
    const draft = await prisma.ticketDraft.findUnique({ where: { publicId: draftId } });
    if (!draft) throw new DraftNotFoundError();
    if (draft.requesterId !== requesterId) throw new TicketForbiddenError();
    if (draft.status !== "pending") return;
    await prisma.ticketDraft.update({
      where: { publicId: draftId },
      data: { status: "cancelled" },
    });
  }
}