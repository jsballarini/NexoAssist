import { ruleLabels } from "@/lib/chat/trace-format";

export type HandoffSummaryView = {
  problem: string;
  stepsTried: string[];
  ticketIds: string[];
  reason: string;
  confidence: number | null;
  rulesFired: string[];
};

/** Resumo estruturado do handoff (problema, passos, chamados, motivo) no cabeçalho do console. */
export function HandoffSummaryPanel({ summary }: { summary: HandoffSummaryView }) {
  return (
    <section
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950"
      data-handoff-summary
      aria-label="Resumo do handoff"
    >
      <p className="font-semibold">Resumo do agent para o analista</p>
      <dl className="mt-1 space-y-0.5">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-amber-800">Problema</dt>
          <dd>{summary.problem}</dd>
        </div>
        {summary.stepsTried.length ? (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-amber-800">Já tentado</dt>
            <dd>{summary.stepsTried.join(" · ")}</dd>
          </div>
        ) : null}
        {summary.ticketIds.length ? (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-amber-800">Chamados</dt>
            <dd>{summary.ticketIds.join(", ")}</dd>
          </div>
        ) : null}
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-amber-800">Motivo</dt>
          <dd>
            {summary.reason}
            {summary.confidence !== null ? ` (confiança ${summary.confidence}%)` : ""}
          </dd>
        </div>
        {summary.rulesFired.length ? (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-amber-800">Regras</dt>
            <dd>{ruleLabels(summary.rulesFired).join(", ")}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
