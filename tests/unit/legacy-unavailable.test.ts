import { describe, expect, it } from "vitest";
import { runAgentTurn } from "../../lib/agent";
import { collectRulesFromToolResults } from "../../lib/agent/trace-rules";
import { runTool } from "../../lib/agent/tools";
import { createFakeAdapters, FAKE_CTX } from "./helpers/fake-agent";

function legacyError(): Error {
  const err = Object.assign(new Error("Sistema de chamados temporariamente indisponível"), {
    retryAfterMs: 3000,
  });
  err.name = "TicketLegacyUnavailableError";
  return err;
}

describe("legado indisponível após retries (G2-RS-01)", () => {
  it("a tool devolve falha estruturada em vez de lançar", async () => {
    const { adapters } = createFakeAdapters();
    adapters.ticketClient.listOpen = async () => {
      throw legacyError();
    };
    const result = await runTool("list_open_tickets", {}, FAKE_CTX, adapters);
    expect(result).toMatchObject({ ok: false, code: "TICKET_LEGACY_UNAVAILABLE", retryAfterMs: 3000 });
  });

  it("o trace registra a regra TICKET_LEGACY_UNAVAILABLE", () => {
    const rules = collectRulesFromToolResults(
      [
        {
          name: "list_open_tickets",
          args: {},
          result: { ok: false, code: "TICKET_LEGACY_UNAVAILABLE", retryAfterMs: 3000, message: "x" },
        },
      ],
      { decisionReported: true },
    );
    expect(rules).toContain("TICKET_LEGACY_UNAVAILABLE");
    expect(rules).not.toContain("TOOL_FAILED");
  });

  it("o fixture responde de forma amigável e registra a regra", async () => {
    const { adapters } = createFakeAdapters();
    adapters.ticketClient.listOpen = async () => {
      throw legacyError();
    };
    const result = await runAgentTurn("quais são meus chamados abertos?", FAKE_CTX, adapters);
    expect(result.content).toMatch(/instável/i);
    expect(result.content).not.toMatch(/TicketLegacyUnavailableError|stack/i);
    expect(result.trace.rulesFired).toContain("TICKET_LEGACY_UNAVAILABLE");
    expect(result.uiBlocks.some((b) => b.type === "quick_replies")).toBe(true);
  });
});
