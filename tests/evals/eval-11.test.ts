import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-11", () => {
  it("e-mail corporativo em massa → prioridade crítica", async () => {
    const result = await runEvalTurn(
      "Todo mundo da empresa está sem e-mail, o Outlook parou",
    );
    expect(result.trace.actions).toContain("create_draft");
    expect(result.content.toLowerCase()).toMatch(/crítico|critico|rascunho/);
  });
});