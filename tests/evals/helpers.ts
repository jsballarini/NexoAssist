import { runAgentTurn } from "../../lib/agent";
import type { TurnContext } from "../../lib/agent/turn-context";
import { createAgentAdapters } from "@/lib/conversation/adapters-factory";
import { getOrCreateActive } from "@/lib/conversation/service";

export async function findDiegoUserId(): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const u = await prisma.user.findUnique({
    where: { email: "diego.ramos@nexo.com.br" },
  });
  if (!u) throw new Error("Diego not in DB — run seed");
  return u.id;
}

export async function findAnaUserId(): Promise<string> {
  const { prisma } = await import("@/lib/db");
  const u = await prisma.user.findUnique({
    where: { email: "ana.souza@nexo.com.br" },
  });
  if (!u) throw new Error("Ana not in DB — run seed");
  return u.id;
}

export async function runEvalTurnAsUser(
  userId: string,
  userName: string,
  department: string,
  content: string,
) {
  const { prisma } = await import("@/lib/db");
  const conv = await getOrCreateActive(userId);
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { messageCount: 0, state: "with_agent" },
  });
  const adapters = createAgentAdapters(userId);
  return runAgentTurn(
    content,
    { userId, userName, department, conversationId: conv.id },
    adapters,
  );
}

export async function runEvalTurn(
  content: string,
  userId?: string,
  turnContext?: TurnContext,
) {
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
    turnContext,
  );
}