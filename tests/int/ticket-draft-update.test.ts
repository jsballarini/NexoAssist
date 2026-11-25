import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createTicketServiceClient } from "@/lib/ticket-service";

describe("INT-TICKET-02", () => {
  it("update via draft operation update acrescenta histórico sem sobrescrever a descrição", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "ana.souza@nexo.com.br" },
    });
    if (!user) throw new Error("seed required");

    const client = createTicketServiceClient();
    const before = await client.getById(user.id, "INC-20311");
    const complement = `Complemento EVAL-08 — disco quase cheio ${Date.now()}`;

    const draft = await client.createDraft(user.id, "update", {
      targetTicketId: "INC-20311",
      description: complement,
      priority: "medium",
    });

    const ticket = await client.confirmDraft(user.id, draft.draftId);
    expect(ticket.id).toBe("INC-20311");
    expect(ticket.description).toBe(before.description);
    expect(ticket.updates.map((u) => u.body)).toContain(complement);
  });
});
