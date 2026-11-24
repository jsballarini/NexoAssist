import { searchArticles } from "@/lib/knowledge-base/search";
import { createTicketServiceClient } from "@/lib/ticket-service";
import type { AgentAdapters } from "../../../lib/agent/adapters";
import { createConversationAgentAdapter } from "./agent-adapter";

export function createAgentAdapters(userId: string): AgentAdapters {
  const ticketClient = createTicketServiceClient();
  return {
    ticketClient,
    conversationClient: createConversationAgentAdapter(userId),
    kbSearch: async (query) => {
      const hits = await searchArticles(query, 5);
      return hits.map((h) => ({
        slug: h.slug,
        title: h.title,
        excerpt: h.excerpt,
      }));
    },
  };
}