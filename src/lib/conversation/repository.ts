import { prisma } from "@/lib/db";
import type { ConversationState, MessageRole } from "@prisma/client";
import type { AgentTracePayload, UiBlock } from "./types";

const ACTIVE_EMPLOYEE_STATES: ConversationState[] = [
  "with_agent",
  "awaiting_analyst",
  "with_analyst",
];

export async function findActiveConversation(userId: string) {
  return prisma.conversation.findFirst({
    where: { userId, state: { in: ACTIVE_EMPLOYEE_STATES } },
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
  const actives = await prisma.conversation.findMany({
    where: { userId, state: { in: ACTIVE_EMPLOYEE_STATES } },
    select: { id: true, sessionSequence: true },
  });
  const nextSeq = Math.max(0, ...actives.map((c) => c.sessionSequence), 0) + 1;
  if (actives.length > 0) {
    await prisma.conversation.updateMany({
      where: { id: { in: actives.map((c) => c.id) } },
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
      data: { updatedAt: new Date() },
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

export async function listClosedSessions(userId: string, limit = 30) {
  const conversations = await prisma.conversation.findMany({
    where: { userId, state: "closed" },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, role: true },
      },
    },
  });

  return conversations.map((c) => {
    const last = c.messages[0];
    const preview = last
      ? last.content.slice(0, 120)
      : `Sessão ${c.sessionSequence}`;
    return {
      conversationId: c.id,
      sessionSequence: c.sessionSequence,
      state: c.state,
      updatedAt: c.updatedAt.toISOString(),
      preview,
    };
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

export async function addSystemMessage(conversationId: string, content: string) {
  return prisma.message.create({
    data: {
      conversationId,
      role: "system",
      content,
    },
  });
}

export async function addAnalystMessage(conversationId: string, content: string) {
  return prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId,
        role: "analyst" satisfies MessageRole,
        content,
      },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return msg;
  });
}

export async function getConversationById(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { user: { select: { id: true, name: true, email: true, department: true } } },
  });
}