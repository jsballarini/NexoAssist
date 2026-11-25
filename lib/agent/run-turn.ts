import type { AgentAdapters, AgentUserContext, TurnResult, TurnStreamCallbacks } from "./adapters";
import { shouldUseFixtures, withLlmConcurrency } from "./config";
import { runFixtureTurn } from "./fixture-turn";
import { runLlmTurn } from "./llm-turn";

/**
 * Turn runner do agent Nexo Assist (orquestração Mastra-compatível).
 * F3: modo fixture quando sem OpenRouter ou AGENT_EVAL_FIXTURES=true.
 */
export async function runAgentTurn(
  userMessage: string,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  callbacks?: TurnStreamCallbacks,
): Promise<TurnResult> {
  return withLlmConcurrency(async () => {
    if (shouldUseFixtures()) {
      const partial = { understanding: "Analisando…", actions: [] as string[], confidence: 0, rulesFired: [] as string[], evidence: [] };
      callbacks?.onTrace?.(partial);
      const result = await runFixtureTurn(userMessage, ctx, adapters, {
        onToken: callbacks?.onToken,
      });
      callbacks?.onTrace?.(result.trace);
      return result;
    }

    const partial = {
      understanding: "Analisando com o modelo…",
      actions: [] as string[],
      confidence: 0,
      rulesFired: [] as string[],
      evidence: [] as { type: string; id: string; excerpt?: string }[],
    };
    callbacks?.onTrace?.(partial);

    const result = await runLlmTurn(userMessage, ctx, adapters, {
      onToken: callbacks?.onToken,
      onTrace: callbacks?.onTrace,
    });
    callbacks?.onTrace?.(result.trace);
    return result;
  });
}

export type { TurnResult, AgentAdapters, AgentUserContext };