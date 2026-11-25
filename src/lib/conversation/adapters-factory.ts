import { searchArticles } from "@/lib/knowledge-base/search";
import { createResilientTicketClient, createTicketServiceClient } from "@/lib/ticket-service";
import type { AgentAdapters } from "../../../lib/agent/adapters";
import { createConversationAgentAdapter } from "./agent-adapter";

/** Adapters de um turno do agent; o cliente de chamados ganha retry/backoff (orçamento por turno). */
export function createAgentAdapters(userId: string): AgentAdapters {
  const ticketClient = createResilientTicketClient(createTicketServiceClient());
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