import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import type { ConversationState } from "@prisma/client";

const INBOX_STATES: ConversationState[] = ["awaiting_analyst", "with_analyst"];

import type { InboxItem } from "./types";
export type { InboxItem } from "./types";

export async function listInboxItems(): Promise<InboxItem[]> {
  const conversations = await prisma.conversation.findMany({
    where: { state: { in: INBOX_STATES } },
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, name: true } },
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
      include: { agentTrace: { select: { confidence: true } } },
    });

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

    items.push({
      conversationId: conv.id,
      employeeId: conv.user.id,
      employeeName: conv.user.name,
      preview,
      state: conv.state,
      unreadCount,
      confidenceLast: lastAssistant?.agentTrace?.confidence ?? null,
      updatedAt: conv.updatedAt.toISOString(),
      assignedAnalystId: conv.assignedAnalystId,
      assignedAnalystName: conv.assignedAnalyst?.name ?? null,
    });
  }

  return items;
}

export function buildInboxETag(items: InboxItem[]): string {
  const payload = JSON.stringify(
    items.map((i) => ({
      id: i.conversationId,
      state: i.state,
      u: i.updatedAt,
      a: i.assignedAnalystId,
    })),
  );
  const hash = createHash("sha256").update(payload).digest("hex");
  return `"inbox-${hash.slice(0, 16)}"`;
}