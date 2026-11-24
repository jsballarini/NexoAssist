import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-01", () => {
  it("saudação sem ticket tools", async () => {
    const result = await runEvalTurn("Olá");
    expect(result.trace.actions).toEqual([]);
    expect(result.content.toLowerCase()).toMatch(/olá|ajudar/);
    expect(result.trace.confidence).toBeGreaterThanOrEqual(0);
    expect(result.trace.confidence).toBeLessThanOrEqual(100);
  });
});