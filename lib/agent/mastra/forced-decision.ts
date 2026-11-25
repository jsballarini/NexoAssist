import { Agent } from "@mastra/core/agent";
import type { AgentAdapters, AgentUserContext } from "../adapters";
import { getLlmTimeoutMs, getMaxOutputTokens } from "../config";
import type { AgentDecision } from "../schemas";
import { parseAgentDecision } from "../schemas";
import type { ToolCallRecord } from "../tool-records";
import type { ToolExtras } from "../transfer-tool";
import { buildDecisionInstructions } from "./instructions";
import { buildOpenRouterModel } from "./model";
import type { MastraTurnDeps } from "./run-mastra-turn";
import { consumeAgentStream, type StreamChunk } from "./stream-adapter";
import { BUSINESS_TOOL_NAMES, createMastraTools, REPORT_DECISION_TOOL } from "./tools";
import type { TurnContext } from "../turn-context";

const TEMPERATURE = 0.1;

export function summarizeBusinessPhase(calls: ToolCallRecord[], assistantText: string): string {
  const lines: string[] = [];
  if (calls.length) {
    lines.push(
      `Ferramentas executadas: ${calls.map((c) => c.name).join(", ")}.`,
    );
  } else {
    lines.push("Nenhuma ferramenta de negócio foi executada.");
  }
  const trimmed = assistantText.trim();
  if (trimmed) {
    lines.push(`Resposta já redigida ao funcionário: ${trimmed.slice(0, 800)}`);
  }
  return lines.join("\n");
}

/**
 * Segunda chamada ao modelo: apenas report_decision, com toolChoice forçado
 * (obrigação estrutural — não é retry de turno).
 */
export async function runForcedReportDecision(
  userMessage: string,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  turnContext: TurnContext,
  business: { calls: ToolCallRecord[]; text: string },
  deps: MastraTurnDeps = {},
): Promise<AgentDecision> {
  const allTools = createMastraTools(ctx, adapters, {
    focusedTicketId: turnContext.focusedTicketId,
  });
  const reportTool = allTools[REPORT_DECISION_TOOL];
  if (!reportTool) {
    throw new Error("report_decision tool missing");
  }

  const summary = summarizeBusinessPhase(business.calls, business.text);
  const agent = new Agent({
    id: "nexo-assist-decision",
    name: "Nexo Assist — decisão",
    instructions: buildDecisionInstructions(ctx, turnContext, userMessage, summary),
    model: deps.model ?? buildOpenRouterModel(),
    tools: { [REPORT_DECISION_TOOL]: reportTool },
  });

  const output = await agent.stream("Registre report_decision para este turno.", {
    maxSteps: 1,
    activeTools: [REPORT_DECISION_TOOL],
    toolChoice: { type: "tool", toolName: REPORT_DECISION_TOOL },
    abortSignal: AbortSignal.timeout(getLlmTimeoutMs()),
    modelSettings: { maxOutputTokens: Math.min(getMaxOutputTokens(), 512), temperature: TEMPERATURE },
  });

  const outcome = await consumeAgentStream(output.fullStream as AsyncIterable<StreamChunk>);
  let decision = outcome.decision;
  if (!decision) {
    try {
      const calls = await (output as { toolCalls: Promise<unknown> }).toolCalls;
      if (Array.isArray(calls)) {
        for (const call of calls) {
          const payload = (call as { payload?: { toolName?: string; args?: unknown } }).payload;
          if (payload?.toolName !== REPORT_DECISION_TOOL) continue;
          decision = parseAgentDecision(payload.args);
          break;
        }
      }
    } catch {
      /* Mastra sem toolCalls resumidos */
    }
  }

  if (!decision) {
    throw new Error(
      "O modelo não chamou report_decision com argumentos válidos na fase obrigatória de decisão.",
    );
  }

  return decision;
}

export { BUSINESS_TOOL_NAMES };