import { describe, expect, it } from "vitest";
import {
  RULE_LABELS,
  classifyOutOfScope,
  detectOutOfScope,
  inferRulesFromContent,
  outOfScopeReply,
} from "@/lib/domain/rules";

describe("UNIT-RULES-01", () => {
  it("pedido RH → outOfScope", () => {
    expect(detectOutOfScope("Como resgatar vale refeição?")).toBe(true);
    const rules = inferRulesFromContent("vale refeição RH", []);
    expect(rules).toContain("OUT_OF_SCOPE");
    expect(rules).not.toContain("SCOPE_IT");
  });
});

describe("UNIT-RULES-02 classifyOutOfScope", () => {
  it.each([
    ["Como resgatar vale refeição?", "rh"],
    ["Preciso tirar férias", "rh"],
    ["Preciso de reembolso de viagem", "financeiro"],
    ["Onde envio a nota fiscal do fornecedor?", "financeiro"],
    ["Quero fazer o pagamento a fornecedor", "financeiro"],
    ["O ar-condicionado da sala está quebrado", "facilities"],
    ["Preciso de um novo crachá", "facilities"],
    ["Quero reservar sala para amanhã", "facilities"],
    ["A limpeza do escritório não passou", "facilities"],
  ])("%s → %s", (input, area) => {
    expect(classifyOutOfScope(input)).toEqual({ out: true, area });
  });

  it.each([
    "VPN não conecta no Windows 11",
    "Execute limpeza de disco no meu notebook",
    "Preciso de acesso ao SharePoint",
    "O projetor da sala de reunião não liga",
  ])("assunto de TI permanece no escopo: %s", (input) => {
    expect(classifyOutOfScope(input)).toEqual({ out: false });
  });

  it("a resposta cita a área correta", () => {
    expect(outOfScopeReply("financeiro")).toMatch(/Financeiro/);
    expect(outOfScopeReply("facilities")).toMatch(/Facilities/);
    expect(outOfScopeReply("rh")).toMatch(/RH/);
  });

  it("todas as regras têm rótulo legível", () => {
    for (const label of Object.values(RULE_LABELS)) {
      expect(label.length).toBeGreaterThan(3);
    }
  });
});
