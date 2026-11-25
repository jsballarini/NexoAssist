import { describe, expect, it } from "vitest";
import {
  buildModelMessages,
  describeTurnState,
  type TurnContext,
} from "../../lib/agent/turn-context";

function ctx(messages: TurnContext["messages"], extra?: Partial<TurnContext>): TurnContext {
  return { messages, conversationState: "with_agent", ...extra };
}

describe("buildModelMessages", () => {
  it("remove a mensagem atual duplicada e a anexa no fim", () => {
    const out = buildModelMessages(
      ctx([
        { role: "user", content: "oi" },
        { role: "assistant", content: "Olá!" },
        { role: "user", content: "Só eu" },
      ]),
      "Só eu",
      20,
    );
    expect(out).toEqual([
      { role: "user", content: "oi" },
      { role: "assistant", content: "Olá!" },
      { role: "user", content: "Só eu" },
    ]);
  });

  it("trunca para as últimas N mensagens do histórico", () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `m${i}`,
    }));
    const out = buildModelMessages(ctx(history), "atual", 3);
    expect(out.map((m) => m.content)).toEqual(["m7", "m8", "m9", "atual"]);
  });

  it("descarta analista e converte system em nota", () => {
    const out = buildModelMessages(
      ctx([
        { role: "analyst", content: "segredo interno" },
        { role: "system", content: "Transferência para analista" },
      ]),
      "continua",
      20,
    );
    expect(out).toHaveLength(2);
    expect(out[0].content).toContain("[nota do sistema]");
    expect(out.some((m) => m.content.includes("segredo interno"))).toBe(false);
  });

  it("com limite zero envia só a mensagem atual", () => {
    const out = buildModelMessages(ctx([{ role: "user", content: "a" }]), "b", 0);
    expect(out).toEqual([{ role: "user", content: "b" }]);
  });
});

describe("describeTurnState", () => {
  it("descreve rascunho pendente e chamado em foco", () => {
    const text = describeTurnState(
      ctx([], {
        pendingDraft: {
          draftId: "D-7",
          operation: "create",
          title: "VPN caiu",
          priority: "high",
          dueAtPreview: new Date().toISOString(),
        },
        focusedTicketId: "INC-20311",
      }),
    );
    expect(text).toContain("D-7");
    expect(text).toContain("INC-20311");
  });

  it("informa ausência de estado", () => {
    expect(describeTurnState(ctx([]))).toMatch(/Sem rascunho/);
  });
});
