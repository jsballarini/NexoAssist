import { prisma } from "@/lib/db";
import { postUserMessage } from "@/lib/conversation";
import { assumeConversation } from "@/lib/analyst/handoff";
import { beforeAll, describe, expect, it } from "vitest";

describe("INT-EMPLOYEE-HANDOFF-MSG", () => {
  let employeeId: string;
  let analystId: string;
  let conversationId: string;

  beforeAll(async () => {
    const employee = await prisma.user.findUnique({
      where: { email: "carla.mendes@nexo.com.br" },
    });
    const analyst = await prisma.user.findUnique({
      where: { email: "rafael.lima@nexo.com.br" },
    });
    if (!employee || !analyst) throw new Error("seed users missing");
    employeeId = employee.id;
    analystId = analyst.id;

    const conv = await prisma.conversation.findFirst({
      where: { userId: employeeId, state: { in: ["with_agent", "awaiting_analyst", "with_analyst"] } },
      orderBy: { updatedAt: "desc" },
    });
    if (!conv) throw new Error("no active conversation for Carla");
    conversationId = conv.id;

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { state: "awaiting_analyst", assignedAnalystId: null },
    });
    await assumeConversation(analystId, conversationId);
  });

  it("allows employee messages while with_analyst without agent turn", async () => {
    const before = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: { messageCount: true, state: true },
    });
    expect(before.state).toBe("with_analyst");

    const text = `handoff reply ${Date.now()}`;
    const result = await postUserMessage(employeeId, "Carla Mendes", "Comercial", text);
    expect(result).toMatchObject({ conversationId, handoff: true });
    expect("turnId" in result).toBe(false);

    const after = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: { messageCount: true },
    });
    expect(after.messageCount).toBe(before.messageCount);

    const msg = await prisma.message.findFirst({
      where: { conversationId, content: text, role: "user" },
    });
    expect(msg).not.toBeNull();
  });
});