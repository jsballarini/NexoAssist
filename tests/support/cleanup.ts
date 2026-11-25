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

/** Desconecta o Prisma do processo de teste. */
export async function disconnectTestDb(): Promise<void> {
  await prisma.$disconnect();
}
