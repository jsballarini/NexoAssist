"use client";

import { TonePill } from "@/components/tickets/ticket-tone";
import { Button } from "@/components/ui/button";
import { BotIcon, HandIcon, XCircleIcon } from "@/components/ui/icons";
import type { InboxItem } from "@/lib/analyst/types";
import { PersonAvatar } from "./person-avatar";

/** Cabeçalho da conversa: identidade do funcionário, estado e ações do atendimento assumido. */
export function ThreadHeader({
  item,
  state,
  isMine,
  panelOpen,
  onReturn,
  onClose,
  onTogglePanel,
}: {
  item: InboxItem;
  state: string;
  isMine: boolean;
  panelOpen: boolean;
  onReturn: () => void;
  onClose: () => void;
  onTogglePanel: () => void;
}) {
  const subtitle = [item.employeeDepartment, item.linkedTicketId].filter(Boolean).join(" · ");
  return (
    <header
      className="flex h-16 shrink-0 items-center gap-3 border-b border-nexo-rule bg-white px-5"
      data-takeover-bar
      data-thread-state={state}
    >
      <PersonAvatar name={item.employeeName} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-nexo-ink">{item.employeeName}</p>
        {subtitle ? <p className="truncate text-xs text-nexo-ink-3">{subtitle}</p> : null}
      </div>
      {state === "awaiting_analyst" ? (
        <TonePill tone="warning">
          <HandIcon className="size-3.5" />
          Aguardando atendente
        </TonePill>
      ) : null}
      {state === "with_analyst" && !isMine ? (
        <TonePill tone="info">{item.assignedAnalystName ?? "Outro analista"} atendendo</TonePill>
      ) : null}
      {item.needsReview && state === "with_agent" ? (
        <TonePill tone="warning">Agent pediu ajuda</TonePill>
      ) : null}
      {state === "with_analyst" && isMine ? (
        <>
          <Button type="button" size="sm" variant="outline" onClick={onReturn}>
            <BotIcon className="size-4" />
            Devolver ao agent
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-nexo-danger/40 text-nexo-danger-text hover:bg-nexo-danger-soft hover:text-nexo-danger-text"
            onClick={onClose}
          >
            <XCircleIcon className="size-4" />
            Encerrar atendimento
          </Button>
        </>
      ) : null}
      {!panelOpen ? (
        <Button type="button" size="sm" variant="ghost" onClick={onTogglePanel}>
          Chamados
        </Button>
      ) : null}
    </header>
  );
}
