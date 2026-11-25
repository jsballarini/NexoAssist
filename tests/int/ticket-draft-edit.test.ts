import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  DraftInvalidError,
  TicketForbiddenError,
  createTicketServiceClient,
} from "@/lib/ticket-service";

const client = createTicketServiceClient();
const drafts: string[] = [];
const tickets: string[] = [];

const COMPLETE = {
  type: "INC",
  category: "software",
  title: "INT-EDIT rascunho editável",
  description: "Descrição original do rascunho",
  priority: "medium",
  affectedScope: "only_me",
} as const;

async function user(email: string) {
  return prisma.user.findUniqueOrThrow({ where: { email } });
}

async function newDraft(userId: string) {
  const draft = await client.createDraft(userId, "create", COMPLETE);
  drafts.push(draft.draftId);
  return draft;
}

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { publicId: { in: tickets } } });
  await prisma.ticketDraft.deleteMany({ where: { publicId: { in: drafts } } });
});

describe("INT-DRAFT-EDIT (G2-UI-02): edição de rascunho pendente", () => {
  it("o summary expõe os seis campos e a edição vale na confirmação", async () => {
    const ana = await user("ana.souza@nexo.com.br");
    const draft = await newDraft(ana.id);
    expect(draft).toMatchObject({ type: "INC", category: "software", description: COMPLETE.description });

    const edited = await client.updateDraft(ana.id, draft.draftId, {
      description: "Descrição editada pelo funcionário",
      priority: "high",
      affectedScope: "team",
    });
    expect(edited).toMatchObject({
      draftId: draft.draftId,
      description: "Descrição editada pelo funcionário",
      priority: "high",
      affectedScope: "team",
    });
    expect(new Date(edited.dueAtPreview).getTime()).toBeLessThanOrEqual(new Date(draft.dueAtPreview).getTime());

    const ticket = await client.confirmDraft(ana.id, draft.draftId);
    tickets.push(ticket.id);
    expect(ticket).toMatchObject({
      description: "Descrição editada pelo funcionário",
      priority: "high",
      affectedScope: "team",
    });
  });

  it("rejeita patch vazio, campo desconhecido e valor inválido", async () => {
    const ana = await user("ana.souza@nexo.com.br");
    const draft = await newDraft(ana.id);
    await expect(client.updateDraft(ana.id, draft.draftId, {})).rejects.toBeInstanceOf(DraftInvalidError);
    await expect(
      client.updateDraft(ana.id, draft.draftId, { requesterId: "x" } as never),
    ).rejects.toBeInstanceOf(DraftInvalidError);
    const err = await client.updateDraft(ana.id, draft.draftId, { title: "ab" }).catch((e) => e);
    expect(err).toBeInstanceOf(DraftInvalidError);
    expect(err.fields).toContain("title");
  });

  it("não edita rascunho de outro usuário nem rascunho cancelado", async () => {
    const ana = await user("ana.souza@nexo.com.br");
    const carla = await user("carla.mendes@nexo.com.br");
    const draft = await newDraft(ana.id);
    await expect(
      client.updateDraft(carla.id, draft.draftId, { title: "Invasão" }),
    ).rejects.toBeInstanceOf(TicketForbiddenError);

    await client.cancelDraft(ana.id, draft.draftId);
    await expect(
      client.updateDraft(ana.id, draft.draftId, { title: "Tarde demais" }),
    ).rejects.toBeInstanceOf(DraftInvalidError);
  });
});
