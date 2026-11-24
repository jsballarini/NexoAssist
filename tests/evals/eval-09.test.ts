import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-09", () => {
  it("pedido humano → transfer", async () => {
    const result = await runEvalTurn("Preciso falar com um analista humano");
    expect(result.trace.actions).toContain("transfer_to_analyst");
    expect(result.content.toLowerCase()).toMatch(/analista|transfer/);
  });
});