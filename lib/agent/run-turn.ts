import type { AgentAdapters, AgentUserContext, TurnResult, TurnStreamCallbacks, TurnTrace } from "./adapters";
import { shouldUseFixtures, withLlmConcurrency } from "./config";
import { runFixtureTurn } from "./fixture-turn";
import { runLlmTurn } from "./llm-turn";
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
 * Transição: fixture quando AGENT_EVAL_FIXTURES=true; caso contrário planner + OpenRouter.
 */
export async function runAgentTurn(
  userMessage: string,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  turnContext: TurnContext = EMPTY_TURN_CONTEXT,
  callbacks?: TurnStreamCallbacks,
): Promise<TurnResult> {
  void turnContext;
  return withLlmConcurrency(async () => {
    if (shouldUseFixtures()) {
      callbacks?.onTrace?.(emptyTrace("Analisando…"));
      const result = await runFixtureTurn(userMessage, ctx, adapters, {
        onToken: callbacks?.onToken,
      });
      callbacks?.onTrace?.(result.trace);
      return result;
    }

    callbacks?.onTrace?.(emptyTrace("Analisando com o modelo…"));
    const result = await runLlmTurn(userMessage, ctx, adapters, {
      onToken: callbacks?.onToken,
      onTrace: callbacks?.onTrace,
    });
    callbacks?.onTrace?.(result.trace);
    return result;
  });
}

export type { TurnResult, AgentAdapters, AgentUserContext };
