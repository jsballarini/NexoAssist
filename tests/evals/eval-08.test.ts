import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-08", () => {
  it("adicionar info INC-20311 → update draft", async () => {
    const result = await runEvalTurn("Quero adicionar mais informações ao INC-20311");
    expect(result.trace.actions).toContain("create_draft");
    const draft = result.uiBlocks.find((b) => b.type === "draft_card");
    expect(draft).toBeDefined();
  });
});