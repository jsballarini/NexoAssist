import type { AgentAdapters, AgentUserContext } from "./adapters";
import { buildHandoffSummary } from "./handoff-summary";
import { toToolFailure } from "./tool-results";

const DEFAULT_REASON = "Solicitação do funcionário";

/** Contexto extra da conversa que as ferramentas podem usar (nunca vem do modelo). */
export type ToolExtras = { focusedTicketId?: string };

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/**
 * Transfere a conversa para um analista com resumo estruturado. Se houver chamado em foco
 * (explícito ou da conversa), também o marca como aguardando analista; falhas conhecidas
 * dessa parte (chamado de terceiros, resolvido, legado fora do ar) não impedem a transferência.
 */
export async function executeTransfer(
  args: Record<string, unknown>,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  extras: ToolExtras = {},
) {
  const reason = asString(args.reason) ?? DEFAULT_REASON;
  const focusId = asString(args.ticketId) ?? extras.focusedTicketId;

  let ticketTransferred: string | undefined;
  if (focusId) {
    try {
      await adapters.ticketClient.transfer(ctx.userId, focusId, reason);
      ticketTransferred = focusId;
    } catch (error) {
      if (!toToolFailure(error)) throw error;
    }
  }

  const summary = buildHandoffSummary({
    problem: asString(args.problem),
    stepsTried: asStringList(args.stepsTried),
    ticketIds: [...(ticketTransferred ? [ticketTransferred] : []), ...asStringList(args.ticketIds)],
    reason,
    confidence: typeof args.confidence === "number" ? args.confidence : null,
    rulesFired: asStringList(args.rulesFired),
  });

  await adapters.conversationClient.transferToAnalyst(ctx.conversationId, reason, summary);
  return {
    transferred: true,
    state: "awaiting_analyst",
    ticketTransferred: ticketTransferred ?? null,
    summary,
  };
}
