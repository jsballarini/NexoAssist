import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-15", () => {
  it("INC-20311 vencido + analista", async () => {
    const result = await runEvalTurn(
      "O INC-20311 está vencido, preciso de um analista",
    );
    expect(result.trace.actions).toContain("transfer_to_analyst");
    expect(result.trace.actions).toContain("get_ticket");
  });
});