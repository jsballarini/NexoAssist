import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import type { ConversationState } from "@prisma/client";

const INBOX_STATES: ConversationState[] = ["awaiting_analyst", "with_analyst"];

import { getConfidenceTransferOffer } from "@/lib/domain/rules";
import { extractLinkedTicketId } from "./linked-ticket";
import { isReviewSuggested, LOW_CONFIDENCE_RULE } from "./review";
import type { InboxItem } from "./types";
export type { InboxItem } from "./types";

/**
 * Fila do analista: conversas transferidas/assumidas e, adicionalmente, conversas ainda
 * com o agent cujo último turno indica baixa segurança (revisão sugerida).
 */
export async function listInboxItems(): Promise<InboxItem[]> {
  const threshold = getConfidenceTransferOffer();
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { state: { in: INBOX_STATES } },
        {
          state: "with_agent",
          messages: {
            some: {
              role: "assistant",
              agentTrace: {
                OR: [
                  { confidence: { lt: threshold } },
                  { rulesFired: { array_contains: LOW_CONFIDENCE_RULE } },
                ],
              },
            },
          },
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, department: true } },
      assignedAnalyst: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, role: true },
      },
    },
  });

  const items: InboxItem[] = [];

  for (const conv of conversations) {
    const lastAssistant = await prisma.message.findFirst({
      where: { conversationId: conv.id, role: "assistant" },
      orderBy: { createdAt: "desc" },
      include: {
        agentTrace: { select: { confidence: true, evidence: true, rulesFired: true } },
      },
    });

    const needsReview = isReviewSuggested(
      {
        confidence: lastAssistant?.agentTrace?.confidence,
        rulesFired: lastAssistant?.agentTrace?.rulesFired as string[] | undefined,
      },
      threshold,
    );
    const isHandoff = INBOX_STATES.includes(conv.state);
    if (!isHandoff && !needsReview) continue;

    const previewMsg = conv.messages[0];
    const preview = previewMsg
      ? previewMsg.content.slice(0, 120)
      : "Sem mensagens";

    const userMsgCount = await prisma.message.count({
      where: { conversationId: conv.id, role: "user" },
    });
    const analystMsgCount = await prisma.message.count({
      where: { conversationId: conv.id, role: { in: ["assistant", "system"] } },
    });
    const unreadCount = Math.max(0, userMsgCount - Math.floor(analystMsgCount / 2));

    const linkedTicketId = extractLinkedTicketId(
      lastAssistant?.agentTrace?.evidence,
      lastAssistant?.content ?? preview,
    );

    items.push({
      conversationId: conv.id,
      employeeId: conv.user.id,
      employeeName: conv.user.name,
      employeeDepartment: conv.user.department,
      linkedTicketId,
      preview,
      state: conv.state,
      unreadCount,
      confidenceLast: lastAssistant?.agentTrace?.confidence ?? null,
      updatedAt: conv.updatedAt.toISOString(),
      assignedAnalystId: conv.assignedAnalystId,
      assignedAnalystName: conv.assignedAnalyst?.name ?? null,
      needsReview,
      inboxKind: isHandoff ? "handoff" : "review",
    });
  }

  // Conversas transferidas primeiro; a revisão sugerida vem depois, cada grupo por atividade recente.
  return items.sort((a, b) => Number(a.inboxKind === "review") - Number(b.inboxKind === "review"));
}

export function buildInboxETag(items: InboxItem[]): string {
  const payload = JSON.stringify(
    items.map((i) => ({
      id: i.conversationId,
      state: i.state,
      u: i.updatedAt,
      a: i.assignedAnalystId,
      r: i.needsReview,
      c: i.confidenceLast,
    })),
  );
  const hash = createHash("sha256").update(payload).digest("hex");
  return `"inbox-${hash.slice(0, 16)}"`;
}