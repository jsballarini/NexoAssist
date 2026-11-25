import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { buildInboxETag, listInboxItems } from "@/lib/analyst/inbox";
import { createConversation } from "@/lib/conversation/repository";

const created: string[] = [];
let sequence = 910_000;

async function conversationWithConfidence(userId: string, confidence: number, rulesFired: string[]) {
  sequence += 1;
  const conv = await createConversation(userId, sequence);
  created.push(conv.id);
  await prisma.message.create({ data: { conversationId: conv.id, role: "user", content: "INT-REVIEW pergunta" } });
  const msg = await prisma.message.create({
    data: { conversationId: conv.id, role: "assistant", content: "INT-REVIEW resposta" },
  });
  await prisma.agentTrace.create({
    data: {
      messageId: msg.id,
      understanding: "teste",
      actions: [],
      confidence,
      rulesFired,
      evidence: [],
    },
  });
  return conv.id;
}

afterAll(async () => {
  await prisma.conversation.deleteMany({ where: { id: { in: created } } });
});

describe("INT-INBOX-REVIEW (G2-AN-01/02): revisão sugerida na fila", () => {
  it("lista conversa com o agent de baixa confiança como `review` e ignora a confiante", async () => {
    const elisa = await prisma.user.findUniqueOrThrow({ where: { email: "elisa.prado@nexo.com.br" } });
    const low = await conversationWithConfidence(elisa.id, 30, ["SCOPE_IT"]);
    const high = await conversationWithConfidence(elisa.id, 92, ["SCOPE_IT"]);

    const items = await listInboxItems();
    const lowItem = items.find((i) => i.conversationId === low);
    expect(lowItem).toMatchObject({ inboxKind: "review", needsReview: true, state: "with_agent", confidenceLast: 30 });
    expect(items.some((i) => i.conversationId === high)).toBe(false);
  });

  it("a regra TRANSFER_LOW_CONFIDENCE basta, mesmo com confiança acima do limiar", async () => {
    const elisa = await prisma.user.findUniqueOrThrow({ where: { email: "elisa.prado@nexo.com.br" } });
    const id = await conversationWithConfidence(elisa.id, 80, ["TRANSFER_LOW_CONFIDENCE"]);
    const items = await listInboxItems();
    expect(items.find((i) => i.conversationId === id)?.needsReview).toBe(true);
  });

  it("a demo semeada deixa a revisão sugerida não vazia e os transferidos vêm primeiro", async () => {
    const active = (await listInboxItems()).filter((i) => i.state !== "closed");
    const firstReview = active.findIndex((i) => i.inboxKind === "review");
    expect(firstReview).toBeGreaterThanOrEqual(0);
    expect(active.slice(firstReview).every((i) => i.inboxKind === "review")).toBe(true);
  });

  it("o ETag muda quando a revisão sugerida muda", async () => {
    const items = await listInboxItems();
    const flipped = items.map((i, idx) => (idx === 0 ? { ...i, needsReview: !i.needsReview } : i));
    expect(buildInboxETag(flipped)).not.toBe(buildInboxETag(items));
  });
});
