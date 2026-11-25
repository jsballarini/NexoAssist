import { describe, expect, it } from "vitest";
import { runAgentTurn } from "../../lib/agent";
import { buildHandoffSummary, parseHandoffSummary } from "../../lib/agent/handoff-summary";
import { runTool } from "../../lib/agent/tools";
import { createFakeAdapters, FAKE_CTX } from "./helpers/fake-agent";

describe("HandoffSummary (G2-RG-06)", () => {
  it("monta resumo estruturado com limites e sem duplicados", () => {
    const summary = buildHandoffSummary({
      problem: "VPN não conecta",
      stepsTried: ["Reinstalou cliente", "Reinstalou cliente", " "],
      ticketIds: ["INC-1", "INC-1"],
      reason: "Caso crítico",
      confidence: 71.6,
      rulesFired: ["TRANSFER_CRITICAL"],
    });
    expect(summary).toEqual({
      problem: "VPN não conecta",
      stepsTried: ["Reinstalou cliente"],
      ticketIds: ["INC-1"],
      reason: "Caso crítico",
      confidence: 72,
      rulesFired: ["TRANSFER_CRITICAL"],
    });
    expect(parseHandoffSummary(summary)).toEqual(summary);
    expect(parseHandoffSummary({ foo: 1 })).toBeUndefined();
  });

  it("usa o motivo como problema e confiança nula quando não informados", () => {
    const summary = buildHandoffSummary({ reason: "Pedido do funcionário" });
    expect(summary).toMatchObject({ problem: "Pedido do funcionário", confidence: null, ticketIds: [] });
  });
});

describe("transfer_to_analyst com chamado em foco (G2-TS-02)", () => {
  it("transfere o chamado explícito e inclui no resumo", async () => {
    const { adapters, calls } = createFakeAdapters();
    await runTool("transfer_to_analyst", { reason: "Sem solução", ticketId: "INC-9" }, FAKE_CTX, adapters);
    expect(calls.ticketTransfer).toEqual([{ requesterId: FAKE_CTX.userId, publicId: "INC-9", reason: "Sem solução" }]);
    expect(calls.transfer[0].summary?.ticketIds).toEqual(["INC-9"]);
  });

  it("usa o chamado em foco da conversa quando não há ticketId", async () => {
    const { adapters, calls } = createFakeAdapters();
    await runTool("transfer_to_analyst", { reason: "Sem solução" }, FAKE_CTX, adapters, {
      focusedTicketId: "INC-7",
    });
    expect(calls.ticketTransfer[0].publicId).toBe("INC-7");
  });

  it("chamado de terceiros não impede a transferência da conversa nem vaza no resumo", async () => {
    const { adapters, calls } = createFakeAdapters();
    const result = await runTool("transfer_to_analyst", { reason: "Ajuda", ticketId: "INC-404" }, FAKE_CTX, {
      ...adapters,
      ticketClient: {
        ...adapters.ticketClient,
        transfer: async () => {
          throw Object.assign(new Error("not owner"), { name: "TicketForbiddenError" });
        },
      },
    });
    expect(result).toMatchObject({ transferred: true, ticketTransferred: null });
    expect(calls.transfer).toHaveLength(1);
    expect(calls.transfer[0].summary?.ticketIds).toEqual([]);
  });
});

describe("política de transferência no fim do turno (fixture)", () => {
  it("incidente crítico cria o rascunho e transfere no mesmo turno (G2-RG-04)", async () => {
    const { adapters, calls } = createFakeAdapters();
    const result = await runAgentTurn("o e-mail caiu para todo mundo, ninguém recebe", FAKE_CTX, adapters);

    expect(result.trace.actions).toEqual(["create_draft", "transfer_to_analyst"]);
    expect(result.trace.rulesFired).toEqual(expect.arrayContaining(["TRANSFER_CRITICAL", "TRANSFER_TO_ANALYST"]));
    expect(calls.transfer[0].summary).toMatchObject({
      confidence: 78,
      rulesFired: expect.arrayContaining(["TRANSFER_CRITICAL"]),
    });
    expect(result.content).toMatch(/transferi/i);
  });

  it("SLA vencido oferece 'Chamar um analista' sem transferir (G2-RG-05)", async () => {
    const { adapters, calls } = createFakeAdapters();
    const result = await runAgentTurn("quais são meus chamados abertos?", FAKE_CTX, adapters);

    expect(calls.transfer).toHaveLength(0);
    expect(result.trace.rulesFired).toContain("TRANSFER_SLA_BREACH");
    const qr = result.uiBlocks.find((b) => b.type === "quick_replies");
    expect(qr && qr.type === "quick_replies" && qr.options).toContain("Chamar um analista");
    // G2-UI-03: opções derivadas dos dados reais, sem item fixo de FAQ.
    expect(qr && qr.type === "quick_replies" && qr.options).not.toContain("Horário do service desk");
    expect(qr && qr.type === "quick_replies" && qr.options.some((o) => /^Detalhes do [A-Z]+-\d+/.test(o))).toBe(true);
  });

  it("aceitar a oferta transfere por pedido do funcionário", async () => {
    const { adapters, calls } = createFakeAdapters();
    const result = await runAgentTurn("Chamar um analista", FAKE_CTX, adapters);
    expect(result.trace.actions).toEqual(["transfer_to_analyst"]);
    expect(result.trace.rulesFired).toContain("TRANSFER_USER_REQUEST");
    expect(calls.summaryPatches[0].patch).toMatchObject({ confidence: 88 });
  });

  it("confiança abaixo do limiar forte transfere com motivo agent_sem_seguranca", async () => {
    const { adapters, calls } = createFakeAdapters();
    const result = await runAgentTurn("não faço ideia do que está acontecendo", FAKE_CTX, adapters);
    expect(result.trace.rulesFired).toContain("TRANSFER_LOW_CONFIDENCE");
    expect(calls.transfer[0].reason).toMatch(/agent_sem_seguranca/);
  });

  it("confiança intermediária apenas oferece analista", async () => {
    const { adapters, calls } = createFakeAdapters();
    const result = await runAgentTurn("não sei se é VPN ou rede", FAKE_CTX, adapters);
    expect(calls.transfer).toHaveLength(0);
    expect(result.trace.rulesFired).toContain("TRANSFER_LOW_CONFIDENCE");
  });
});

describe("fora de escopo por área (G2-RG-07)", () => {
  it.each([
    ["meu vale-refeição não veio", /RH/],
    ["preciso de reembolso de nota fiscal", /Financeiro/],
    ["o ar-condicionado da sala está quebrado", /Facilities/],
  ])("%s", async (message, area) => {
    const { adapters, calls } = createFakeAdapters();
    const result = await runAgentTurn(message, FAKE_CTX, adapters);
    expect(result.trace.rulesFired).toContain("OUT_OF_SCOPE");
    expect(result.trace.actions).toEqual([]);
    expect(result.content).toMatch(area);
    expect(calls.createDraft).toHaveLength(0);
    expect(calls.transfer).toHaveLength(0);
  });
});
