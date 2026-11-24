import { prisma } from "@/lib/db";
import {
  addAnalystMessage,
  addSystemMessage,
  listMessages,
} from "@/lib/conversation/repository";
import { ConversationAlreadyAssignedError, AnalystHandoffError } from "./errors";

export async function assumeConversation(analystId: string, conversationId: string) {
  return prisma.$transaction(async (tx) => {
    const conv = await tx.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) {
      throw new AnalystHandoffError("NOT_FOUND", "Conversa não encontrada", 404);
    }
    if (conv.state === "closed") {
      throw new AnalystHandoffError("CLOSED", "Conversa encerrada", 400);
    }
    if (conv.state === "with_analyst" && conv.assignedAnalystId !== analystId) {
      const other = await tx.user.findUnique({
        where: { id: conv.assignedAnalystId! },
        select: { name: true },
      });
      throw new ConversationAlreadyAssignedError(
        "Conversa já assumida",
        other ? { name: other.name } : undefined,
      );
    }
    if (conv.state !== "awaiting_analyst" && conv.state !== "with_analyst") {
      throw new AnalystHandoffError(
        "INVALID_STATE",
        "Conversa não está na fila de analista",
        400,
      );
    }

    const updated = await tx.conversation.update({
      where: { id: conversationId },
      data: {
        state: "with_analyst",
        assignedAnalystId: analystId,
        updatedAt: new Date(),
      },
    });

    return {
      state: updated.state,
      assignedAnalystId: updated.assignedAnalystId!,
    };
  });
}

export async function returnToAgent(analystId: string, conversationId: string) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) {
    throw new AnalystHandoffError("NOT_FOUND", "Conversa não encontrada", 404);
  }
  if (conv.state !== "with_analyst") {
    throw new AnalystHandoffError("INVALID_STATE", "Conversa não está com analista", 400);
  }
  if (conv.assignedAnalystId !== analystId) {
    throw new ConversationAlreadyAssignedError();
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      state: "with_agent",
      assignedAnalystId: null,
      updatedAt: new Date(),
    },
  });

  await addSystemMessage(
    conversationId,
    "Analista devolveu ao Nexo Assist. O assistente automático está ativo novamente.",
  );

  return { state: "with_agent" as const };
}

export async function closeConversation(analystId: string, conversationId: string) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) {
    throw new AnalystHandoffError("NOT_FOUND", "Conversa não encontrada", 404);
  }
  if (conv.state === "with_analyst" && conv.assignedAnalystId !== analystId) {
    throw new ConversationAlreadyAssignedError();
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      state: "closed",
      assignedAnalystId: null,
      updatedAt: new Date(),
    },
  });

  return { state: "closed" as const };
}

export async function postAnalystMessage(
  analystId: string,
  conversationId: string,
  content: string,
) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) {
    throw new AnalystHandoffError("NOT_FOUND", "Conversa não encontrada", 404);
  }
  if (conv.state !== "with_analyst" || conv.assignedAnalystId !== analystId) {
    throw new AnalystHandoffError(
      "NOT_ASSIGNED",
      "Assuma a conversa antes de enviar mensagens",
      403,
    );
  }

  const msg = await addAnalystMessage(conversationId, content);
  return { messageId: msg.id };
}

export async function getThreadMessages(
  conversationId: string,
  since?: Date,
) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { assignedAnalyst: { select: { id: true, name: true } } },
  });
  if (!conv) {
    throw new AnalystHandoffError("NOT_FOUND", "Conversa não encontrada", 404);
  }

  const messages = await listMessages(conversationId, since);

  return {
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      uiBlocks: m.uiBlocks,
      createdAt: m.createdAt.toISOString(),
      trace: m.agentTrace
        ? {
            understanding: m.agentTrace.understanding,
            actions: m.agentTrace.actions as string[],
            confidence: m.agentTrace.confidence,
            rulesFired: m.agentTrace.rulesFired as string[],
            evidence: m.agentTrace.evidence as { type: string; id: string; excerpt?: string }[],
          }
        : undefined,
    })),
    state: conv.state,
    assignedAnalyst: conv.assignedAnalyst
      ? { id: conv.assignedAnalyst.id, name: conv.assignedAnalyst.name }
      : null,
    employeeId: conv.userId,
  };
}

export async function listConversationTraces(conversationId: string) {
  const rows = await prisma.message.findMany({
    where: { conversationId, role: "assistant" },
    orderBy: { createdAt: "asc" },
    include: { agentTrace: true },
  });

  return rows
    .filter((m) => m.agentTrace)
    .map((m) => ({
      messageId: m.id,
      createdAt: m.createdAt.toISOString(),
      content: m.content,
      trace: {
        understanding: m.agentTrace!.understanding,
        actions: m.agentTrace!.actions as string[],
        confidence: m.agentTrace!.confidence,
        rulesFired: m.agentTrace!.rulesFired as string[],
        evidence: m.agentTrace!.evidence as { type: string; id: string; excerpt?: string }[],
        rawToolCalls: m.agentTrace!.rawToolCalls as string[] | null,
      },
    }));
}