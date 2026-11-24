export type RuleId =
  | "SCOPE_IT"
  | "OUT_OF_SCOPE"
  | "KB_PARTIAL_MATCH"
  | "TICKET_SLA_BREACH"
  | "GREETING"
  | "TICKET_LOOKUP";

const OUT_OF_SCOPE_RE =
  /\b(vale[-\s]?refeição|vale refeição|rh\b|benefício|beneficios|folha de pagamento|salário|ferias|férias|plano de saúde)\b/i;

export function detectOutOfScope(input: string): boolean {
  return OUT_OF_SCOPE_RE.test(input);
}

export function getConfidenceTransferOffer(): number {
  const raw = process.env.AGENT_CONFIDENCE_TRANSFER_OFFER ?? "50";
  return Number.parseInt(raw, 10);
}

export function getConfidenceTransferStrong(): number {
  const raw = process.env.AGENT_CONFIDENCE_TRANSFER_STRONG ?? "35";
  return Number.parseInt(raw, 10);
}

export function normalizeConfidence(value: number): number {
  if (value <= 1 && value > 0) {
    return Math.round(value * 100);
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function inferRulesFromContent(input: string, toolsUsed: string[]): RuleId[] {
  if (detectOutOfScope(input)) {
    return ["OUT_OF_SCOPE"];
  }
  const rules: RuleId[] = ["SCOPE_IT"];
  const lower = input.toLowerCase();

  if (/^(oi|olá|ola|bom dia|boa tarde)/i.test(lower.trim())) {
    rules.push("GREETING");
  }
  if (toolsUsed.includes("search_kb")) {
    rules.push("KB_PARTIAL_MATCH");
  }
  if (toolsUsed.includes("get_ticket") || toolsUsed.includes("list_open_tickets")) {
    rules.push("TICKET_LOOKUP");
  }
  if (/inc-20311|vencido|prazo/i.test(lower)) {
    rules.push("TICKET_SLA_BREACH");
  }

  return [...new Set(rules)];
}