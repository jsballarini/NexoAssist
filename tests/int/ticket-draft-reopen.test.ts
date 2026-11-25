import { createTicketServiceClient } from "@/lib/ticket-service";
import { prisma } from "@/lib/db";
import { describe, expect, it } from "vitest";

describe("INT-TICKET-03", () => {
  it("reopen INC-20150 recalcula dueAt sem novo ID", async () => {
    const diego = await prisma.user.findUnique({
      where: { email: "diego.ramos@nexo.com.br" },
    });
    if (!diego) throw new Error("seed required");

    await prisma.ticket.updateMany({
      where: { publicId: "INC-20150" },
      data: {
        status: "resolved",
        resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        dueAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });

    const client = createTicketServiceClient();
    const draft = await client.createDraft(diego.id, "reopen", {
      targetTicketId: "INC-20150",
      title: "Senha SAP bloqueada novamente",
      description: "Reabertura teste",
      priority: "medium",
    });

    const confirmed = await client.confirmDraft(diego.id, draft.draftId);

    expect(confirmed.id).toBe("INC-20150");
    expect(confirmed.status).toBe("open");
    expect(new Date(confirmed.dueAt).getTime()).toBeGreaterThan(Date.now());
  });
});