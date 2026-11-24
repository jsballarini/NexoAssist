import { prisma } from "@/lib/db";
import type { ConversationState, MessageRole } from "@prisma/client";
import type { AgentTracePayload, UiBlock } from "./types";

export async function findActiveConversation(userId: string) {
  return prisma.conversation.findFirst({
    where: { userId, state: "with_agent" },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createConversation(userId: string, sessionSequence: number) {
  return prisma.conversation.create({
    data: {
      userId,
      state: "with_agent",
      sessionSequence,
      messageCount: 0,
    },
  });
}

export async function archiveAndCreateNew(userId: string) {
  const current = await findActiveConversation(userId);
  const nextSeq = (current?.sessionSequence ?? 0) + 1;
  if (current) {
    await prisma.conversation.update({
      where: { id: current.id },
      data: { state: "closed" },
    });
  }
  return createConversation(userId, nextSeq);
}

export async function addUserMessage(conversationId: string, content: string) {
  return prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId,
        role: "user" satisfies MessageRole,
        content,
      },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { messageCount: { increment: 1 }, updatedAt: new Date() },
    });
    return msg;
  });
}

export async function addAssistantMessage(
  conversationId: string,
  content: string,
  uiBlocks: UiBlock[],
  trace: AgentTracePayload,
) {
  return prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId,
        role: "assistant",
        content,
        uiBlocks: uiBlocks as object,
      },
    });
    await tx.agentTrace.create({
      data: {
        messageId: msg.id,
        understanding: trace.understanding,
        actions: trace.actions,
        confidence: trace.confidence,
        rulesFired: trace.rulesFired,
        evidence: trace.evidence,
        rawToolCalls: trace.actions,
      },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { messageCount: { increment: 1 }, updatedAt: new Date() },
    });
    return msg;
  });
}

export async function listMessages(conversationId: string, since?: Date) {
  return prisma.message.findMany({
    where: {
      conversationId,
      ...(since ? { createdAt: { gt: since } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { agentTrace: true },
  });
}

export async function getConversationForUser(conversationId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });
}

export async function ensureConversationState(
  conversationId: string,
  state: ConversationState,
) {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { state },
  });
}