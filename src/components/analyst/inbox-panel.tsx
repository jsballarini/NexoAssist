"use client";

import { ToneDot } from "@/components/tickets/ticket-tone";
import { BareInput } from "@/components/ui/bare-input";
import { SearchIcon } from "@/components/ui/icons";
import {
  INBOX_FILTERS,
  inboxContext,
  previewPrefix,
  type InboxFilter,
} from "@/lib/analyst/inbox-view";
import type { InboxItem } from "@/lib/analyst/types";
import { formatListTime } from "@/lib/format/date";
import { cn } from "@/utils";
import { PersonAvatar } from "./person-avatar";

function InboxRow({
  item,
  analystId,
  selected,
  onSelect,
}: {
  item: InboxItem;
  analystId: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const context = inboxContext(item, analystId);
  const unread = item.unreadCount > 0;
  return (
    <button
      type="button"
      data-inbox-state={item.state}
      data-inbox-kind={item.inboxKind}
      data-inbox-review={item.needsReview ? "true" : "false"}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full gap-3 rounded-nexo-md px-3 py-3 text-left transition-colors hover:bg-nexo-desk",
        selected && "bg-nexo-desk",
      )}
      onClick={onSelect}
    >
      <PersonAvatar name={item.employeeName} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-nexo-ink">{item.employeeName}</span>
          <span className={cn("shrink-0 text-xs", unread ? "font-semibold text-brand-600" : "text-nexo-ink-3")}>
            {formatListTime(item.updatedAt)}
          </span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-nexo-ink-2">
            {previewPrefix(item)}
            {item.preview}
          </span>
          {unread ? (
            <span className="flex min-w-4 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] leading-4 font-semibold text-white">
              {item.unreadCount}
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "mt-1 flex items-center gap-1.5 text-[11px]",
            context.tone === "danger" && "text-nexo-danger-text",
            context.tone === "warning" && "text-nexo-warning-text",
            context.tone === "info" && "text-brand-700",
            context.tone === "success" && "text-nexo-ink-3",
          )}
          {...(item.needsReview ? { "data-review-badge": true } : {})}
        >
          <ToneDot tone={context.tone} className="size-1.5" />
          {context.label}
        </span>
      </span>
    </button>
  );
}

/** Coluna "Conversas": título, busca, chips com contagem e lista da fila. */
export function InboxPanel({
  items,
  counts,
  analystId,
  selectedId,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onSelect,
}: {
  items: InboxItem[];
  counts: Record<InboxFilter, number>;
  analystId: string;
  selectedId: string | null;
  filter: InboxFilter;
  search: string;
  onFilterChange: (filter: InboxFilter) => void;
  onSearchChange: (value: string) => void;
  onSelect: (conversationId: string) => void;
}) {
  return (
    <aside className="flex min-h-0 w-[360px] shrink-0 flex-col border-r border-nexo-rule bg-white">
      <div className="space-y-3 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-nexo-ink">Conversas</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-nexo-success-soft px-2.5 py-1 text-xs font-medium text-nexo-success-text">
            <span className="size-1.5 rounded-full bg-nexo-success" />
            Disponível
          </span>
        </div>
        <label className="flex h-9 items-center gap-2 rounded-nexo-md bg-nexo-desk px-3 text-nexo-ink-3 focus-within:ring-3 focus-within:ring-brand-500/12">
          <SearchIcon className="size-4 shrink-0" />
          <BareInput
            placeholder="Pesquisar conversa ou chamado"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Pesquisar conversa ou chamado"
          />
        </label>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtros da fila">
          {INBOX_FILTERS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                  active ? "bg-brand-50 text-brand-700" : "bg-nexo-desk text-nexo-ink-2 hover:text-nexo-ink",
                )}
                onClick={() => onFilterChange(key)}
              >
                {label}
                {key !== "all" ? <span className={active ? "text-brand-600" : "text-nexo-ink-3"}>{counts[key]}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {items.map((item) => (
          <li key={item.conversationId}>
            <InboxRow
              item={item}
              analystId={analystId}
              selected={selectedId === item.conversationId}
              onSelect={() => onSelect(item.conversationId)}
            />
          </li>
        ))}
        {items.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-nexo-ink-3">Nenhuma conversa neste filtro.</li>
        ) : null}
      </ul>
    </aside>
  );
}
