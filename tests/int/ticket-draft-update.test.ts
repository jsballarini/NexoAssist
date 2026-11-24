import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createTicketServiceClient } from "@/lib/ticket-service";

describe("INT-TICKET-02", () => {
  it("update via draft operation update", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "ana.souza@nexo.com.br" },
    });
    if (!user) throw new Error("seed required");

    const client = createTicketServiceClient();
    const draft = await client.createDraft(user.id, "update", {
      targetTicketId: "INC-20311",
      description: "Complemento EVAL-08 — disco quase cheio",
      priority: "medium",
    });

    const ticket = await client.confirmDraft(user.id, draft.draftId);
    expect(ticket.id).toBe("INC-20311");
    expect(ticket.description).toContain("disco quase cheio");
  });
});