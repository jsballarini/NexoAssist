import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-10", () => {
  it("vale refeição RH → out_of_scope", async () => {
    const result = await runEvalTurn("Como solicito vale refeição pelo RH?");
    expect(result.trace.rulesFired).toContain("OUT_OF_SCOPE");
    expect(result.trace.actions).not.toContain("create_draft");
    expect(result.content.toLowerCase()).toMatch(/rh/);
  });
});