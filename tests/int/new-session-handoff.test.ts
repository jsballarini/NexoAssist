import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { listInboxItems } from "@/lib/analyst/inbox";
import { assumeConversation, returnToAgent } from "@/lib/analyst/handoff";
import { findActiveConversation, listSessionHistory } from "@/lib/conversation/repository";
import { startNewSession } from "@/lib/conversation/service";

describe("INT-NEW-SESSION-HANDOFF", () => {
  it("nova sessão não encerra conversa devolvida ao agent na fila do analista", async () => {
    const carla = await prisma.user.findUniqueOrThrow({
      where: { email: "carla.mendes@nexo.com.br" },
    });
    const rafael = await prisma.user.findUniqueOrThrow({
      where: { email: "rafael.lima@nexo.com.br" },
    });

    let conv = await prisma.conversation.findFirst({
      where: {
        userId: carla.id,
        state: { in: ["awaiting_analyst", "with_analyst", "with_agent"] },
      },
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
      data: {
        conversationId: conv.id,
        role: "analyst",
        content: "handoff preservado",
        authorUserId: rafael.id,
      },
    });
    await returnToAgent(rafael.id, conv.id);

    const handbackId = conv.id;
    await startNewSession(carla.id);

    const handback = await prisma.conversation.findUniqueOrThrow({
      where: { id: handbackId },
    });
    expect(handback.state).toBe("with_agent");

    const active = await findActiveConversation(carla.id);
    expect(active?.id).toBe(handbackId);

    const inbox = await listInboxItems();
    expect(inbox.some((i) => i.conversationId === handbackId && i.isHandback)).toBe(true);

    const history = await listSessionHistory(carla.id);
    expect(history.some((s) => s.conversationId === handbackId)).toBe(false);
  });

  it("nova sessão encerra conversa with_agent sem handoff", async () => {
    const ana = await prisma.user.findUniqueOrThrow({
      where: { email: "ana.souza@nexo.com.br" },
    });
    const conv = await prisma.conversation.create({
      data: {
        userId: ana.id,
        state: "with_agent",
        sessionSequence: 99_001,
        messageCount: 5,
      },
    });
    await startNewSession(ana.id);
    const closed = await prisma.conversation.findUniqueOrThrow({ where: { id: conv.id } });
    expect(closed.state).toBe("closed");
    await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => {});
  });
});