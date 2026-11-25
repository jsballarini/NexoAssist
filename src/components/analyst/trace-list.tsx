"use client";

import { formatDurationMs } from "@/lib/analyst/format";
import { actionLabels } from "@/lib/chat/action-labels";
import { formatUsage, ruleLabels } from "@/lib/chat/trace-format";
import { useState } from "react";
import type { TraceItem } from "./types";

function TraceBody({ trace }: { trace: TraceItem["trace"] }) {
  const usage = formatUsage(trace.usage);
  return (
    <div className="mt-2 space-y-1 text-nexo-ink-2">
      <p data-trace-understanding>{trace.understanding}</p>
      <p>Confiança: {trace.confidence}%</p>
      {trace.reasoning ? (
        <p data-trace-reasoning>
          <span className="font-medium">Por quê:</span> {trace.reasoning}
        </p>
      ) : null}
      <p>Duração: {formatDurationMs(trace.durationMs)}</p>
      {usage ? <p data-trace-usage>Consumo: {usage}</p> : null}
      {trace.actions.length ? (
        <div className="flex flex-wrap gap-1">
          {actionLabels(trace.actions).map((label) => (
            <span key={label} className="rounded-full bg-nexo-desk px-1.5 py-0.5 text-[10px]">
              {label}
            </span>
          ))}
        </div>
      ) : null}
      <p data-trace-rules>Regras: {ruleLabels(trace.rulesFired).join(", ") || "—"}</p>
      {trace.evidence?.length ? (
        <ul className="list-inside list-disc">
          {trace.evidence.map((e, idx) => (
            <li key={idx}>
              {e.type}: {e.id}
              {e.excerpt ? ` — ${e.excerpt.slice(0, 40)}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {trace.rawToolCalls?.length ? (
        <p className="text-[10px] text-nexo-ink-3">rawToolCalls: {trace.rawToolCalls.join(", ")}</p>
      ) : null}
    </div>
  );
}

/** Lista de traces do agent por resposta, cada um expansível. */
export function TraceList({ traces }: { traces: TraceItem[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (traces.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-nexo-ink-3">Sem respostas do agent nesta conversa.</p>;
  }
  return (
    <ul className="space-y-2 p-4 text-xs">
      {traces.map((tr) => {
        const open = expanded === tr.messageId;
        return (
          <li key={tr.messageId} className="rounded-nexo-md border border-nexo-rule p-2.5">
            <p className="line-clamp-2 text-nexo-ink">{tr.content}</p>
            <button
              type="button"
              className="mt-1 font-medium text-brand-700"
              onClick={() => setExpanded(open ? null : tr.messageId)}
              aria-expanded={open}
              data-trace-toggle
            >
              {open ? "Ocultar" : "Expandir"} trace
            </button>
            {open ? <TraceBody trace={tr.trace} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
