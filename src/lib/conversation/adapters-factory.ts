import { searchArticles } from "@/lib/knowledge-base/search";
import { createTicketServiceClient } from "@/lib/ticket-service";
import type { AgentAdapters } from "../../../lib/agent/adapters";

export function createAgentAdapters(): AgentAdapters {
  const ticketClient = createTicketServiceClient();
  return {
    ticketClient,
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