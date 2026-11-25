import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runAgentTurn } from "../../lib/agent";
import { LLM_UNAVAILABLE_MESSAGE } from "../../lib/agent/mastra/run-mastra-turn";
import { createFakeAdapters, FAKE_CTX } from "./helpers/fake-agent";

type Part = Record<string, unknown>;

/** Modelo V2 falso: cada chamada a `doStream` consome um passo do roteiro. */
function scriptedModel(steps: Part[][]) {
  let index = 0;
  return {
    specificationVersion: "v2" as const,
    provider: "mock",
    modelId: "mock-model",
    supportedUrls: {},
    doGenerate: async () => {
      throw new Error("doGenerate não usado");
    },
    doStream: async () => {
      const parts = steps[Math.min(index++, steps.length - 1)];
      return {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "stream-start", warnings: [] });
            for (const p of parts) controller.enqueue(p);
            controller.close();
          },
        }),
      };
    },
  };
}

const usage = { inputTokens: 10, outputTokens: 5, totalTokens: 15 };

function toolCall(id: string, toolName: string, input: unknown): Part {
  return { type: "tool-call", toolCallId: id, toolName, input: JSON.stringify(input) };
}

describe("runAgentTurn (modo Mastra)", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.AGENT_EVAL_FIXTURES = "false";
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it("executa ferramentas, captura decisão, reasoning e usage", async () => {
    const { adapters, calls } = createFakeAdapters();
    const model = scriptedModel([
      [
        toolCall("c1", "list_open_tickets", {}),
        { type: "finish", finishReason: "tool-calls", usage },
      ],
      [
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: "Você tem 1 chamado aberto." },
        { type: "text-end", id: "t1" },
        { type: "finish", finishReason: "stop", usage },
      ],
      [
        toolCall("c2", "report_decision", {
          understanding: "Quer ver chamados",
          confidence: 85,
          reasoning: "Listei os chamados abertos.",
        }),
        { type: "finish", finishReason: "tool-calls", usage },
      ],
    ]);
    const tokens: string[] = [];

    const result = await runAgentTurn(
      "status dos meus chamados",
      FAKE_CTX,
      adapters,
      undefined,
      { onToken: (d) => tokens.push(d) },
      { model: model as never },
    );

    expect(calls.listOpen).toEqual([FAKE_CTX.userId]);
    expect(result.content).toBe("Você tem 1 chamado aberto.");
    expect(tokens.join("")).toBe(result.content);
    expect(result.trace.actions).toEqual(["list_open_tickets"]);
    expect(result.trace.reasoning).toBe("Listei os chamados abertos.");
    expect(result.trace.confidence).toBe(85);
    expect(result.trace.usage?.promptTokens).toBeGreaterThan(0);
    expect(result.trace.rulesFired).toContain("TICKET_LOOKUP");
    expect(result.uiBlocks.some((b) => b.type === "ticket_card")).toBe(true);
  });

  it("responde com mensagem amigável quando o LLM falha", async () => {
    const { adapters } = createFakeAdapters();
    const model = {
      ...scriptedModel([[]]),
      doStream: async () => {
        throw new Error("HTTP 500 do provedor");
      },
    };

    const result = await runAgentTurn(
      "oi",
      FAKE_CTX,
      adapters,
      undefined,
      undefined,
      { model: model as never },
    );

    expect(result.content).toBe(LLM_UNAVAILABLE_MESSAGE);
    expect(result.trace.rulesFired).toContain("LLM_UNAVAILABLE");
    expect(JSON.stringify(result.trace.rawToolCalls)).toContain("HTTP 500");
  });

  it("sem chave nem fixture, não cai em fixture silenciosa", async () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
    const { adapters } = createFakeAdapters();

    const result = await runAgentTurn("status dos meus chamados", FAKE_CTX, adapters);

    expect(result.content).toBe(LLM_UNAVAILABLE_MESSAGE);
    expect(result.trace.actions).toEqual([]);
  });
});
