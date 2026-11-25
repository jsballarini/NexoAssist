import { RULE_LABELS, type RuleId } from "@/lib/domain/rules";

export type TraceUsage = { promptTokens: number; completionTokens: number; latencyMs: number };

/** Rótulos PT das regras disparadas; ids desconhecidos voltam como estão. */
export function ruleLabels(ids: readonly string[]): string[] {
  return ids.map((id) => RULE_LABELS[id as RuleId] ?? id);
}

/** Resumo de consumo do turno, ex.: "1.250 tokens (1.100 entrada / 150 saída) · 2,4 s". */
export function formatUsage(usage: TraceUsage | null | undefined): string | null {
  if (!usage) return null;
  const total = usage.promptTokens + usage.completionTokens;
  const nf = new Intl.NumberFormat("pt-BR");
  const seconds = (usage.latencyMs / 1000).toFixed(1).replace(".", ",");
  return `${nf.format(total)} tokens (${nf.format(usage.promptTokens)} entrada / ${nf.format(usage.completionTokens)} saída) · ${seconds} s`;
}
