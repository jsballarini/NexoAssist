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
import type { AgentDecision, AgentUsage } from "../schemas";
import { isFailedResult, type ToolCallRecord } from "../tool-records";
import { collectRulesFromToolResults } from "../trace-rules";
import { buildModelMessages, type TurnContext } from "../turn-context";
import { inferCollectionQuickReplies } from "../collection-quick-replies";
import { buildUiBlocks } from "../ui-blocks";
import { runForcedReportDecision } from "./forced-decision";
import { buildBusinessInstructions } from "./instructions";
import { buildOpenRouterModel } from "./model";
import { consumeAgentStream, type StreamChunk, type StreamOutcome } from "./stream-adapter";
import { BUSINESS_TOOL_NAMES, createMastraTools } from "./tools";
import { applyTransferPolicy, type TransferStepOutcome } from "../transfer-step";
import type { ToolExtras } from "../transfer-tool";

export const LLM_UNAVAILABLE_MESSAGE =
  "No momento o assistente está indisponível. Tente novamente em instantes ou peça para falar com um analista.";
const EMPTY_ANSWER_MESSAGE =
  "Não consegui formular uma resposta agora. Pode reformular ou pedir para falar com um analista?";
/** Fallback na UI quando `report_decision` não chega ou não passa na validação. */
/** Usado só se buildResult receber turno sem decisão (não deve ocorrer no fluxo Mastra). */
export const NO_DECISION_CONFIDENCE = 30;
export const DECISION_REQUIRED_MESSAGE =
  "Não consegui registrar a transparência deste turno. Envie a mensagem novamente.";
const AGENT_ID = "nexo-assist";
const TEMPERATURE = 0.2;

/** Ponto de injeção para testes: modelo e fábrica do agent. */
export type MastraTurnDeps = {
  model?: ConstructorParameters<typeof Agent>[0]["model"];
};

type StreamUsage = { inputTokens?: number; outputTokens?: number };

function mergeUsage(base: AgentUsage, extraPrompt = 0, extraCompletion = 0): AgentUsage {
  return {
    promptTokens: base.promptTokens + extraPrompt,
    completionTokens: base.completionTokens + extraCompletion,
    latencyMs: base.latencyMs,
  };
}

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
    ...new Set([
      ...(decision?.quickReplies ?? []),
      ...(policy.offerQuickReply ? [policy.offerQuickReply] : []),
      ...inferCollectionQuickReplies(calls, content),
    ]),
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

function decisionFailureResult(error: unknown, calls: ToolCallRecord[]): TurnResult {
  const detail = error instanceof Error ? error.message : String(error);
  return {
    content: DECISION_REQUIRED_MESSAGE,
    trace: {
      understanding: "Fase obrigatória report_decision não concluída.",
      actions: calls.map((c) => c.name),
      confidence: 0,
      rulesFired: ["NO_DECISION_REPORTED"],
      evidence: [],
      reasoning: detail.slice(0, 1200),
      rawToolCalls: { decisionPhaseError: detail.slice(0, 300), calls: summarizeCalls(calls) },
    },
    uiBlocks: [],
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
    const tools = createMastraTools(ctx, adapters, { focusedTicketId: turnContext.focusedTicketId });
    const agent = new Agent({
      id: AGENT_ID,
      name: "Nexo Assist",
      instructions: buildBusinessInstructions(ctx, turnContext),
      model: deps.model ?? buildOpenRouterModel(),
      tools,
    });

    const messages = buildModelMessages(turnContext, userMessage, getHistoryMaxMessages());
    const output = await agent.stream(
      messages as unknown as Parameters<typeof agent.stream>[0],
      {
        maxSteps: getMaxSteps(),
        activeTools: [...BUSINESS_TOOL_NAMES],
        abortSignal: AbortSignal.timeout(getLlmTimeoutMs()),
        modelSettings: { maxOutputTokens: getMaxOutputTokens(), temperature: TEMPERATURE },
      },
    );

    let outcome = await consumeAgentStream(output.fullStream as AsyncIterable<StreamChunk>, {
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

    let decision: AgentDecision;
    try {
      decision = await runForcedReportDecision(
        userMessage,
        ctx,
        adapters,
        turnContext,
        { calls, text: outcome.text },
        deps,
      );
    } catch (decisionError) {
      const failed = decisionFailureResult(decisionError, calls);
      callbacks?.onToken?.(failed.content);
      return failed;
    }

    if (!outcome.text.trim()) {
      const replyOutput = await agent.stream(
        [
          ...(messages as object[]),
          {
            role: "user",
            content: `[Sistema] Redija apenas a resposta final ao funcionário, em português, coerente com a decisão: ${decision.understanding}`,
          },
        ] as unknown as Parameters<typeof agent.stream>[0],
        {
          maxSteps: 1,
          activeTools: [],
          toolChoice: "none",
          abortSignal: AbortSignal.timeout(getLlmTimeoutMs()),
          modelSettings: { maxOutputTokens: getMaxOutputTokens(), temperature: TEMPERATURE },
        },
      );
      const reply = await consumeAgentStream(replyOutput.fullStream as AsyncIterable<StreamChunk>, {
        onToken: (delta) => {
          streamedAnything = true;
          callbacks?.onToken?.(delta);
        },
      });
      outcome = { ...outcome, text: reply.text, error: reply.error };
    }

    const rawUsage = (await output.usage.catch(() => undefined)) as StreamUsage | undefined;
    let usage = toAgentUsage(rawUsage, startedAt);
    usage = mergeUsage(usage, 400, 80);

    const outcomeWithDecision: StreamOutcome = { ...outcome, decision };
    return await buildResult(
      outcomeWithDecision,
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
