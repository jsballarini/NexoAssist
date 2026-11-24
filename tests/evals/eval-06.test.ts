import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-06", () => {
  it("VPN Win11 reunião → draft alta; pergunta afetados", async () => {
    const result = await runEvalTurn(
      "VPN não conecta no Windows 11, tenho reunião às 14h",
    );
    expect(result.trace.actions).toContain("create_draft");
    const draft = result.uiBlocks.find((b) => b.type === "draft_card");
    expect(draft).toBeDefined();
    if (draft && draft.type === "draft_card") {
      expect(draft.priority).toBe("high");
    }
    const qr = result.uiBlocks.find((b) => b.type === "quick_replies");
    expect(qr).toBeDefined();
  });
});