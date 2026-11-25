import { describe, expect, it } from "vitest";
import { runTool } from "../../lib/agent/tools";
import { createFakeAdapters, FAKE_CTX } from "./helpers/fake-agent";

const COMPLETE_ARGS = {
  operation: "create",
  type: "INC",
  category: "rede_vpn",
  description: "A VPN cai a cada poucos minutos",
  impact: "team",
  urgency: "blocking_work",
};

describe("create_draft guardado (G2-RG-01/02/03)", () => {
  it("deriva a prioridade de impacto × urgência e ignora prioridade do modelo", async () => {
    const { adapters, calls } = createFakeAdapters();
    await runTool(
      "create_draft",
      { ...COMPLETE_ARGS, title: "Teclado quebrado", impact: "only_me", urgency: "low", priority: "critical" },
      FAKE_CTX,
      adapters,
    );
    expect(calls.createDraft[0].payload).toMatchObject({ priority: "low", affectedScope: "only_me" });
  });

  it("equipe parada vira critical", async () => {
    const { adapters, calls } = createFakeAdapters();
    await runTool("create_draft", { ...COMPLETE_ARGS, title: "Impressora do andar parada" }, FAKE_CTX, adapters);
    expect(calls.createDraft[0].payload).toMatchObject({ priority: "critical", affectedScope: "team" });
  });

  it("devolve DRAFT_INCOMPLETE listando os campos que faltam", async () => {
    const { adapters, calls } = createFakeAdapters();
    const result = await runTool(
      "create_draft",
      { operation: "create", title: "Monitor piscando" },
      FAKE_CTX,
      adapters,
    );
    expect(result).toMatchObject({ ok: false, code: "DRAFT_INCOMPLETE" });
    expect((result as { missing: string[] }).missing).toEqual(
      expect.arrayContaining(["description", "type", "category", "affectedScope", "urgency"]),
    );
    expect(calls.createDraft).toHaveLength(0);
  });

  it("devolve DUPLICATE_CANDIDATE quando há chamado aberto parecido", async () => {
    const { adapters, calls } = createFakeAdapters();
    const result = await runTool("create_draft", { ...COMPLETE_ARGS, title: "VPN caiu" }, FAKE_CTX, adapters);
    expect(result).toMatchObject({
      ok: false,
      code: "DUPLICATE_CANDIDATE",
      duplicate: { operation: "update", targetTicketId: "INC-1" },
    });
    expect(calls.createDraft).toHaveLength(0);
  });

  it("confirmedNew=true cria o rascunho apesar do chamado parecido", async () => {
    const { adapters, calls } = createFakeAdapters();
    await runTool(
      "create_draft",
      { ...COMPLETE_ARGS, title: "VPN caiu", confirmedNew: true },
      FAKE_CTX,
      adapters,
    );
    expect(calls.createDraft).toHaveLength(1);
  });
});

describe("privacidade de get_ticket (G2-RS-02)", () => {
  it("chamado de terceiros e inexistente são indistinguíveis", async () => {
    const { adapters } = createFakeAdapters();
    const foreign = await runTool("get_ticket", { publicId: "INC-404" }, FAKE_CTX, adapters);
    expect(foreign).toEqual({ found: false, messageKey: "ticket_not_in_your_list" });
    expect(JSON.stringify(foreign)).not.toMatch(/forbidden|owner|outro/i);
  });
});
