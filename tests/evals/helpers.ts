import { runAgentTurn } from "../../lib/agent";
import { createAgentAdapters } from "@/lib/conversation/adapters-factory";
import { getOrCreateActive } from "@/lib/conversation/service";

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
  const { prisma } = await import("@/lib/db");
  const conv = await getOrCreateActive(uid);
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { messageCount: 0, state: "with_agent" },
  });
  const adapters = createAgentAdapters(uid);
  return runAgentTurn(
    content,
    {
      userId: uid,
      userName: "Ana Souza",
      department: "Financeiro",
      conversationId: conv.id,
    },
    adapters,
  );
}