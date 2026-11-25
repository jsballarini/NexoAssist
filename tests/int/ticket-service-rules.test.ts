import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  DraftInvalidError,
  TicketForbiddenError,
  TicketInvalidStateError,
  createTicketServiceClient,
} from "@/lib/ticket-service";

const client = createTicketServiceClient();
const createdTickets: string[] = [];
const createdDrafts: string[] = [];

async function user(email: string) {
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) throw new Error("seed required");
  return u;
}

const COMPLETE = {
  type: "INC",
  category: "software",
  title: "INT-RULES chamado completo",
  description: "Descrição original do chamado",
  priority: "medium",
  affectedScope: "only_me",
} as const;

async function newTicket(userId: string) {
  const draft = await client.createDraft(userId, "create", COMPLETE);
  createdDrafts.push(draft.draftId);
  const ticket = await client.confirmDraft(userId, draft.draftId);
  createdTickets.push(ticket.id);
  return ticket;
}

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { publicId: { in: createdTickets } } });
  await prisma.ticketDraft.deleteMany({ where: { publicId: { in: createdDrafts } } });
});

describe("INT-TICKET-RULES G2-RG-02: seis campos obrigatórios", () => {
  it("createDraft(create) rejeita payload incompleto listando os campos", async () => {
    const ana = await user("ana.souza@nexo.com.br");
    const err = await client
      .createDraft(ana.id, "create", { title: "só título", description: "desc válida" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(DraftInvalidError);
    expect((err as DraftInvalidError).fields).toEqual(
      expect.arrayContaining(["type", "category", "priority", "affectedScope"]),
    );
  });

  it("confirmDraft não aplica defaults silenciosos a rascunho incompleto", async () => {
    const ana = await user("ana.souza@nexo.com.br");
    const publicId = `D-INT-RULES-${Date.now()}`;
    createdDrafts.push(publicId);
    await prisma.ticketDraft.create({
      data: {
        publicId,
        requesterId: ana.id,
        operation: "create",
        payload: { title: "incompleto", description: "sem tipo nem escopo" },
        status: "pending",
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await expect(client.confirmDraft(ana.id, publicId)).rejects.toBeInstanceOf(DraftInvalidError);
    const draft = await prisma.ticketDraft.findUnique({ where: { publicId } });
    expect(draft?.status).toBe("pending");
  });
});

describe("INT-TICKET-RULES G2-TS-01: histórico de complementos", () => {
  it("update acrescenta TicketUpdate e preserva a descrição original", async () => {
    const ana = await user("ana.souza@nexo.com.br");
    const ticket = await newTicket(ana.id);

    for (const body of ["Primeiro complemento", "Segundo complemento"]) {
      const draft = await client.createDraft(ana.id, "update", {
        targetTicketId: ticket.id,
        description: body,
      });
      createdDrafts.push(draft.draftId);
      await client.confirmDraft(ana.id, draft.draftId);
    }

    const detail = await client.getById(ana.id, ticket.id);
    expect(detail.description).toBe(COMPLETE.description);
    expect(detail.updates.map((u) => u.body)).toEqual([
      "Primeiro complemento",
      "Segundo complemento",
    ]);
    expect(detail.updates[0].authorId).toBe(ana.id);
    expect(new Date(detail.lastUpdatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(detail.updates[1].createdAt).getTime() - 1000,
    );
  });
});

describe("INT-TICKET-RULES G2-TS-02: transfer", () => {
  it("muda o status para waiting_analyst e registra o motivo", async () => {
    const ana = await user("ana.souza@nexo.com.br");
    const ticket = await newTicket(ana.id);

    const transferred = await client.transfer(ana.id, ticket.id, "Caso crítico para o analista");
    expect(transferred.status).toBe("waiting_analyst");
    expect(transferred.transferReason).toBe("Caso crítico para o analista");

    const open = await client.listOpen(ana.id);
    expect(open.find((t) => t.id === ticket.id)?.status).toBe("waiting_analyst");
  });

  it("não transfere chamado de outro solicitante", async () => {
    const ana = await user("ana.souza@nexo.com.br");
    const carla = await user("carla.mendes@nexo.com.br");
    const ticket = await newTicket(ana.id);
    await expect(client.transfer(carla.id, ticket.id, "motivo")).rejects.toBeInstanceOf(
      TicketForbiddenError,
    );
  });

  it("não transfere chamado resolvido e exige motivo", async () => {
    const ana = await user("ana.souza@nexo.com.br");
    const ticket = await newTicket(ana.id);
    await prisma.ticket.update({
      where: { publicId: ticket.id },
      data: { status: "resolved", resolvedAt: new Date() },
    });
    await expect(client.transfer(ana.id, ticket.id, "motivo")).rejects.toBeInstanceOf(
      TicketInvalidStateError,
    );
    await expect(client.transfer(ana.id, ticket.id, "  ")).rejects.toBeInstanceOf(
      DraftInvalidError,
    );
  });
});
