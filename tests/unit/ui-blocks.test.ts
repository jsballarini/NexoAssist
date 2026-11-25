import { describe, expect, it } from "vitest";
import { activeDraftCardsFromCalls, buildUiBlocks } from "../../lib/agent/ui-blocks";
import type { ToolCallRecord } from "../../lib/agent/tool-records";
import type { DraftSummary } from "../../lib/agent/draft-types";

const summary = (id: string): DraftSummary => ({
  draftId: id,
  operation: "create",
  title: "VPN",
  priority: "high",
  dueAtPreview: "2026-11-25T12:00:00.000Z",
  category: "rede_vpn",
  type: "INC",
  description: "Não conecta",
  affectedScope: "only_me",
});

describe("activeDraftCardsFromCalls", () => {
  it("mostra só o último rascunho após cancelar o anterior no mesmo turno", () => {
    const calls: ToolCallRecord[] = [
      { name: "create_draft", args: {}, result: summary("D-2") },
      { name: "cancel_draft", args: { draftId: "D-2" }, result: { cancelled: true, draftId: "D-2" } },
      { name: "create_draft", args: {}, result: summary("D-3") },
    ];
    const cards = activeDraftCardsFromCalls(calls);
    expect(cards).toHaveLength(1);
    expect(cards[0].type).toBe("draft_card");
    if (cards[0].type === "draft_card") expect(cards[0].draftId).toBe("D-3");
  });

  it("buildUiBlocks não duplica draft_card", () => {
    const calls: ToolCallRecord[] = [
      { name: "create_draft", args: {}, result: summary("D-2") },
      { name: "create_draft", args: {}, result: summary("D-3") },
    ];
    const blocks = buildUiBlocks(calls, { confidence: 90 });
    const drafts = blocks.filter((b) => b.type === "draft_card");
    expect(drafts).toHaveLength(1);
    if (drafts[0].type === "draft_card") expect(drafts[0].draftId).toBe("D-3");
  });
});