import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-04", () => {
  it("INC-20311 get_ticket e menciona vencido", async () => {
    const result = await runEvalTurn("Como está o INC-20311?");
    expect(result.trace.actions).toContain("get_ticket");
    expect(result.content.toLowerCase()).toMatch(/vencido|20311/);
    expect(result.uiBlocks.some((b) => b.type === "ticket_card")).toBe(true);
  });
});