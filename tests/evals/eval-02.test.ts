import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-02", () => {
  it("status meu chamado usa list_open_tickets", async () => {
    const result = await runEvalTurn("Qual o status dos meus chamados?");
    expect(result.trace.actions).toContain("list_open_tickets");
    expect(result.trace.rulesFired).toContain("TICKET_LOOKUP");
  });
});