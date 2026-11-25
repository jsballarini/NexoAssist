import type { AgentAdapters, AgentUserContext, TurnResult, TurnStreamCallbacks, TurnTrace } from "./adapters";
import { shouldUseFixtures, withLlmConcurrency } from "./config";
import { runFixtureTurn } from "./fixture-turn";
import { runMastraTurn, type MastraTurnDeps } from "./mastra/run-mastra-turn";
import { EMPTY_TURN_CONTEXT, type TurnContext } from "./turn-context";

function emptyTrace(understanding: string): TurnTrace {
  return {
    understanding,
    actions: [],
    confidence: 0,
    rulesFired: [],
    evidence: [],
    reasoning: "",
  };
}

/**
 * Turn runner do agent Nexo Assist.
 * Produção: agent Mastra com tool calling. Fixture determinística apenas com
 * AGENT_EVAL_FIXTURES=true (CI/evals).
 */
export async function runAgentTurn(
  userMessage: string,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  turnContext: TurnContext = EMPTY_TURN_CONTEXT,
  callbacks?: TurnStreamCallbacks,
  deps?: MastraTurnDeps,
): Promise<TurnResult> {
  return withLlmConcurrency(async () => {
    if (shouldUseFixtures()) {
      callbacks?.onTrace?.(emptyTrace("Analisando…"));
      const result = await runFixtureTurn(
        userMessage,
        ctx,
        adapters,
        { onToken: callbacks?.onToken },
        { turnContext },
      );
      callbacks?.onTrace?.(result.trace);
      return result;
    }

    callbacks?.onTrace?.(emptyTrace("Analisando com o modelo…"));
    const result = await runMastraTurn(userMessage, ctx, adapters, turnContext, callbacks, deps);
    callbacks?.onTrace?.(result.trace);
    return result;
  });
}

export type { TurnResult, AgentAdapters, AgentUserContext };
