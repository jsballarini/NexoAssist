import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-07", () => {
  it("mesmo notebook lento → update INC-20311", async () => {
    const result = await runEvalTurn("O mesmo notebook continua lento após update");
    expect(result.trace.actions).toContain("list_open_tickets");
    expect(result.trace.actions).toContain("create_draft");
    expect(
      result.content.includes("INC-20311") || result.content.includes("atualizar"),
    ).toBeTruthy();
    const draft = result.uiBlocks.find((b) => b.type === "draft_card");
    expect(draft).toBeDefined();
    if (draft && draft.type === "draft_card") {
      expect(draft.operation).toBe("update");
    }
  });
});