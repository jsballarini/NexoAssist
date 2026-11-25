import type { PrismaClient } from "@prisma/client";

/** Texto do funcionário usado como marcador para localizar a conversa de demonstração. */
export const LOW_CONFIDENCE_MARKER = "Meu notebook trava de vez em quando";
const LOW_CONFIDENCE_VALUE = 38;

const MESSAGES = [
  {
    role: "user" as const,
    content: `${LOW_CONFIDENCE_MARKER}, não sei se é bateria ou Windows. O que faço?`,
  },
  {
    role: "assistant" as const,
    content:
      "Não tenho segurança sobre a causa das travadas. Posso abrir um chamado ou chamar um analista para ajudar.",
  },
];

type Db = Pick<PrismaClient, "conversation" | "message" | "agentTrace">;

/**
 * Garante uma conversa **com o agent** cujo último turno tem baixa confiança, para que a
 * fila do analista mostre "Revisão sugerida" desde o seed (idempotente).
 */
export async function ensureLowConfidenceConversation(db: Db, userId: string): Promise<string> {
  const existing = await db.conversation.findFirst({
    where: { userId, messages: { some: { content: { contains: LOW_CONFIDENCE_MARKER } } } },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) {
    await db.conversation.update({
      where: { id: existing.id },
      data: { state: "with_agent", assignedAnalystId: null, updatedAt: new Date() },
    });
    return existing.id;
  }

  const conv = await db.conversation.create({
    data: { userId, state: "with_agent", sessionSequence: 1, messageCount: 1 },
  });
  for (const m of MESSAGES) {
    const msg = await db.message.create({
      data: { conversationId: conv.id, role: m.role, content: m.content },
    });
    if (m.role === "assistant") {
      await db.agentTrace.create({
        data: {
          messageId: msg.id,
          understanding: "Relato de lentidão no notebook sem causa identificada.",
          actions: [],
          confidence: LOW_CONFIDENCE_VALUE,
          rulesFired: ["SCOPE_IT", "TRANSFER_LOW_CONFIDENCE"],
          evidence: [],
          reasoning: "Poucas evidências na base de conhecimento para o sintoma descrito.",
        },
      });
    }
  }
  return conv.id;
}
