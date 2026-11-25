import type { HandoffSummary } from "../../../lib/agent/handoff-summary";
import { parseHandoffSummary } from "../../../lib/agent/handoff-summary";
import {
  addSystemMessage,
  ensureConversationState,
  getConversationForUser,
  readHandoffSummary,
  saveHandoffSummary,
} from "./repository";

export function createConversationAgentAdapter(userId: string) {
  async function requireConversation(conversationId: string) {
    const conv = await getConversationForUser(conversationId, userId);
    if (!conv) {
      throw new Error("Conversa não encontrada");
    }
    return conv;
  }

  return {
    async transferToAnalyst(
      conversationId: string,
      reason: string,
      summary?: HandoffSummary,
    ): Promise<void> {
      await requireConversation(conversationId);
      await ensureConversationState(conversationId, "awaiting_analyst");
      if (summary) {
        await saveHandoffSummary(conversationId, summary);
      }
      await addSystemMessage(
        conversationId,
        `Transferência para analista: ${reason}. O assistente automático foi pausado.`,
      );
    },

    async updateHandoffSummary(
      conversationId: string,
      patch: Partial<HandoffSummary>,
    ): Promise<void> {
      await requireConversation(conversationId);
      const current = parseHandoffSummary(await readHandoffSummary(conversationId));
      if (!current) return;
      await saveHandoffSummary(conversationId, { ...current, ...patch });
    },
  };
}
