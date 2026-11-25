import { describe, expect, it } from "vitest";
import { consumeAgentStream, type StreamChunk } from "../../lib/agent/mastra/stream-adapter";
import { buildUiBlocks } from "../../lib/agent/ui-blocks";
import { collectRulesFromToolResults } from "../../lib/agent/trace-rules";

async function* fromChunks(chunks: StreamChunk[]) {
  for (const c of chunks) yield c;
}

const DECISION = {
  understanding: "Funcionário quer status",
  confidence: 80,
  reasoning: "Consultei os chamados abertos e a KB.",
  quickReplies: ["Só eu"],
};

describe("consumeAgentStream", () => {
  it("acumula texto, 2+ ferramentas, resultados e a decisão", async () => {
    const tokens: string[] = [];
    const activity: number[] = [];
    const outcome = await consumeAgentStream(
      fromChunks([
        { type: "tool-call", payload: { toolCallId: "1", toolName: "list_open_tickets", args: {} } },
        {
          type: "tool-result",
          payload: {
            toolCallId: "1",
            result: [{ id: "INC-1", title: "VPN", statusLabel: "Aberto", slaBreached: true }],
          },
        },
        {
          type: "tool-call",
          payload: { toolCallId: "2", toolName: "search_kb", args: { query: "vpn" } },
        },
        { type: "tool-result", payload: { toolCallId: "2", result: [] } },
        { type: "tool-call", payload: { toolCallId: "3", toolName: "report_decision", args: DECISION } },
        { type: "tool-result", payload: { toolCallId: "3", result: { ok: true } } },
        { type: "text-delta", payload: { text: "Olá, " } },
        { type: "text-delta", payload: { text: "tudo certo." } },
      ]),
      {
        onToken: (d) => tokens.push(d),
        onToolActivity: (calls) => activity.push(calls.length),
      },
    );

    expect(outcome.text).toBe("Olá, tudo certo.");
    expect(tokens).toEqual(["Olá, ", "tudo certo."]);
    expect(outcome.calls.map((c) => c.name)).toEqual(["list_open_tickets", "search_kb"]);
    expect(outcome.calls[0].result).toHaveLength(1);
    expect(outcome.decision?.reasoning).toContain("Consultei");
    expect(activity.length).toBeGreaterThanOrEqual(4);

    const rules = collectRulesFromToolResults(outcome.calls, { decisionReported: true });
    expect(rules).toEqual(expect.arrayContaining(["TICKET_LOOKUP", "TICKET_SLA_BREACH"]));

    const blocks = buildUiBlocks(outcome.calls, {
      confidence: 80,
      quickReplies: outcome.decision?.quickReplies,
    });
    expect(blocks.map((b) => b.type)).toEqual(["ticket_card", "quick_replies", "confidence"]);
  });

  it("registra erro de ferramenta e erro do stream", async () => {
    const outcome = await consumeAgentStream(
      fromChunks([
        { type: "tool-call", payload: { toolCallId: "1", toolName: "get_ticket", args: {} } },
        { type: "tool-error", payload: { toolCallId: "1", error: new Error("falhou") } },
        { type: "error", payload: { error: "HTTP 500" } },
      ]),
    );
    expect(outcome.calls[0].error).toBe("falhou");
    expect(outcome.error).toBe("HTTP 500");
    expect(collectRulesFromToolResults(outcome.calls, { decisionReported: false })).toEqual(
      expect.arrayContaining(["TOOL_FAILED", "NO_DECISION_REPORTED"]),
    );
  });

  it("ignora ferramentas desconhecidas e decisão inválida", async () => {
    const outcome = await consumeAgentStream(
      fromChunks([
        { type: "tool-call", payload: { toolCallId: "1", toolName: "hack", args: {} } },
        {
          type: "tool-call",
          payload: { toolCallId: "2", toolName: "report_decision", args: { confidence: 999 } },
        },
      ]),
    );
    expect(outcome.calls).toHaveLength(0);
    expect(outcome.decision).toBeUndefined();
  });
});
