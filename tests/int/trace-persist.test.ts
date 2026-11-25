import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { addAssistantMessage } from "@/lib/conversation/repository";
import { listConversationTraces } from "@/lib/analyst/handoff";

describe("INT-TRACE-01 reasoning e usage persistem", () => {
  it("grava reasoning, usage e rawToolCalls reais e expõe nomes ao console", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "fabio.nunes@nexo.com.br" },
    });
    if (!user) throw new Error("seed required");
    const conv = await prisma.conversation.create({
      data: { userId: user.id, state: "closed", sessionSequence: 9997 },
    });

    try {
      const usage = { promptTokens: 120, completionTokens: 40, latencyMs: 850 };
      const msg = await addAssistantMessage(conv.id, "Resposta", [], {
        understanding: "Consulta de chamados",
        actions: ["list_open_tickets"],
        confidence: 80,
        rulesFired: ["TICKET_LOOKUP"],
        evidence: [],
        reasoning: "Ele perguntou do andamento, então listei os chamados abertos.",
        rawToolCalls: [{ name: "list_open_tickets", args: {} }],
        usage,
      });

      const row = await prisma.agentTrace.findUnique({ where: { messageId: msg.id } });
      expect(row?.reasoning).toContain("listei os chamados");
      expect(row?.usage).toEqual(usage);
      expect(row?.rawToolCalls).toEqual([{ name: "list_open_tickets", args: {} }]);

      const traces = await listConversationTraces(conv.id);
      expect(traces[0].trace.rawToolCalls).toEqual(["list_open_tickets"]);
      expect(traces[0].trace.reasoning).toContain("listei");
      expect(traces[0].trace.usage).toEqual(usage);
    } finally {
      await prisma.conversation.delete({ where: { id: conv.id } });
    }
  });
});
