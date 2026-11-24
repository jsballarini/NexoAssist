import { prisma } from "@/lib/db";

export async function findSeedTransferConversation(employeeEmail: string) {
  const user = await prisma.user.findUnique({ where: { email: employeeEmail } });
  if (!user) return null;
  return prisma.conversation.findFirst({
    where: { userId: user.id, state: { in: ["awaiting_analyst", "with_analyst"] } },
    orderBy: { updatedAt: "asc" },
  });
}