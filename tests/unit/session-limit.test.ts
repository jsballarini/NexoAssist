import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getOrCreateActive, postUserMessage } from "@/lib/conversation/service";
import { SessionMessageLimitError } from "@/lib/conversation/types";

describe("UNIT-SESSION-01", () => {
  it("bloqueia o 31º envio do usuário (contador só mensagens user)", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "ana.souza@nexo.com.br" },
    });
    if (!user) throw new Error("seed required");

    await prisma.conversation.updateMany({
      where: {
        userId: user.id,
        state: { in: ["with_agent", "awaiting_analyst"] },
      },
      data: { state: "closed" },
    });
    const conv = await getOrCreateActive(user.id);
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { messageCount: 30, state: "with_agent" },
    });

    await expect(
      postUserMessage(user.id, user.name, "Financeiro", "teste limite"),
    ).rejects.toBeInstanceOf(SessionMessageLimitError);

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { messageCount: 0, state: "with_agent" },
    });
  });
});