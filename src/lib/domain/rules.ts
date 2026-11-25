export type RuleId =
  | "SCOPE_IT"
  | "OUT_OF_SCOPE"
  | "KB_PARTIAL_MATCH"
  | "TICKET_SLA_BREACH"
  | "GREETING"
  | "TICKET_LOOKUP"
  | "DRAFT_PROPOSED"
  | "DRAFT_INCOMPLETE"
  | "DUPLICATE_CANDIDATE"
  | "SLA_CRITICAL"
  | "TRANSFER_TO_ANALYST"
  | "TRANSFER_USER_REQUEST"
  | "TRANSFER_SLA_BREACH"
  | "TRANSFER_CRITICAL"
  | "TRANSFER_LOW_CONFIDENCE"
  | "TICKET_LEGACY_UNAVAILABLE"
  | "NO_DECISION_REPORTED"
  | "LLM_UNAVAILABLE"
  | "TOOL_FAILED";

/** Rótulos legíveis das regras (chips e trace). */
export const RULE_LABELS: Record<RuleId, string> = {
  SCOPE_IT: "Assunto de TI",
  OUT_OF_SCOPE: "Fora do escopo de TI",
  KB_PARTIAL_MATCH: "Artigo da central de ajuda",
  TICKET_SLA_BREACH: "Prazo do chamado vencido",
  GREETING: "Saudação",
  TICKET_LOOKUP: "Consulta de chamado",
  DRAFT_PROPOSED: "Rascunho proposto",
  DRAFT_INCOMPLETE: "Rascunho com campos faltando",
  DUPLICATE_CANDIDATE: "Possível chamado duplicado",
  SLA_CRITICAL: "Prioridade crítica",
  TRANSFER_TO_ANALYST: "Transferência para analista",
  TRANSFER_USER_REQUEST: "Transferência pedida pelo funcionário",
  TRANSFER_SLA_BREACH: "Transferência por prazo vencido",
  TRANSFER_CRITICAL: "Transferência por caso crítico",
  TRANSFER_LOW_CONFIDENCE: "Transferência por baixa segurança do agent",
  TICKET_LEGACY_UNAVAILABLE: "Sistema de chamados indisponível",
  NO_DECISION_REPORTED: "Decisão não reportada pelo modelo",
  LLM_UNAVAILABLE: "Modelo indisponível",
  TOOL_FAILED: "Falha em ferramenta",
};

export type OutOfScopeArea = "rh" | "financeiro" | "facilities";

export type OutOfScopeResult = { out: false } | { out: true; area: OutOfScopeArea };

const OUT_OF_SCOPE_PATTERNS: { area: OutOfScopeArea; pattern: RegExp }[] = [
  {
    area: "rh",
    pattern:
      /\b(vale[-\s]?refei[cç][aã]o|vale[-\s]?alimenta[cç][aã]o|rh|benef[ií]cios?|folha de pagamento|sal[aá]rio|f[eé]rias|plano de sa[uú]de|holerite|admiss[aã]o|demiss[aã]o)\b/i,
  },
  {
    area: "financeiro",
    pattern:
      /\b(reembolso|nota fiscal|notas fiscais|pagamento (a|de|ao) (um )?fornecedor|adiantamento|presta[cç][aã]o de contas|boleto|cart[aã]o corporativo|contas a (pagar|receber))\b/i,
  },
  {
    area: "facilities",
    pattern:
      /\b(ar[-\s]?condicionado|servi[cç]o de limpeza|limpeza d[aeo]s? (sala|escrit[oó]rio|banheiro|andar)|faxina|crach|reserva(r)? (de |a )?sala|sala (de reuni[aã]o )?(est[aá] )?(muito )?(quente|fria|suja)|cadeira|mesa de trabalho|estacionamento|elevador|l[aâ]mpada|goteira)\b/i,
  },
];

const OUT_OF_SCOPE_MESSAGES: Record<OutOfScopeArea, string> = {
  rh: "Esse assunto é tratado pelo RH, não pelo service desk de TI.",
  financeiro: "Esse assunto é tratado pelo Financeiro, não pelo service desk de TI.",
  facilities: "Esse assunto é tratado por Facilities (infraestrutura predial), não pelo service desk de TI.",
};

const OUT_OF_SCOPE_SUFFIX = " Posso ajudar com acesso, VPN, hardware ou software.";

/** Classifica pedidos que não são de TI (RH, financeiro, facilities) e indica a área. */
export function classifyOutOfScope(input: string): OutOfScopeResult {
  for (const { area, pattern } of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(input)) return { out: true, area };
  }
  return { out: false };
}

export function detectOutOfScope(input: string): boolean {
  return classifyOutOfScope(input).out;
}

/** Texto de redirecionamento com a área correta. */
export function outOfScopeReply(area: OutOfScopeArea): string {
  return `${OUT_OF_SCOPE_MESSAGES[area]}${OUT_OF_SCOPE_SUFFIX}`;
}

const DEFAULT_TRANSFER_OFFER = 50;
const DEFAULT_TRANSFER_STRONG = 35;

function readThreshold(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export function getConfidenceTransferOffer(): number {
  return readThreshold("AGENT_CONFIDENCE_TRANSFER_OFFER", DEFAULT_TRANSFER_OFFER);
}

export function getConfidenceTransferStrong(): number {
  return readThreshold("AGENT_CONFIDENCE_TRANSFER_STRONG", DEFAULT_TRANSFER_STRONG);
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
