import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { assumeConversation, closeConversation, listInboxItems } from "@/lib/analyst";

describe("INT-INBOX-CLOSED", () => {
  it("conversa encerrada pelo analista aparece no chip Encerrados", async () => {
    const carla = await prisma.user.findUniqueOrThrow({
      where: { email: "carla.mendes@nexo.com.br" },
    });
    const rafael = await prisma.user.findUniqueOrThrow({
      where: { email: "rafael.lima@nexo.com.br" },
    });

    const conv = await prisma.conversation.findFirst({
      where: {
        userId: carla.id,
        state: { in: ["awaiting_analyst", "with_analyst", "with_agent"] },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!conv) throw new Error("conversa Carla ausente");

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { state: "awaiting_analyst", assignedAnalystId: null },
    });
    await assumeConversation(rafael.id, conv.id);
    await closeConversation(rafael.id, conv.id);

    const items = await listInboxItems();
    const row = items.find((i) => i.conversationId === conv.id);
    expect(row).toMatchObject({
      state: "closed",
      inboxKind: "closed",
    });
  });
});