import { Agent } from "@mastra/core/agent";
import { normalizeConfidence } from "../../../src/lib/domain/rules";
import type {
  AgentAdapters,
  AgentUserContext,
  TurnResult,
  TurnStreamCallbacks,
  TurnTrace,
} from "../adapters";
import { getHistoryMaxMessages, getLlmTimeoutMs, getMaxOutputTokens, getMaxSteps } from "../config";
import { collectEvidence } from "../evidence";
import type { AgentUsage } from "../schemas";
import { isFailedResult, type ToolCallRecord } from "../tool-records";
import { collectRulesFromToolResults } from "../trace-rules";
import { buildModelMessages, type TurnContext } from "../turn-context";
import { buildUiBlocks } from "../ui-blocks";
import { buildInstructions } from "./instructions";
import { buildOpenRouterModel } from "./model";
import { consumeAgentStream, type StreamChunk, type StreamOutcome } from "./stream-adapter";
import { createMastraTools } from "./tools";
import { applyTransferPolicy, type TransferStepOutcome } from "../transfer-step";
import type { ToolExtras } from "../transfer-tool";

export const LLM_UNAVAILABLE_MESSAGE =
  "No momento o assistente está indisponível. Tente novamente em instantes ou peça para falar com um analista.";
const EMPTY_ANSWER_MESSAGE =
  "Não consegui formular uma resposta agora. Pode reformular ou pedir para falar com um analista?";
const NO_DECISION_CONFIDENCE = 30;
const AGENT_ID = "nexo-assist";
const TEMPERATURE = 0.2;

/** Ponto de injeção para testes: modelo e fábrica do agent. */
export type MastraTurnDeps = {
  model?: ConstructorParameters<typeof Agent>[0]["model"];
};

type StreamUsage = { inputTokens?: number; outputTokens?: number };

function toAgentUsage(raw: StreamUsage | undefined, startedAt: number): AgentUsage {
  return {
    promptTokens: raw?.inputTokens ?? 0,
    completionTokens: raw?.outputTokens ?? 0,
    latencyMs: Date.now() - startedAt,
  };
}

function summarizeCalls(calls: ToolCallRecord[]) {
  return calls.map(({ name, args, result, error }) => ({
    name,
    args,
    ok: !error && !isFailedResult(result),
    ...(error ? { error } : {}),
  }));
}

function successfulResults(calls: ToolCallRecord[]): unknown[] {
  return calls.filter((c) => !c.error && !isFailedResult(c.result)).map((c) => c.result);
}

function partialTrace(calls: ToolCallRecord[]): TurnTrace {
  return {
    understanding: "Consultando sistemas…",
    actions: calls.map((c) => c.name),
    confidence: 0,
    rulesFired: [],
    evidence: collectEvidence(successfulResults(calls)),
    reasoning: "",
  };
}

type TurnInputs = {
  userMessage: string;
  ctx: AgentUserContext;
  adapters: AgentAdapters;
  extras: ToolExtras;
};

/** Política de transferência sem derrubar a resposta se a persistência falhar. */
async function safeTransferPolicy(
  input: Parameters<typeof applyTransferPolicy>[0],
): Promise<TransferStepOutcome> {
  try {
    return await applyTransferPolicy(input);
  } catch {
    return { decision: { action: "none", reasons: [] }, transferred: false, rules: [] };
  }
}

