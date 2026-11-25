import { describe, expect, it } from "vitest";
import {
  REPORT_DECISION_TOOL,
  createMastraTools,
  describeToolError,
} from "../../lib/agent/mastra/tools";
import { createFakeAdapters, FAKE_CTX } from "./helpers/fake-agent";

type Executable = { execute: (input: unknown, context?: unknown) => Promise<unknown> };

function tool(tools: ReturnType<typeof createMastraTools>, name: string): Executable {
  return (tools as unknown as Record<string, Executable>)[name];
}

describe("createMastraTools", () => {
  it("expõe as ferramentas do domínio e report_decision", () => {
    const { adapters } = createFakeAdapters();
    const names = Object.keys(createMastraTools(FAKE_CTX, adapters));
    expect(names).toEqual(
      expect.arrayContaining([
        "list_open_tickets",
        "get_ticket",
        "search_kb",
        "create_draft",
        "cancel_draft",
        "transfer_to_analyst",
        REPORT_DECISION_TOOL,
      ]),
    );
  });

  it("usa o requesterId da sessão, nunca um valor vindo do modelo", async () => {
    const { adapters, calls } = createFakeAdapters();
    const tools = createMastraTools(FAKE_CTX, adapters);

    await tool(tools, "list_open_tickets").execute({ requesterId: "outro-usuario" });
    await tool(tools, "create_draft").execute({
      operation: "create",
      title: "Teste",
      requesterId: "outro-usuario",
    });

    expect(calls.listOpen).toEqual([FAKE_CTX.userId]);
    expect(calls.createDraft[0].requesterId).toBe(FAKE_CTX.userId);
  });

  it("transfere usando a conversa do contexto", async () => {
    const { adapters, calls } = createFakeAdapters();
    const tools = createMastraTools(FAKE_CTX, adapters);
    await tool(tools, "transfer_to_analyst").execute({ reason: "Cliente pediu analista" });
    expect(calls.transfer).toEqual([
      { conversationId: FAKE_CTX.conversationId, reason: "Cliente pediu analista" },
    ]);
  });

  it("devolve { error } sem vazar existência de chamado de terceiros", async () => {
    const { adapters } = createFakeAdapters();
    const tools = createMastraTools(FAKE_CTX, adapters);
    const result = (await tool(tools, "get_ticket").execute({ publicId: "INC-404" })) as {
      error: string;
    };
    expect(result.error).toMatch(/não encontrado/i);
    expect(result.error).not.toMatch(/forbidden|owner/i);
  });
});

describe("describeToolError", () => {
  it("limita o tamanho da mensagem", () => {
    expect(describeToolError(new Error("x".repeat(1000))).length).toBeLessThanOrEqual(200);
  });
});
