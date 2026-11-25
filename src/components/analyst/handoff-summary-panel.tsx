import { ruleLabels } from "@/lib/chat/trace-format";

export type HandoffSummaryView = {
  problem: string;
  stepsTried: string[];
  ticketIds: string[];
  reason: string;
  confidence: number | null;
  rulesFired: string[];
};

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-nexo-ink-3">{label}</dt>
      <dd className="min-w-0 text-nexo-ink-2">{children}</dd>
    </div>
  );
}

/** Resumo estruturado do handoff (problema, passos, chamados, motivo) no topo da conversa. */
export function HandoffSummaryPanel({ summary }: { summary: HandoffSummaryView }) {
  return (
    <details
      open
      className="border-b border-nexo-rule bg-white px-5 py-2.5 text-xs"
      data-handoff-summary
      aria-label="Resumo do handoff"
    >
      <summary className="cursor-pointer font-semibold text-nexo-warning-text select-none">
        Resumo do agent para o analista
      </summary>
      <dl className="mt-1.5 space-y-0.5">
        <SummaryRow label="Problema">{summary.problem}</SummaryRow>
        {summary.stepsTried.length ? (
          <SummaryRow label="Já tentado">{summary.stepsTried.join(" · ")}</SummaryRow>
        ) : null}
        {summary.ticketIds.length ? <SummaryRow label="Chamados">{summary.ticketIds.join(", ")}</SummaryRow> : null}
        <SummaryRow label="Motivo">
          {summary.reason}
          {summary.confidence !== null ? ` (confiança ${summary.confidence}%)` : ""}
        </SummaryRow>
        {summary.rulesFired.length ? (
          <SummaryRow label="Regras">{ruleLabels(summary.rulesFired).join(", ")}</SummaryRow>
        ) : null}
      </dl>
    </details>
  );
}
