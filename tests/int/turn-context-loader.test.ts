import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { loadTurnContext } from "@/lib/conversation/turn-context-loader";
import { addAssistantMessage, addUserMessage } from "@/lib/conversation/repository";
import { createTicketServiceClient } from "@/lib/ticket-service";
import { buildModelMessages } from "../../lib/agent/turn-context";

describe("INT-CTX-01 loadTurnContext", () => {
  it("carrega histórico, rascunho pendente e chamado em foco sem duplicar a mensagem atual", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "fabio.nunes@nexo.com.br" },
    });
    if (!user) throw new Error("seed required");

    const conv = await prisma.conversation.create({
      data: { userId: user.id, state: "closed", sessionSequence: 9999 },
    });
    const client = createTicketServiceClient();
    const draft = await client.createDraft(user.id, "create", {
      type: "INC",
      category: "rede_vpn",
      title: "INT-CTX-01 rascunho",
      description: "Teste de contexto de turno",
      priority: "high",
      affectedScope: "only_me",
    });

    try {
      await addUserMessage(conv.id, "Minha VPN caiu");
      await addAssistantMessage(
        conv.id,
        "Preparei um rascunho. Quem é afetado?",
        [],
        {
          understanding: "VPN caiu",
          actions: ["create_draft"],
          confidence: 70,
          rulesFired: ["SCOPE_IT"],
          evidence: [{ type: "ticket", id: "INC-20311" }],
          reasoning: "Problema de rede.",
        },
      );
      await addUserMessage(conv.id, "Só eu");

      const ctx = await loadTurnContext(conv.id, user.id, { maxMessages: 20 });

      expect(ctx.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
      expect(ctx.pendingDraft?.draftId).toBe(draft.draftId);
      expect(ctx.focusedTicketId).toBe("INC-20311");
      expect(ctx.conversationState).toBe("closed");

      const model = buildModelMessages(ctx, "Só eu", 20);
      expect(model.filter((m) => m.content === "Só eu")).toHaveLength(1);
      expect(model[model.length - 1]).toEqual({ role: "user", content: "Só eu" });
    } finally {
      await client.cancelDraft(user.id, draft.draftId);
      await prisma.conversation.delete({ where: { id: conv.id } });
    }
  });

  it("não expõe rascunho de outro funcionário", async () => {
    const [a, b] = await Promise.all([
      prisma.user.findUnique({ where: { email: "fabio.nunes@nexo.com.br" } }),
      prisma.user.findUnique({ where: { email: "gabriela.rocha@nexo.com.br" } }),
    ]);
    if (!a || !b) throw new Error("seed required");

    const client = createTicketServiceClient();
    const draft = await client.createDraft(a.id, "create", {
      type: "REQ",
      category: "software",
      title: "INT-CTX-01 privado",
      description: "Rascunho privado",
      priority: "low",
      affectedScope: "only_me",
    });
    const conv = await prisma.conversation.create({
      data: { userId: b.id, state: "closed", sessionSequence: 9998 },
    });

    try {
      const ctx = await loadTurnContext(conv.id, b.id, { maxMessages: 20 });
      expect(ctx.pendingDraft?.draftId).not.toBe(draft.draftId);
    } finally {
      await client.cancelDraft(a.id, draft.draftId);
      await prisma.conversation.delete({ where: { id: conv.id } });
    }
  });
});
