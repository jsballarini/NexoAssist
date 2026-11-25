/** Quantas pessoas são afetadas (mesmos valores de `AffectedScope`). */
export type ImpactScope = "only_me" | "team" | "organization";

/**
 * Urgência percebida:
 * - `low`: sem pressa (melhoria, pedido sem prazo)
 * - `has_workaround`: atrapalha, mas existe alternativa
 * - `same_day_commitment`: compromisso em risco no mesmo dia
 * - `blocking_work`: o trabalho está parado
 */
export type Urgency = "low" | "has_workaround" | "same_day_commitment" | "blocking_work";

/** Mesmos valores de `TicketPriority`, sem depender do cliente de persistência. */
export type PriorityLevel = "critical" | "high" | "medium" | "low";

export const IMPACT_SCOPES: readonly ImpactScope[] = ["only_me", "team", "organization"];
export const URGENCIES: readonly Urgency[] = [
  "low",
  "has_workaround",
  "same_day_commitment",
  "blocking_work",
];

const PRIORITY_MATRIX: Record<Urgency, Record<ImpactScope, PriorityLevel>> = {
  blocking_work: { only_me: "high", team: "critical", organization: "critical" },
  same_day_commitment: { only_me: "high", team: "high", organization: "high" },
  has_workaround: { only_me: "medium", team: "medium", organization: "medium" },
  low: { only_me: "low", team: "medium", organization: "medium" },
};

export function isImpactScope(value: unknown): value is ImpactScope {
  return typeof value === "string" && (IMPACT_SCOPES as readonly string[]).includes(value);
}

export function isUrgency(value: unknown): value is Urgency {
  return typeof value === "string" && (URGENCIES as readonly string[]).includes(value);
}

/**
 * Prioridade do Anexo A a partir de impacto × urgência.
 * Crítica: equipe ou empresa parada. Alta: uma pessoa parada ou compromisso no dia.
 * Média: atrapalha com alternativa. Baixa: sem urgência.
 */
export function classifyPriority(impact: ImpactScope, urgency: Urgency): PriorityLevel {
  return PRIORITY_MATRIX[urgency][impact];
}
