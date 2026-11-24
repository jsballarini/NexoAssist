import type { AgentAdapters, AgentUserContext, TurnResult, TurnStreamCallbacks } from "./adapters";
import { shouldUseFixtures, withLlmConcurrency } from "./config";
import { runFixtureTurn } from "./fixture-turn";

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

    // OpenRouter path: delega ao fixture enquanto modelo não configurado em CI
    const result = await runFixtureTurn(userMessage, ctx, adapters, {
      onToken: callbacks?.onToken,
    });
    callbacks?.onTrace?.(result.trace);
    return result;
  });
}

export type { TurnResult, AgentAdapters, AgentUserContext };