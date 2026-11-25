"use client";

import { formatUsage, ruleLabels } from "@/lib/chat/trace-format";
import type { ChatMessage } from "./use-chat-stream";

/** Painel recolhível de transparência do agente (entendimento, confiança, evidências, regras). */
export function TraceDetails({ trace }: { trace: NonNullable<ChatMessage["trace"]> }) {
  const usage = formatUsage(trace.usage);
  return (
    <details className="text-xs text-nexo-ink-3">
      <summary className="cursor-pointer select-none hover:text-nexo-ink-2">Trace</summary>
      <div className="mt-1 space-y-0.5 rounded-nexo-md border border-nexo-rule bg-nexo-desk p-2.5">
        <p className="text-nexo-ink-2">{trace.understanding}</p>
        <p>Confiança: {trace.confidence}%</p>
        {trace.reasoning ? (
          <p data-trace-reasoning>
            <span className="font-medium text-nexo-ink-2">Por quê:</span> {trace.reasoning}
          </p>
        ) : null}
        {trace.evidence?.length ? (
          <ul className="list-inside list-disc">
            {trace.evidence.map((e, idx) => (
              <li key={idx}>
                {e.type}: {e.id}
                {e.excerpt ? ` — ${e.excerpt.slice(0, 60)}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        <p>Tools: {trace.actions.join(", ") || "—"}</p>
        <p data-trace-rules>Regras: {ruleLabels(trace.rulesFired).join(", ") || "—"}</p>
        {usage ? <p data-trace-usage>Consumo: {usage}</p> : null}
        <details className="pt-1">
          <summary className="cursor-pointer text-nexo-ink-2">Detalhes técnicos</summary>
          <pre className="mt-1 max-h-40 overflow-auto rounded bg-white p-2 text-[10px] text-nexo-ink-2">
            {JSON.stringify(trace, null, 2)}
          </pre>
        </details>
      </div>
    </details>
  );
}
