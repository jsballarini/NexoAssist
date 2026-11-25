import { describe, expect, it } from "vitest";
import { runAgentTurn } from "../../lib/agent";
import { EMPTY_TURN_CONTEXT } from "../../lib/agent/turn-context";
import { createFakeAdapters, FAKE_CTX } from "./helpers/fake-agent";

const VPN_MESSAGE = "VPN não conecta no Windows 11, reunião às 14h";

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

  it("sem rascunho pendente nem pergunta anterior, a quick reply não dispara ferramentas", async () => {
    const { adapters } = createFakeAdapters();
    const result = await runAgentTurn("Equipe (5–20)", FAKE_CTX, adapters);
    expect(result.trace.actions).toEqual([]);
  });

  it("VPN em dois passos: pergunta a abrangência e só depois cria o rascunho", async () => {
    const { adapters, calls } = createFakeAdapters({ openTickets: [] });

    const step1 = await runAgentTurn(VPN_MESSAGE, FAKE_CTX, adapters);
    expect(step1.trace.actions).toEqual([]);
    expect(calls.createDraft).toHaveLength(0);
    expect(step1.uiBlocks.some((b) => b.type === "quick_replies")).toBe(true);

    const step2 = await runAgentTurn("Só eu", FAKE_CTX, adapters, {
      ...EMPTY_TURN_CONTEXT,
      messages: [
        { role: "user", content: VPN_MESSAGE },
        { role: "assistant", content: step1.content },
        { role: "user", content: "Só eu" },
      ],
    });
    expect(step2.trace.actions).toEqual(["create_draft"]);
    expect(calls.createDraft[0].payload).toMatchObject({ priority: "high", affectedScope: "only_me" });
  });

  it("não depende do nome do usuário para reabrir chamado SAP", async () => {
    const { adapters } = createFakeAdapters();
    const result = await runAgentTurn("minha senha do SAP foi bloqueada", { ...FAKE_CTX, userName: "Qualquer Um" }, adapters);
    expect(result.trace.actions).toEqual(["list_recent_resolved", "create_draft"]);
  });
});
