import { assumeConversation } from "@/lib/analyst";
import { ConversationAlreadyAssignedError } from "@/lib/analyst/errors";
import { prisma } from "@/lib/db";
import { describe, expect, it } from "vitest";

describe("INT-409-01", () => {
  it("segundo analista recebe 409 ao assumir", async () => {
    let conv = await prisma.conversation.findFirst({
      where: { state: "awaiting_analyst" },
    });
    if (!conv) {
      const employee = await prisma.user.findUniqueOrThrow({
        where: { email: "ana.souza@nexo.com.br" },
      });
      conv = await prisma.conversation.create({
        data: {
          userId: employee.id,
          state: "awaiting_analyst",
          sessionSequence: 1,
          messageCount: 0,
        },
      });
    }

    const rafael = await prisma.user.findUnique({
      where: { email: "rafael.lima@nexo.com.br" },
    });
    const mariana = await prisma.user.findUnique({
      where: { email: "mariana.costa@nexo.com.br" },
    });
    if (!rafael || !mariana) throw new Error("analysts required");

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { state: "awaiting_analyst", assignedAnalystId: null },
    });

    await assumeConversation(rafael.id, conv.id);

    await expect(assumeConversation(mariana.id, conv.id)).rejects.toBeInstanceOf(
      ConversationAlreadyAssignedError,
    );

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { state: "awaiting_analyst", assignedAnalystId: null },
    });
  });
});