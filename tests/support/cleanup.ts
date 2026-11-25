import { prisma } from "../../src/lib/db";

/**
 * Remove chamados de teste de um usuário (por prefixo de título) para que execuções
 * repetidas não disparem a detecção de duplicidade. Uso exclusivo de testes (banco local).
 */
export async function deleteTicketsByTitlePrefix(email: string, titlePrefix: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return 0;
  const result = await prisma.ticket.deleteMany({
    where: { requesterId: user.id, title: { startsWith: titlePrefix } },
  });
  return result.count;
}

/**
 * Remove rascunhos pendentes de um usuário. Evals que chamam `create_draft` deixam rascunhos
 * pendentes que o agent reaproveita como contexto (e que o E2E confirmaria por engano).
 */
export async function deletePendingDrafts(email: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return 0;
  const result = await prisma.ticketDraft.deleteMany({
    where: { requesterId: user.id, status: "pending" },
  });
  return result.count;
}

/** Desconecta o Prisma do processo de teste. */
export async function disconnectTestDb(): Promise<void> {
  await prisma.$disconnect();
}
