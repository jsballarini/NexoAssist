import { prisma } from "@/lib/db";
import { postUserMessage } from "@/lib/conversation";
import { describe, expect, it } from "vitest";

describe("INT-CONV-01", () => {
  it("mensagens e traces persistem após novo client", async () => {
    const ana = await prisma.user.findUnique({
      where: { email: "ana.souza@nexo.com.br" },
    });
    expect(ana).toBeTruthy();

    let conv = await prisma.conversation.findFirst({
      where: {
        userId: ana!.id,
        state: { in: ["with_agent", "awaiting_analyst", "with_analyst"] },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (conv) {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { messageCount: 0, state: "with_agent", assignedAnalystId: null },
      });
    } else {
      conv = await prisma.conversation.create({
        data: { userId: ana!.id, state: "with_agent", sessionSequence: 1, messageCount: 0 },
      });
    }

    const { conversationId, turnId } = await postUserMessage(
      ana!.id,
      ana!.name,
      ana!.department,
      "Como está o INC-20311?",
      undefined,
    );

    await new Promise((r) => setTimeout(r, 800));

    const msgs = await prisma.message.findMany({
      where: { conversationId },
      include: { agentTrace: true },
      orderBy: { createdAt: "asc" },
    });

    expect(msgs.length).toBeGreaterThanOrEqual(2);
    const assistant = msgs.find((m) => m.role === "assistant");
    expect(assistant?.agentTrace).toBeTruthy();
    expect(assistant?.agentTrace?.confidence).toBeGreaterThanOrEqual(0);

    const { PrismaClient } = await import("@prisma/client");
    const fresh = new PrismaClient();
    const again = await fresh.message.findMany({
      where: { conversationId },
      include: { agentTrace: true },
    });
    await fresh.$disconnect();

    expect(again.some((m) => m.agentTrace)).toBe(true);
    expect(turnId).toBeTruthy();
  });
});