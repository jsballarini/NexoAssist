import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getThreadMessages } from "@/lib/analyst/handoff";
import { createConversationAgentAdapter } from "@/lib/conversation/agent-adapter";
import { createConversation } from "@/lib/conversation/repository";
import { buildHandoffSummary } from "../../lib/agent/handoff-summary";

const createdConversations: string[] = [];
const SEQUENCE_BASE = 900_000;
let sequence = SEQUENCE_BASE;

/** Sequências altas evitam colidir com as sessões reais do seed/e2e. */
function nextSequence(): number {
  sequence += 1;
  return sequence;
}

afterAll(async () => {
  await prisma.conversation.deleteMany({ where: { id: { in: createdConversations } } });
});

describe("INT-HANDOFF-01 (G2-RG-06): resumo estruturado persistido e exposto", () => {
  it("transferToAnalyst salva o snapshot e o analista o lê pela thread", async () => {
    const ana = await prisma.user.findUniqueOrThrow({ where: { email: "ana.souza@nexo.com.br" } });
    const conv = await createConversation(ana.id, nextSequence());
    createdConversations.push(conv.id);

    const adapter = createConversationAgentAdapter(ana.id);
    const summary = buildHandoffSummary({
      problem: "E-mail corporativo fora do ar",
      stepsTried: ["Rascunho crítico criado"],
      ticketIds: ["INC-20311"],
      reason: "Caso crítico",
      confidence: 78,
      rulesFired: ["TRANSFER_CRITICAL"],
    });
    await adapter.transferToAnalyst(conv.id, "Caso crítico", summary);

    const thread = await getThreadMessages(conv.id);
    expect(thread.state).toBe("awaiting_analyst");
    expect(thread.handoffSummary).toEqual(summary);

    await adapter.updateHandoffSummary(conv.id, { confidence: 90 });
    expect((await getThreadMessages(conv.id)).handoffSummary).toMatchObject({ confidence: 90, problem: summary.problem });
  });

  it("conversa sem transferência não expõe resumo", async () => {
    const ana = await prisma.user.findUniqueOrThrow({ where: { email: "ana.souza@nexo.com.br" } });
    const conv = await createConversation(ana.id, nextSequence());
    createdConversations.push(conv.id);
    expect((await getThreadMessages(conv.id)).handoffSummary).toBeNull();
  });

  it("não permite transferir conversa de outro usuário", async () => {
    const ana = await prisma.user.findUniqueOrThrow({ where: { email: "ana.souza@nexo.com.br" } });
    const carla = await prisma.user.findUniqueOrThrow({ where: { email: "carla.mendes@nexo.com.br" } });
    const conv = await createConversation(ana.id, nextSequence());
    createdConversations.push(conv.id);
    await expect(createConversationAgentAdapter(carla.id).transferToAnalyst(conv.id, "x")).rejects.toThrow();
  });
});
