import { describe, expect, it } from "vitest";
import { detectOutOfScope, inferRulesFromContent } from "@/lib/domain/rules";

describe("UNIT-RULES-01", () => {
  it("pedido RH → outOfScope", () => {
    expect(detectOutOfScope("Como resgatar vale refeição?")).toBe(true);
    const rules = inferRulesFromContent("vale refeição RH", []);
    expect(rules).toContain("OUT_OF_SCOPE");
    expect(rules).not.toContain("SCOPE_IT");
  });
});