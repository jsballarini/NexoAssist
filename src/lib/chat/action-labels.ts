import type { RuleId } from "@/lib/domain/rules";

const ACTION_LABELS: Record<string, string> = {
  list_open_tickets: "consultou seus chamados",
  get_ticket: "consultou o chamado",
  search_kb: "buscou na central de ajuda",
  create_draft: "montou o rascunho",
  update_ticket: "preparou a atualização",
  reopen_ticket: "preparou a reabertura",
  cancel_draft: "cancelou o rascunho",
  transfer_to_analyst: "chamou um atendente",
  list_recent_resolved: "consultou chamados resolvidos",
};

/** Rótulos da status line a partir de regras quando não houve tool no turno. */
const RULE_STATUS_LABELS: Partial<Record<RuleId, string>> = {
  KB_PARTIAL_MATCH: "buscou na central de ajuda",
  TICKET_LOOKUP: "consultou seus chamados",
  TICKET_SLA_BREACH: "consultou o SLA",
  DRAFT_PROPOSED: "montou o rascunho",
  SLA_CRITICAL: "classificou a prioridade",
  TRANSFER_TO_ANALYST: "chamou um atendente",
  TRANSFER_USER_REQUEST: "chamou um atendente",
  TRANSFER_SLA_BREACH: "ofereceu falar com analista",
  TRANSFER_CRITICAL: "chamou um atendente",
  TRANSFER_LOW_CONFIDENCE: "ofereceu falar com analista",
  DUPLICATE_CANDIDATE: "verificou duplicidade",
  GREETING: "cumprimentou você",
  OUT_OF_SCOPE: "direcionou o assunto",
};

const HIDDEN_RULES = new Set<string>([
  "SCOPE_IT",
  "NO_DECISION_REPORTED",
  "TOOL_FAILED",
  "LLM_UNAVAILABLE",
  "DRAFT_INCOMPLETE",
  "TICKET_LEGACY_UNAVAILABLE",
]);

const INTERNAL_TOOLS = new Set(["report_decision"]);

/**
 * Rótulos PT da status line (G-UI-E01), no estilo do protótipo ("✓ consultou
 * seus chamados"). Passos repetidos no mesmo turno aparecem uma única vez.
 */
export function actionLabels(actions: string[]): string[] {
  const labels = actions
    .filter((a) => !INTERNAL_TOOLS.has(a))
    .map((a) => ACTION_LABELS[a] ?? a.replace(/_/g, " "));
  return [...new Set(labels)];
}

/**
 * Monta os chips da status line: ferramentas executadas + regras visíveis;
 * se o modelo só respondeu texto, um passo genérico de entendimento.
 */
export function statusLineLabels(
  actions: string[],
  rulesFired: string[] = [],
  options?: { hasReply?: boolean },
): string[] {
  const fromTools = actionLabels(actions);
  const fromRules = rulesFired
    .filter((r) => !HIDDEN_RULES.has(r))
    .map((r) => RULE_STATUS_LABELS[r as RuleId])
    .filter((label): label is string => Boolean(label));

  const merged = [...new Set([...fromTools, ...fromRules])];
  if (merged.length === 0 && options?.hasReply) {
    return ["entendeu sua mensagem"];
  }
  return merged;
}