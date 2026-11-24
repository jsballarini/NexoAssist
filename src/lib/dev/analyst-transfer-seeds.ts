import { prisma } from "@/lib/db";

export const ANA_TRANSFER_MARKER = "CONV-ana-transfer";
const CARLA_SAP_MARKER = "Transferência para analista: acesso SAP urgente.";

type SeedMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  confidence?: number;
};

const ANA_MESSAGES: SeedMessage[] = [
  { role: "user", content: "Qual o status dos meus chamados?" },
  {
    role: "assistant",
    content:
      "Estes são seus chamados abertos:\n• INC-20311: Notebook lento após atualização do Windows (Aguardando analista) — **prazo vencido**",
    confidence: 41,
  },
  { role: "user", content: "Preciso falar com um analista humano" },
  {
    role: "assistant",
    content:
      "Vou transferir você para um analista humano. O assistente automático ficará pausado até a devolução.",
  },
  {
    role: "system",
    content: `${ANA_TRANSFER_MARKER} — Transferência para analista: INC-20311 vencido. O assistente automático foi pausado.`,
  },
];

const CARLA_MESSAGES: SeedMessage[] = [
  { role: "user", content: "Urgente: não consigo acessar o SAP, bloqueio de senha." },
  {
    role: "assistant",
    content: "Entendo a urgência de acesso ao SAP. Vou transferir para um analista humano.",
  },
  { role: "system", content: CARLA_SAP_MARKER },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function createTransferConversation(
  userId: string,
  messages: SeedMessage[],
  userMessageCount: number,
) {
  const conv = await prisma.conversation.create({
    data: {
      userId,
      state: "awaiting_analyst",
      sessionSequence: 1,
      messageCount: userMessageCount,
      updatedAt: daysAgo(2),
      assignedAnalystId: null,
    },
  });

  for (const m of messages) {
    const msg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        role: m.role,
        content: m.content,
      },
    });
    if (m.role === "assistant" && m.confidence != null) {
      await prisma.agentTrace.create({
        data: {
          messageId: msg.id,
          understanding: "Consulta de chamados abertos.",
          actions: ["list_open_tickets"],
          confidence: m.confidence,
          rulesFired: ["SCOPE_IT"],
          evidence: [{ type: "ticket", id: "INC-20311" }],
          rawToolCalls: ["list_open_tickets"],
        },
      });
    }
  }

  return conv.id;
}

async function restoreOne(
  userId: string,
  marker: string,
  messages: SeedMessage[],
  userMessageCount: number,
) {
  let conv = await prisma.conversation.findFirst({
    where: {
      userId,
      messages: { some: { content: { contains: marker } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!conv) {
    const id = await createTransferConversation(userId, messages, userMessageCount);
    conv = await prisma.conversation.findUniqueOrThrow({ where: { id } });
  } else {
    await prisma.message.deleteMany({ where: { conversationId: conv.id } });
    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        state: "awaiting_analyst",
        assignedAnalystId: null,
        messageCount: userMessageCount,
        updatedAt: daysAgo(2),
      },
    });
    for (const m of messages) {
      const msg = await prisma.message.create({
        data: {
          conversationId: conv.id,
          role: m.role,
          content: m.content,
        },
      });
      if (m.role === "assistant" && m.confidence != null) {
        await prisma.agentTrace.create({
          data: {
            messageId: msg.id,
            understanding: "Consulta de chamados abertos.",
            actions: ["list_open_tickets"],
            confidence: m.confidence,
            rulesFired: ["SCOPE_IT"],
            evidence: [{ type: "ticket", id: "INC-20311" }],
            rawToolCalls: ["list_open_tickets"],
          },
        });
      }
    }
  }

  const others = await prisma.conversation.findMany({
    where: {
      userId,
      id: { not: conv.id },
      state: { in: ["awaiting_analyst", "with_analyst", "closed"] },
    },
    select: { id: true },
  });
  for (const o of others) {
    await prisma.conversation.delete({ where: { id: o.id } });
  }

  await prisma.conversation.update({
    where: { id: conv.id },
    data: { state: "awaiting_analyst", assignedAnalystId: null },
  });

  return conv.id;
}

/** Restaura conversas de transferência da fila do analista (idempotente para E2E). */
export async function restoreAnalystTransferSeeds(anaUserId: string, carlaUserId: string) {
  await restoreOne(anaUserId, ANA_TRANSFER_MARKER, ANA_MESSAGES, 2);
  await restoreOne(carlaUserId, CARLA_SAP_MARKER, CARLA_MESSAGES, 1);
}