import { prisma } from "@/lib/db";
import {
  addAnalystMessage,
  addSystemMessage,
  listMessages,
} from "@/lib/conversation/repository";
import { parseHandoffSummary } from "../../../lib/agent/handoff-summary";
import { ConversationAlreadyAssignedError, AnalystHandoffError } from "./errors";

type TraceUsage = { promptTokens: number; completionTokens: number; latencyMs: number };

/** `rawToolCalls` pode ser lista de nomes (legado) ou de objetos `{ name, ... }`. */
function toToolNames(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const names = raw
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "name" in item) {
        const name = (item as { name?: unknown }).name;
        return typeof name === "string" ? name : null;
      }
      return null;
    })
    .filter((n): n is string => n !== null);
  return names;
}

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

  const msg = await addAnalystMessage(conversationId, content, analystId);
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
            reasoning: m.agentTrace.reasoning,
            usage: m.agentTrace.usage as TraceUsage | null,
          }
        : undefined,
    })),
    state: conv.state,
    assignedAnalyst: conv.assignedAnalyst
      ? { id: conv.assignedAnalyst.id, name: conv.assignedAnalyst.name }
      : null,
    employeeId: conv.userId,
    /** Resumo estruturado da última transferência (aditivo; `null` se não houver). */
    handoffSummary: parseHandoffSummary(conv.handoffSummary) ?? null,
  };
}

function durationSincePreviousUser(
  messages: { role: string; createdAt: Date }[],
  assistantIndex: number,
): number | undefined {
  for (let j = assistantIndex - 1; j >= 0; j--) {
    if (messages[j].role === "user") {
      return (
        messages[assistantIndex].createdAt.getTime() -
        messages[j].createdAt.getTime()
      );
    }
  }
  return undefined;
}

export async function listConversationTraces(conversationId: string) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: { agentTrace: true },
  });

  const results: {
    messageId: string;
    createdAt: string;
    content: string;
    trace: {
      understanding: string;
      actions: string[];
      confidence: number;
      rulesFired: string[];
      evidence: { type: string; id: string; excerpt?: string }[];
      rawToolCalls: string[] | null;
      reasoning: string;
      usage: TraceUsage | null;
      durationMs?: number;
    };
  }[] = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "assistant" || !m.agentTrace) continue;

    const durationMs = durationSincePreviousUser(messages, i);

    results.push({
      messageId: m.id,
      createdAt: m.createdAt.toISOString(),
      content: m.content,
      trace: {
        understanding: m.agentTrace.understanding,
        actions: m.agentTrace.actions as string[],
        confidence: m.agentTrace.confidence,
        rulesFired: m.agentTrace.rulesFired as string[],
        evidence: m.agentTrace.evidence as {
          type: string;
          id: string;
          excerpt?: string;
        }[],
        rawToolCalls: toToolNames(m.agentTrace.rawToolCalls),
        reasoning: m.agentTrace.reasoning,
        usage: m.agentTrace.usage as TraceUsage | null,
        ...(durationMs !== undefined ? { durationMs } : {}),
      },
    });
  }

  return results;
}