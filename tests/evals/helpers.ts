import { runAgentTurn } from "../../lib/agent";
import { createTicketServiceClient } from "@/lib/ticket-service";
import { searchArticles } from "@/lib/knowledge-base/search";

export async function findAnaUserId(): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const u = await prisma.user.findUnique({
    where: { email: "ana.souza@nexo.com.br" },
  });
  if (!u) throw new Error("Ana not in DB — run seed");
  return u.id;
}

export async function runEvalTurn(content: string, userId?: string) {
  const uid = userId ?? (await findAnaUserId());
  const ticketClient = createTicketServiceClient();
  return runAgentTurn(
    content,
    { userId: uid, userName: "Ana Souza", department: "Financeiro" },
    {
      ticketClient,
      kbSearch: async (q) => {
        const hits = await searchArticles(q, 5);
        return hits.map((h) => ({
          slug: h.slug,
          title: h.title,
          excerpt: h.excerpt,
        }));
      },
    },
  );
}