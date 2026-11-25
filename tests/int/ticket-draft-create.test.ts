import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createTicketServiceClient } from "@/lib/ticket-service";

describe("INT-TICKET-01", () => {
  it("create draft → confirm → ID formato INC", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "ana.souza@nexo.com.br" },
    });
    if (!user) throw new Error("seed required");

    const client = createTicketServiceClient();
    const draft = await client.createDraft(user.id, "create", {
      type: "INC",
      category: "outros",
      title: "Test INT-TICKET-01",
      description: "Cenário isolado de integração ticket-draft-create",
      priority: "high",
      affectedScope: "only_me",
      confirmedNew: true,
    });

    expect(draft.draftId).toMatch(/^D-\d+$/);

    const ticket = await client.confirmDraft(user.id, draft.draftId);
    expect(ticket.id).toMatch(/^INC-\d+$/);
    expect(ticket.title).toBe("Test INT-TICKET-01");
  });
});