import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createTicketServiceClient } from "@/lib/ticket-service";
import { DraftInvalidError } from "@/lib/ticket-service/errors";

describe("INT-TICKET-DUP", () => {
  it("confirm create rejeita duplicata de chamado VPN aberto", async () => {
    const fabio = await prisma.user.findUniqueOrThrow({
      where: { email: "fabio.nunes@nexo.com.br" },
    });
    await prisma.ticket.findUniqueOrThrow({ where: { publicId: "INC-20517" } });

    const client = createTicketServiceClient();
    const draft = await client.createDraft(fabio.id, "create", {
      type: "INC",
      category: "rede_vpn",
      title: "Conexão VPN falhou",
      description: "Erro 809 ao conectar na VPN",
      priority: "high",
      affectedScope: "only_me",
    });

    await expect(client.confirmDraft(fabio.id, draft.draftId)).rejects.toBeInstanceOf(
      DraftInvalidError,
    );
  });

  it("confirmedNew no rascunho permite create mesmo com parecido", async () => {
    const ana = await prisma.user.findUniqueOrThrow({
      where: { email: "ana.souza@nexo.com.br" },
    });
    const client = createTicketServiceClient();
    const draft = await client.createDraft(ana.id, "create", {
      type: "INC",
      category: "rede_vpn",
      title: "VPN teste dup guard unique",
      description: "Erro 809 vpn teste dup",
      priority: "low",
      affectedScope: "only_me",
      confirmedNew: true,
    });

    const ticket = await client.confirmDraft(ana.id, draft.draftId);
    expect(ticket.title).toContain("VPN teste dup guard");
    await prisma.ticket.delete({ where: { publicId: ticket.id } }).catch(() => {});
  });
});