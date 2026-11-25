import { describe, expect, it } from "vitest";
import { AgentDecisionSchema, AgentTurnSchema } from "../../lib/agent/schemas";

const valid = {
  understanding: "Funcionário quer saber o status do chamado.",
  confidence: 82,
  reasoning: "Consultei os chamados abertos porque ele perguntou do andamento.",
};

describe("AgentDecisionSchema", () => {
  it("aceita decisão válida", () => {
    expect(AgentDecisionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita confiança fora de 0-100", () => {
    expect(AgentDecisionSchema.safeParse({ ...valid, confidence: 120 }).success).toBe(false);
    expect(AgentDecisionSchema.safeParse({ ...valid, confidence: -1 }).success).toBe(false);
  });

  it("rejeita reasoning vazio", () => {
    expect(AgentDecisionSchema.safeParse({ ...valid, reasoning: "   " }).success).toBe(false);
  });
});

describe("AgentTurnSchema", () => {
  it("exige content", () => {
    expect(AgentTurnSchema.safeParse(valid).success).toBe(false);
    expect(AgentTurnSchema.safeParse({ ...valid, content: "Olá" }).success).toBe(true);
  });
});
