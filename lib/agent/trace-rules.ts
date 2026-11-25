import type { RuleId } from "../../src/lib/domain/rules";
import { isFailedResult, type ToolCallRecord } from "./tool-records";

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
    if (call.error || isFailedResult(call.result)) {
      rules.add("TOOL_FAILED");
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
