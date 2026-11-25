import { prisma } from "@/lib/db";
import type { ConversationState, MessageRole, Prisma } from "@prisma/client";
import type { AgentTracePayload, UiBlock } from "./types";

const ACTIVE_EMPLOYEE_STATES: ConversationState[] = [
  "with_agent",
  "awaiting_analyst",
  "with_analyst",
];

/**
 * Sessão ativa do funcionário. Prioridade: fila/assumida com analista; depois conversa
 * devolvida ao Nexo (handback), para o analista acompanhar o mesmo `conversationId`.
 */
export async function findActiveConversation(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { userId, state: { in: ACTIVE_EMPLOYEE_STATES } },
    orderBy: { updatedAt: "desc" },
  });
  if (conversations.length === 0) return null;

  const inHumanFlow = conversations.find(
    (c) => c.state === "with_analyst" || c.state === "awaiting_analyst",
  );
  if (inHumanFlow) return inHumanFlow;

  const withAgent = conversations.filter((c) => c.state === "with_agent");
  for (const c of withAgent) {
    if (c.handoffSummary != null) return c;
  }
  for (const c of withAgent) {
    if (await hadHumanHandoff(c.id, c.handoffSummary)) return c;
  }

  return withAgent[0] ?? conversations[0];
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

async function hadHumanHandoff(conversationId: string, handoffSummary: unknown): Promise<boolean> {
  if (handoffSummary != null) return true;
  const n = await prisma.message.count({
    where: { conversationId, role: "analyst" },
    take: 1,
  });
  return n > 0;
}

/**
 * Nova sessão do funcionário: encerra só `with_agent` comum (reset do limite de 30).
 * Conversas em fila/assumidas ou devolvidas ao Nexo após handoff permanecem abertas para o analista.
 */
export async function archiveAndCreateNew(userId: string) {
  const actives = await prisma.conversation.findMany({
    where: { userId, state: { in: ACTIVE_EMPLOYEE_STATES } },
    select: { id: true, sessionSequence: true, state: true, handoffSummary: true },
  });
  const toClose: string[] = [];
  const handbackIds: string[] = [];
  for (const conv of actives) {
    if (conv.state !== "with_agent") continue;
    if (await hadHumanHandoff(conv.id, conv.handoffSummary)) {
      handbackIds.push(conv.id);
      continue;
    }
    toClose.push(conv.id);
  }
  const nextSeq = Math.max(0, ...actives.map((c) => c.sessionSequence), 0) + 1;
  if (toClose.length > 0) {
    await prisma.conversation.updateMany({
      where: { id: { in: toClose } },
      data: { state: "closed" },
    });
  }
  if (handbackIds.length > 0) {
    const handback = await prisma.conversation.findFirst({
      where: { id: { in: handbackIds } },
      orderBy: { updatedAt: "desc" },
    });
    if (handback) {
      return prisma.conversation.update({
        where: { id: handback.id },
        data: {
          messageCount: 0,
          sessionSequence: nextSeq,
          updatedAt: new Date(),
        },
      });
    }
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
        rawToolCalls: (trace.rawToolCalls ?? undefined) as Prisma.InputJsonValue | undefined,
        reasoning: trace.reasoning ?? "",
        usage: (trace.usage ?? undefined) as Prisma.InputJsonValue | undefined,
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
    include: {
      agentTrace: true,
      author: { select: { name: true } },
    },
  });
}

/** Últimas `limit` mensagens da conversa em ordem cronológica, com o trace do assistente. */
export async function listRecentMessages(conversationId: string, limit: number) {
  const rows = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { agentTrace: { select: { evidence: true } } },
  });
  return rows.reverse();
}

export async function getConversationForUser(conversationId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: { assignedAnalyst: { select: { name: true } } },
  });
}

/**
 * Sessões anteriores à ativa: encerradas e conversas ainda abertas (ex. handoff
 * preservado após **Nova sessão**), para o funcionário consultar no Histórico.
 */
export async function listSessionHistory(userId: string, limit = 30) {
  const active = await findActiveConversation(userId);
  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
      ...(active ? { id: { not: active.id } } : {}),
      OR: [{ state: "closed" }, { state: { in: ACTIVE_EMPLOYEE_STATES } }],
    },
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

/** Mantido para compatibilidade; use {@link listSessionHistory}. */
export async function listClosedSessions(userId: string, limit = 30) {
  return listSessionHistory(userId, limit);
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

/** Persiste o snapshot do resumo de handoff (um por conversa; a última transferência vence). */
export async function saveHandoffSummary(conversationId: string, summary: unknown) {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { handoffSummary: summary as Prisma.InputJsonValue },
  });
}

export async function readHandoffSummary(conversationId: string): Promise<unknown> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { handoffSummary: true },
  });
  return conv?.handoffSummary ?? null;
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

export async function addAnalystMessage(
  conversationId: string,
  content: string,
  authorUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId,
        role: "analyst" satisfies MessageRole,
        content,
        authorUserId,
      },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return msg;
  });
}

/** Mensagem da funcionária com analista humano ativo (não conta no limite do agent). */
export async function addEmployeeHandoffMessage(conversationId: string, content: string) {
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