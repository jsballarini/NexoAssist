import { prisma } from "@/lib/db";
import { createConversation, findActiveConversation } from "@/lib/conversation/repository";
import type { ConversationState } from "@prisma/client";

const RESETTABLE: ConversationState[] = ["awaiting_analyst", "with_analyst"];

/**
 * Deixa o funcionário com uma sessão ativa `with_agent` e composer habilitado (E2E / smoke).
 * Não fecha conversas devolvidas ao Nexo (handback) usadas na fila do analista.
 */
export async function resetEmployeeChatForE2E(userId: string) {
  await prisma.conversation.updateMany({
    where: { userId, state: { in: RESETTABLE } },
    data: {
      state: "with_agent",
      assignedAnalystId: null,
      updatedAt: new Date(),
    },
  });

  let active = await findActiveConversation(userId);
  if (!active) {
    active = await createConversation(userId, 1);
  }
  if (active.state !== "with_agent") {
    await prisma.conversation.update({
      where: { id: active.id },
      data: { state: "with_agent", assignedAnalystId: null, messageCount: 0 },
    });
  }
  return active.id;
}