import { describe, expect, it } from "vitest";
import { parseAgentDecision } from "../../lib/agent/schemas";

describe("parseAgentDecision", () => {
  it("aceita JSON em string e reasoning omitido", () => {
    const raw = JSON.stringify({
      understanding: "Quer status",
      confidence: "82",
      reasoning: "",
    });
    const d = parseAgentDecision(raw);
    expect(d?.confidence).toBe(82);
    expect(d?.reasoning).toBe("Quer status");
  });

  it("rejeita confidence inválido", () => {
    expect(parseAgentDecision({ understanding: "x", confidence: "alto", reasoning: "y" })).toBeUndefined();
  });
});