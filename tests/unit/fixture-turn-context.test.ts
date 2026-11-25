import { describe, expect, it } from "vitest";
import { runAgentTurn } from "../../lib/agent";
import { EMPTY_TURN_CONTEXT } from "../../lib/agent/turn-context";
import { createFakeAdapters, FAKE_CTX } from "./helpers/fake-agent";

describe("fixture com contexto de conversa", () => {
  it("refaz o rascunho pendente com a abrangência da quick reply", async () => {
    const { adapters, calls } = createFakeAdapters();
    const result = await runAgentTurn("Equipe (5–20)", FAKE_CTX, adapters, {
      ...EMPTY_TURN_CONTEXT,
      pendingDraft: {
        draftId: "D-OLD",
        operation: "create",
        title: "VPN Windows 11",
        priority: "high",
        dueAtPreview: new Date().toISOString(),
      },
    });

    expect(result.trace.actions).toEqual(["cancel_draft", "create_draft"]);
    expect(calls.createDraft[0].payload).toMatchObject({ affectedScope: "team", title: "VPN Windows 11" });
    expect(result.uiBlocks.some((b) => b.type === "draft_card")).toBe(true);
  });

  it("sem rascunho pendente, a quick reply não dispara ferramentas", async () => {
    const { adapters } = createFakeAdapters();
    const result = await runAgentTurn("Equipe (5–20)", FAKE_CTX, adapters);
    expect(result.trace.actions).toEqual([]);
  });

  it("não depende do nome do usuário para reabrir chamado SAP", async () => {
    const { adapters } = createFakeAdapters();
    const result = await runAgentTurn("minha senha do SAP foi bloqueada", { ...FAKE_CTX, userName: "Qualquer Um" }, adapters);
    expect(result.trace.actions).toEqual(["list_recent_resolved", "create_draft"]);
  });
});
