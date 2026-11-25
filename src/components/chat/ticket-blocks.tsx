"use client";

import { CardField } from "@/components/tickets/card-field";
import { TonePill, ToneDot, priorityTone, statusTone } from "@/components/tickets/ticket-tone";
import type { UiBlock } from "@/lib/conversation/types";
import { labelOr, ticketPriorityLabel } from "@/lib/domain/ticket-labels";
import { formatDateTime, formatDaysAgo, formatShortDate } from "@/lib/format/date";
import { cn } from "@/utils";
import { useState } from "react";

type TicketCardBlock = Extract<UiBlock, { type: "ticket_card" }>;
type TicketSelectorBlock = Extract<UiBlock, { type: "ticket_selector" }>;

function BreachedTag() {
  return (
    <TonePill tone="danger" className="px-2 py-0">
      Vencido
    </TonePill>
  );
}

/** Card de chamado (Tela 2): cabeçalho, título, descrição e grade de campos. */
export function TicketCard({ block }: { block: TicketCardBlock }) {
  const tone = statusTone(block);
  const hasDetail = Boolean(block.categoryLabel || block.openedAt || block.lastUpdatedAt);
  return (
    <div
      className="rounded-nexo-lg border border-nexo-rule bg-white px-4 pt-3.5 pb-4 text-sm shadow-theme-xs"
      data-ticket-card={block.ticketId}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-nexo-ink-3">
        <span className="flex items-center gap-1.5">
          <span>Chamado</span>
          <span aria-hidden>·</span>
          <span className="font-mono">{block.ticketId}</span>
        </span>
        <span className="flex items-center gap-2">
          {block.slaBreached ? <BreachedTag /> : null}
          <span className="flex items-center gap-1.5 font-medium text-nexo-ink-2">
            <ToneDot tone={block.status === "waiting_analyst" ? "warning" : tone} />
            {block.statusLabel}
          </span>
        </span>
      </div>
      <p className="mt-2 font-newsreader text-xl leading-snug font-medium text-nexo-ink">{block.title}</p>
      {block.description ? (
        <p className="mt-1.5 line-clamp-3 text-sm text-nexo-ink-2">{block.description}</p>
      ) : null}
      {hasDetail ? (
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-nexo-rule pt-3 sm:grid-cols-4">
          <CardField label="Categoria">{block.categoryLabel ?? "—"}</CardField>
          <CardField label="Prioridade">
            <ToneDot tone={priorityTone(block.priority)} />
            {labelOr(ticketPriorityLabel, block.priority)}
          </CardField>
          <CardField label="Aberto em">{formatDateTime(block.openedAt) || "—"}</CardField>
          <CardField label="Última atualização">
            <span className={block.slaBreached ? "text-nexo-warning-text" : undefined}>
              {formatDaysAgo(block.lastUpdatedAt) || "—"}
            </span>
            {block.slaBreached ? (
              <span className="text-xs font-normal text-nexo-ink-3">· prazo vencido</span>
            ) : null}
          </CardField>
        </dl>
      ) : null}
    </div>
  );
}

/** Lista de chamados abertos com seleção única (Tela 2); escolher envia a mensagem. */
export function TicketSelector({
  block,
  onQuickReply,
}: {
  block: TicketSelectorBlock;
  onQuickReply?: (text: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div
      className="overflow-hidden rounded-nexo-lg border border-nexo-rule bg-white text-sm shadow-theme-xs"
      role="radiogroup"
      aria-label="Seus chamados abertos"
      data-ticket-selector
    >
      {block.tickets.map((t) => {
        const isSelected = selected === t.ticketId;
        return (
          <button
            key={t.ticketId}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={!onQuickReply}
            className={cn(
              "flex w-full items-center gap-3 border-b border-nexo-rule px-4 py-2.5 text-left last:border-b-0 hover:bg-nexo-desk disabled:cursor-default disabled:hover:bg-transparent",
              isSelected && "bg-brand-50/60",
            )}
            onClick={() => {
              setSelected(t.ticketId);
              onQuickReply?.(`${t.ticketId} · ${t.title}`);
            }}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full border",
                isSelected ? "border-brand-500" : "border-gray-300",
              )}
            >
              {isSelected ? <span className="size-2 rounded-full bg-brand-500" /> : null}
            </span>
            <span className="w-20 shrink-0 font-mono text-xs text-nexo-ink-3">{t.ticketId}</span>
            <span className="min-w-0 flex-1 truncate font-medium text-nexo-ink">{t.title}</span>
            {t.slaBreached ? <BreachedTag /> : null}
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-nexo-ink-2">
              <ToneDot tone={statusTone({ status: t.status, statusLabel: t.statusLabel })} />
              {t.statusLabel}
            </span>
            <span className="w-12 shrink-0 text-right text-xs text-nexo-ink-3">
              {formatShortDate(t.openedAt)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
