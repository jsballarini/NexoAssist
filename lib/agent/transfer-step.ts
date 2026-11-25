import type { RuleId } from "../../src/lib/domain/rules";
import type { AgentAdapters, AgentUserContext } from "./adapters";
import { isFailedResult, type ToolCallRecord } from "./tool-records";
import {
  describeTransferReasons,
  evaluateTransferNeed,
  userRequestedAnalyst,
  type TransferDecision,
} from "./transfer-policy";
import type { ToolExtras } from "./transfer-tool";
import { runTool } from "./tools";

export const OFFER_ANALYST_QUICK_REPLY = "Chamar um analista";

const AUTO_TRANSFER_NOTICE =
  "Por segurança, transferi sua conversa para um analista humano. O assistente automático ficará pausado até a devolução.";

export type TransferStepInput = {
  userMessage: string;
  ctx: AgentUserContext;
  adapters: AgentAdapters;
  extras: ToolExtras;
  calls: ToolCallRecord[];
  /** Confiança reportada no turno; `undefined` quando não houve decisão. */
  confidence?: number;
  outOfScope?: boolean;
  understanding: string;
  rulesFired: string[];
};

export type TransferStepOutcome = {
  decision: TransferDecision;
  /** A conversa foi transferida neste turno (pelo agent ou pela política). */
  transferred: boolean;
  /** Chamada de `transfer_to_analyst` adicionada pela política (para o trace). */
  call?: ToolCallRecord;
  rules: RuleId[];
  /** Texto adicional para a resposta quando a política transferiu por conta própria. */
  notice?: string;
  /** Quick reply a oferecer quando só há oferta de analista. */
  offerQuickReply?: string;
};

type ResultLike = { priority?: unknown; slaBreached?: unknown; id?: unknown; transferred?: unknown };

function successful(calls: ToolCallRecord[]): ToolCallRecord[] {
  return calls.filter((c) => !c.error && !isFailedResult(c.result));
}

function flatten(results: unknown[]): ResultLike[] {
  return results
    .flatMap((r) => (Array.isArray(r) ? r : [r]))
    .filter((r): r is ResultLike => !!r && typeof r === "object");
}

/** Sinais objetivos do turno, derivados dos resultados reais das ferramentas. */
function readSignals(calls: ToolCallRecord[]) {
  const ok = successful(calls);
  const drafts = flatten(
    ok.filter((c) => ["create_draft", "update_ticket", "reopen_ticket"].includes(c.name)).map((c) => c.result),
  );
  const tickets = flatten(
    ok.filter((c) => c.name === "list_open_tickets" || c.name === "get_ticket").map((c) => c.result),
  );
  const breachedId = tickets.find((t) => t.slaBreached === true && typeof t.id === "string")?.id;
  return {
    critical: drafts.some((d) => d.priority === "critical"),
    slaBreached: tickets.some((t) => t.slaBreached === true),
    breachedTicketId: typeof breachedId === "string" ? breachedId : undefined,
    alreadyTransferred: flatten(ok.filter((c) => c.name === "transfer_to_analyst").map((c) => c.result)).some(
      (r) => r.transferred === true,
    ),
  };
}

/**
 * Aplica a política de transferência ao fim do turno (Mastra e fixture): transfere por
 * pedido, caso crítico ou baixa confiança; oferece analista com SLA vencido ou confiança
 * intermediária. Sempre devolve as regras para o trace.
 */
export async function applyTransferPolicy(input: TransferStepInput): Promise<TransferStepOutcome> {
  const signals = readSignals(input.calls);
  const userRequested = userRequestedAnalyst(input.userMessage);
  const decision = evaluateTransferNeed({
    confidence: input.confidence,
    critical: signals.critical,
    slaBreached: signals.slaBreached,
    userRequested,
    outOfScope: input.outOfScope,
  });

  const stepsTried = input.calls.map((c) => c.name);
  const summaryPatch = {
    confidence: input.confidence ?? null,
    rulesFired: [...input.rulesFired, ...decision.reasons],
    stepsTried,
  };

  if (decision.action === "none") {
    return { decision, transferred: signals.alreadyTransferred, rules: [] };
  }

  if (decision.action === "offer") {
    return {
      decision,
      transferred: signals.alreadyTransferred,
      rules: decision.reasons,
      ...(signals.alreadyTransferred ? {} : { offerQuickReply: OFFER_ANALYST_QUICK_REPLY }),
    };
  }

  if (signals.alreadyTransferred) {
    await input.adapters.conversationClient.updateHandoffSummary?.(input.ctx.conversationId, summaryPatch);
    return { decision, transferred: true, rules: decision.reasons };
  }

  const args = {
    reason: describeTransferReasons(decision.reasons),
    problem: input.understanding,
    ticketId: signals.breachedTicketId,
    ...summaryPatch,
  };
  const call: ToolCallRecord = { name: "transfer_to_analyst", args };
  try {
    call.result = await runTool("transfer_to_analyst", args, input.ctx, input.adapters, input.extras);
  } catch (error) {
    call.error = error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 200) : "Falha ao transferir";
    return { decision, transferred: false, call, rules: ["TOOL_FAILED"] };
  }

  return {
    decision,
    transferred: true,
    call,
    rules: [...decision.reasons, "TRANSFER_TO_ANALYST"],
    ...(userRequested ? {} : { notice: AUTO_TRANSFER_NOTICE }),
  };
}
