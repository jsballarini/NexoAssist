import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { assumeConversation, listInboxItems, returnToAgent } from "@/lib/analyst";

describe("INT-INBOX-HANDBACK: devolver ao agent mantém na fila", () => {
  it("lista conversa with_agent após devolução quando houve analista", async () => {
    const carla = await prisma.user.findUniqueOrThrow({
      where: { email: "carla.mendes@nexo.com.br" },
    });
    const rafael = await prisma.user.findUniqueOrThrow({
      where: { email: "rafael.lima@nexo.com.br" },
    });
    let conv = await prisma.conversation.findFirst({
      where: { userId: carla.id, state: { in: ["awaiting_analyst", "with_analyst", "with_agent"] } },
      orderBy: { updatedAt: "desc" },
    });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: { userId: carla.id, state: "with_agent", sessionSequence: 1, messageCount: 0 },
      });
    }

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { state: "awaiting_analyst", assignedAnalystId: null },
    });
    await assumeConversation(rafael.id, conv.id);
    await prisma.message.create({
      data: { conversationId: conv.id, role: "analyst", content: "teste handback", authorUserId: rafael.id },
    });
    await returnToAgent(rafael.id, conv.id);

    const items = await listInboxItems();
    const row = items.find((i) => i.conversationId === conv.id);
    expect(row).toMatchObject({
      state: "with_agent",
      inboxKind: "handoff",
      isHandback: true,
      lastAnalystId: rafael.id,
      needsReview: false,
    });
  });
});