async function buildResult(
  outcome: StreamOutcome,
  usage: AgentUsage,
  inputs: TurnInputs,
  callbacks?: TurnStreamCallbacks,
): Promise<TurnResult> {
  const { decision } = outcome;
  const confidence = decision ? normalizeConfidence(decision.confidence) : NO_DECISION_CONFIDENCE;
  const understanding = decision?.understanding ?? "O modelo não reportou o que entendeu neste turno.";
  const baseRules = collectRulesFromToolResults(outcome.calls, {
    outOfScope: decision?.outOfScope,
    decisionReported: !!decision,
  });

  const policy = await safeTransferPolicy({
    ...inputs,
    calls: outcome.calls,
    confidence: decision ? confidence : undefined,
    outOfScope: decision?.outOfScope,
    understanding,
    rulesFired: baseRules,
  });
  const calls = policy.call ? [...outcome.calls, policy.call] : outcome.calls;
  const rulesFired = [...new Set([...baseRules, ...policy.rules])];

  let content = outcome.text.trim() || EMPTY_ANSWER_MESSAGE;
  if (policy.notice) {
    const addition = `\n\n${policy.notice}`;
    content += addition;
    callbacks?.onToken?.(addition);
  }
  const quickReplies = [
    ...new Set([...(decision?.quickReplies ?? []), ...(policy.offerQuickReply ? [policy.offerQuickReply] : [])]),
  ];

  return {
    content,
    trace: {
      understanding,
      actions: calls.map((c) => c.name),
      confidence,
      rulesFired,
      evidence: collectEvidence(successfulResults(calls)),
      reasoning: decision?.reasoning ?? "O modelo não reportou justificativa para este turno.",
      rawToolCalls: summarizeCalls(calls),
      usage,
    },
    uiBlocks: buildUiBlocks(calls, { confidence, quickReplies }),
  };
}

function failureResult(error: unknown, calls: ToolCallRecord[]): TurnResult {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return {
    content: LLM_UNAVAILABLE_MESSAGE,
    trace: {
      understanding: "Não foi possível consultar o modelo de linguagem.",
      actions: calls.map((c) => c.name),
      confidence: 0,
      rulesFired: ["LLM_UNAVAILABLE"],
      evidence: [],
      reasoning: "Falha na chamada ao modelo; resposta padrão de indisponibilidade.",
      rawToolCalls: { llmError: detail.slice(0, 300), calls: summarizeCalls(calls) },
    },
    uiBlocks: [],
  };
}

/**
 * Executa um turno no agent Mastra com tool calling. Falhas do LLM (HTTP, timeout,
 * modelo sem tool calling) viram uma resposta amigável e ficam registradas no trace.
 */
export async function runMastraTurn(
  userMessage: string,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  turnContext: TurnContext,
  callbacks?: TurnStreamCallbacks,
  deps: MastraTurnDeps = {},
): Promise<TurnResult> {
  const startedAt = Date.now();
  let calls: ToolCallRecord[] = [];
  let streamedAnything = false;

  try {
    const agent = new Agent({
      id: AGENT_ID,
      name: "Nexo Assist",
      instructions: buildInstructions(ctx, turnContext),
      model: deps.model ?? buildOpenRouterModel(),
      tools: createMastraTools(ctx, adapters, { focusedTicketId: turnContext.focusedTicketId }),
    });

    const messages = buildModelMessages(turnContext, userMessage, getHistoryMaxMessages());
    const output = await agent.stream(
      messages as unknown as Parameters<typeof agent.stream>[0],
      {
        maxSteps: getMaxSteps(),
        abortSignal: AbortSignal.timeout(getLlmTimeoutMs()),
        modelSettings: { maxOutputTokens: getMaxOutputTokens(), temperature: TEMPERATURE },
      },
    );

    const outcome = await consumeAgentStream(output.fullStream as AsyncIterable<StreamChunk>, {
      onToken: (delta) => {
        streamedAnything = true;
        callbacks?.onToken?.(delta);
      },
      onToolActivity: (snapshot) => {
        calls = snapshot;
        callbacks?.onTrace?.(partialTrace(snapshot));
      },
    });
    calls = outcome.calls;

    if (outcome.error && !outcome.text.trim()) {
      const failed = failureResult(new Error(outcome.error), calls);
      callbacks?.onToken?.(failed.content);
      return failed;
    }

    const rawUsage = (await output.usage.catch(() => undefined)) as StreamUsage | undefined;
    const usage = toAgentUsage(rawUsage, startedAt);
    return await buildResult(
      outcome,
      usage,
      { userMessage, ctx, adapters, extras: { focusedTicketId: turnContext.focusedTicketId } },
      callbacks,
    );
  } catch (error) {
    const result = failureResult(error, calls);
    if (!streamedAnything) callbacks?.onToken?.(result.content);
    return result;
  }
}
