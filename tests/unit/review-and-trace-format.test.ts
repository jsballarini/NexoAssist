import { describe, expect, it } from "vitest";
import { isReviewSuggested } from "@/lib/analyst/review";
import { formatUsage, ruleLabels } from "@/lib/chat/trace-format";

describe("UNIT-REVIEW: revisão sugerida (G2-AN-01)", () => {
  it("sinaliza confiança abaixo do limiar", () => {
    expect(isReviewSuggested({ confidence: 49, rulesFired: [] }, 50)).toBe(true);
    expect(isReviewSuggested({ confidence: 50, rulesFired: [] }, 50)).toBe(false);
  });

  it("sinaliza pela regra de baixa segurança mesmo com confiança alta", () => {
    expect(isReviewSuggested({ confidence: 90, rulesFired: ["TRANSFER_LOW_CONFIDENCE"] }, 50)).toBe(true);
  });

  it("sem trace não há revisão", () => {
    expect(isReviewSuggested({ confidence: null, rulesFired: undefined }, 50)).toBe(false);
  });
});

describe("UNIT-TRACE-FORMAT (G2-UI trace)", () => {
  it("traduz regras conhecidas e preserva as desconhecidas", () => {
    expect(ruleLabels(["TRANSFER_SLA_BREACH", "OUTRA"])).toEqual(["Transferência por prazo vencido", "OUTRA"]);
  });

  it("formata consumo de tokens e latência; null não exibe nada", () => {
    expect(formatUsage({ promptTokens: 1100, completionTokens: 150, latencyMs: 2400 })).toBe(
      "1.250 tokens (1.100 entrada / 150 saída) · 2,4 s",
    );
    expect(formatUsage(null)).toBeNull();
  });
});
