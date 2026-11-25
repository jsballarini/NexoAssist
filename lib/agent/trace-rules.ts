import type { RuleId } from "../../src/lib/domain/rules";
import { isFailedResult, type ToolCallRecord } from "./tool-records";
import { isNotFoundResult, isToolFailure } from "./tool-results";

type Flags = {
  outOfScope?: boolean;
  decisionReported: boolean;
};

function hasBreachedTicket(result: unknown): boolean {
  const items = Array.isArray(result) ? result : [result];
  return items.some(
    (i) => !!i && typeof i === "object" && (i as { slaBreached?: unknown }).slaBreached === true,
  );
}

/** Regra de uma falha estruturada de ferramenta (TOOL_FAILED se desconhecida). */
function ruleForFailure(result: unknown): RuleId {
  if (isToolFailure(result)) {
    switch (result.code) {
      case "TICKET_LEGACY_UNAVAILABLE":
        return "TICKET_LEGACY_UNAVAILABLE";
      case "DRAFT_INCOMPLETE":
      case "DRAFT_INVALID":
        return "DRAFT_INCOMPLETE";
      case "DUPLICATE_CANDIDATE":
        return "DUPLICATE_CANDIDATE";
      default:
        return "TOOL_FAILED";
    }
  }
  if (isNotFoundResult(result)) return "TICKET_LOOKUP";
  return "TOOL_FAILED";
}

/**
 * Regras efetivamente disparadas no turno, derivadas da execução (ferramentas,
 * resultados e decisão reportada) — não do texto da mensagem do usuário.
 */
export function collectRulesFromToolResults(calls: ToolCallRecord[], flags: Flags): RuleId[] {
  const rules = new Set<RuleId>();

  if (flags.outOfScope) rules.add("OUT_OF_SCOPE");
  else rules.add("SCOPE_IT");

  if (!flags.decisionReported) rules.add("NO_DECISION_REPORTED");

  for (const call of calls) {
    if (call.error) {
      rules.add("TOOL_FAILED");
      continue;
    }
    if (isFailedResult(call.result)) {
      rules.add(ruleForFailure(call.result));
      continue;
    }
    switch (call.name) {
      case "list_open_tickets":
      case "get_ticket":
        rules.add("TICKET_LOOKUP");
        if (hasBreachedTicket(call.result)) rules.add("TICKET_SLA_BREACH");
        break;
      case "search_kb":
        rules.add("KB_PARTIAL_MATCH");
        break;
      case "create_draft":
      case "update_ticket":
      case "reopen_ticket":
        rules.add("DRAFT_PROPOSED");
        if ((call.result as { priority?: string } | undefined)?.priority === "critical") {
          rules.add("SLA_CRITICAL");
        }
        break;
      case "transfer_to_analyst":
        rules.add("TRANSFER_TO_ANALYST");
        break;
      default:
        break;
    }
  }

  return [...rules];
}
