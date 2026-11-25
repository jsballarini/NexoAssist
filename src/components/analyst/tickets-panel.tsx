"use client";

import { ToneDot, statusTone } from "@/components/tickets/ticket-tone";
import { ArrowUpRightIcon, ChevronRightIcon, CloseIcon, HeadsetIcon, SwapIcon } from "@/components/ui/icons";
import { firstName } from "@/lib/analyst/inbox-view";
import { labelOr, ticketPriorityLabel } from "@/lib/domain/ticket-labels";
import { formatClock, formatShortDate } from "@/lib/format/date";
import { cn } from "@/utils";
import { useState } from "react";
import { TraceList } from "./trace-list";
import type { PanelTicket, TicketCounts, TraceItem } from "./types";

/** Quantos "outros chamados" aparecem antes de "Ver todos". */
const OTHER_TICKETS_PREVIEW = 4;

type Tab = "tickets" | "trace";

function categoryAndPriority(t: PanelTicket): string {
  const priority = labelOr(ticketPriorityLabel, t.priority).toLowerCase();
  return [t.categoryLabel, `prioridade ${priority}`].filter(Boolean).join(" · ");
}

function ticketSubline(t: PanelTicket): string {
  if (t.resolvedAt) return `${t.id} · Resolvido em ${formatShortDate(t.resolvedAt)}`;
  return `${t.id} · ${t.statusLabel}`;
}

function LinkedTicketCard({
  ticket,
  ticketId,
  state,
  assignedAnalystName,
  updatedAt,
}: {
  ticket?: PanelTicket;
  ticketId: string;
  state: string;
  assignedAnalystName: string | null;
  updatedAt: string;
}) {
  const footer =
    state === "awaiting_analyst"
      ? { Icon: SwapIcon, text: "Transferido para um analista" }
      : state === "with_analyst"
        ? { Icon: HeadsetIcon, text: `Assumido por ${assignedAnalystName ?? "analista"}` }
        : null;
  return (
    <div className="rounded-nexo-md bg-nexo-desk p-3.5" data-linked-ticket={ticketId}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-mono text-nexo-ink-3">{ticketId}</span>
        {ticket ? (
          <span className="flex items-center gap-1.5 font-medium text-nexo-ink-2">
            <ToneDot tone={statusTone(ticket)} />
            {ticket.statusLabel}
          </span>
        ) : null}
      </div>
      {ticket ? (
        <>
          <p className="mt-1.5 text-sm font-semibold text-nexo-ink">{ticket.title}</p>
          <p className="mt-0.5 text-xs text-nexo-ink-3">{categoryAndPriority(ticket)}</p>
        </>
      ) : null}
      {footer ? (
        <p className="mt-3 flex items-center gap-1.5 border-t border-nexo-rule pt-2.5 text-xs text-nexo-ink-2">
          <footer.Icon className="size-3.5" />
          <span className="flex-1">{footer.text}</span>
          <span className="text-nexo-ink-3">{formatClock(updatedAt)}</span>
        </p>
      ) : null}
    </div>
  );
}

function OtherTicketRow({ ticket }: { ticket: PanelTicket }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-nexo-rule last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-2.5 py-2.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ToneDot tone={statusTone(ticket)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-nexo-ink">{ticket.title}</span>
          <span className="block truncate text-xs text-nexo-ink-3">{ticketSubline(ticket)}</span>
        </span>
        <ChevronRightIcon className={cn("size-4 shrink-0 text-nexo-ink-3 transition-transform", open && "rotate-90")} />
      </button>
      {open ? (
        <p className="pb-2.5 pl-4.5 text-xs text-nexo-ink-3">
          {categoryAndPriority(ticket)} · aberto em {formatShortDate(ticket.openedAt)}
          {ticket.slaBreached ? <span className="ml-1 font-medium text-nexo-danger-text">· Vencido</span> : null}
        </p>
      ) : null}
    </li>
  );
}

/** Painel direito: chamados do funcionário (desta conversa + outros) e aba de trace do agent. */
export function TicketsPanel({
  employeeName,
  linkedTicketId,
  state,
  assignedAnalystName,
  updatedAt,
  openTickets,
  resolvedTickets,
  counts,
  traces,
  onClose,
}: {
  employeeName: string;
  linkedTicketId?: string;
  state: string;
  assignedAnalystName: string | null;
  updatedAt: string;
  openTickets: PanelTicket[];
  resolvedTickets: PanelTicket[];
  counts: TicketCounts | null;
  traces: TraceItem[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("tickets");
  const [showAll, setShowAll] = useState(false);
  const all = [...openTickets, ...resolvedTickets];
  const linked = linkedTicketId ? all.find((t) => t.id === linkedTicketId) : undefined;
  const others = all.filter((t) => t.id !== linkedTicketId);
  const visibleOthers = showAll ? others : others.slice(0, OTHER_TICKETS_PREVIEW);
  const name = firstName(employeeName);

  return (
    <aside className="flex min-h-0 w-[320px] shrink-0 flex-col border-l border-nexo-rule bg-white" data-ticket-panel>
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-nexo-ink">Chamados da {name}</h2>
          {counts ? (
            <p className="text-xs text-nexo-ink-3">
              {counts.open} abertos · {counts.closed} encerrados
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-nexo-sm p-1 text-nexo-ink-3 hover:bg-nexo-desk hover:text-nexo-ink"
          onClick={onClose}
          aria-label="Fechar painel de chamados"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>
      <div className="flex gap-4 border-b border-nexo-rule px-4 text-sm" role="tablist">
        {(
          [
            ["tickets", "Chamados"],
            ["trace", "Trace"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={cn(
              "-mb-px border-b-2 pb-2 font-medium",
              tab === key ? "border-brand-500 text-nexo-ink" : "border-transparent text-nexo-ink-3 hover:text-nexo-ink-2",
            )}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "trace" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TraceList traces={traces} />
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {linkedTicketId ? (
              <section>
                <h3 className="mb-2 text-xs font-medium text-nexo-ink-3">Desta conversa</h3>
                <LinkedTicketCard
                  ticket={linked}
                  ticketId={linkedTicketId}
                  state={state}
                  assignedAnalystName={assignedAnalystName}
                  updatedAt={updatedAt}
                />
              </section>
            ) : null}
            <section>
              <h3 className="mb-1 text-xs font-medium text-nexo-ink-3">
                {linkedTicketId ? "Outros chamados" : "Chamados"}
              </h3>
              {visibleOthers.length ? (
                <ul>
                  {visibleOthers.map((t) => (
                    <OtherTicketRow key={t.id} ticket={t} />
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-xs text-nexo-ink-3">Nenhum outro chamado.</p>
              )}
            </section>
          </div>
          {others.length > OTHER_TICKETS_PREVIEW ? (
            <div className="border-t border-nexo-rule p-3">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1.5 rounded-nexo-md border border-nexo-rule py-2 text-sm font-medium text-nexo-ink-2 hover:bg-nexo-desk"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "Mostrar menos" : `Ver todos os chamados da ${name}`}
                {showAll ? null : <ArrowUpRightIcon className="size-3.5" />}
              </button>
            </div>
          ) : null}
        </>
      )}
    </aside>
  );
}
