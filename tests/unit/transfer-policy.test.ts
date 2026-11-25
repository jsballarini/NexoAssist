import { afterEach, describe, expect, it } from "vitest";
import {
  describeTransferReasons,
  evaluateTransferNeed,
  userRequestedAnalyst,
} from "../../lib/agent/transfer-policy";

const BASE = { critical: false, slaBreached: false, userRequested: false } as const;

afterEach(() => {
  delete process.env.AGENT_CONFIDENCE_TRANSFER_OFFER;
  delete process.env.AGENT_CONFIDENCE_TRANSFER_STRONG;
});

describe("evaluateTransferNeed (G2-RG-04/05)", () => {
  it("sem sinais, não faz nada", () => {
    expect(evaluateTransferNeed({ ...BASE, confidence: 80 })).toEqual({ action: "none", reasons: [] });
  });

  it("pedido do funcionário transfere", () => {
    expect(evaluateTransferNeed({ ...BASE, userRequested: true, confidence: 90 })).toEqual({
      action: "transfer",
      reasons: ["TRANSFER_USER_REQUEST"],
    });
  });

  it("prioridade critical transfere", () => {
    expect(evaluateTransferNeed({ ...BASE, critical: true, confidence: 90 }).reasons).toContain(
      "TRANSFER_CRITICAL",
    );
  });

  it("SLA vencido apenas oferece analista", () => {
    expect(evaluateTransferNeed({ ...BASE, slaBreached: true, confidence: 90 })).toEqual({
      action: "offer",
      reasons: ["TRANSFER_SLA_BREACH"],
    });
  });

  it("confiança abaixo do limiar de oferta oferece; abaixo do forte transfere", () => {
    expect(evaluateTransferNeed({ ...BASE, confidence: 45 }).action).toBe("offer");
    expect(evaluateTransferNeed({ ...BASE, confidence: 30 })).toEqual({
      action: "transfer",
      reasons: ["TRANSFER_LOW_CONFIDENCE"],
    });
  });

  it("respeita os limiares configurados por ambiente", () => {
    process.env.AGENT_CONFIDENCE_TRANSFER_OFFER = "70";
    process.env.AGENT_CONFIDENCE_TRANSFER_STRONG = "60";
    expect(evaluateTransferNeed({ ...BASE, confidence: 65 }).action).toBe("offer");
    expect(evaluateTransferNeed({ ...BASE, confidence: 55 }).action).toBe("transfer");
  });

  it("sem decisão reportada ou fora de escopo, a confiança não dispara transferência", () => {
    expect(evaluateTransferNeed({ ...BASE, confidence: undefined }).action).toBe("none");
    expect(evaluateTransferNeed({ ...BASE, confidence: 10, outOfScope: true }).action).toBe("none");
  });

  it("transferência vence oferta quando há os dois sinais", () => {
    const decision = evaluateTransferNeed({ ...BASE, critical: true, slaBreached: true, confidence: 80 });
    expect(decision.action).toBe("transfer");
    expect(describeTransferReasons(decision.reasons)).toMatch(/crítico/i);
  });
});

describe("userRequestedAnalyst", () => {
  it.each(["quero falar com um analista", "Chamar um analista", "preciso falar com alguém", "falar com humano"])(
    "detecta %s",
    (text) => expect(userRequestedAnalyst(text)).toBe(true),
  );

  it("não confunde com consultas comuns", () => {
    expect(userRequestedAnalyst("qual o status do meu chamado?")).toBe(false);
  });
});
