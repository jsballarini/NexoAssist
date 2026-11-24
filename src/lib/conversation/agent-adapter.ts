import {
  addSystemMessage,
  ensureConversationState,
  getConversationForUser,
} from "./repository";

export function createConversationAgentAdapter(userId: string) {
  return {
    async transferToAnalyst(conversationId: string, reason: string): Promise<void> {
      const conv = await getConversationForUser(conversationId, userId);
      if (!conv) {
        throw new Error("Conversa não encontrada");
      }
      await ensureConversationState(conversationId, "awaiting_analyst");
      await addSystemMessage(
        conversationId,
        `Transferência para analista: ${reason}. O assistente automático foi pausado.`,
      );
    },
  };
}