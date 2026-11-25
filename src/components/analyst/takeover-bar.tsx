"use client";

import { BareInput } from "@/components/ui/bare-input";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, BotIcon, HandIcon, HeadsetIcon } from "@/components/ui/icons";
import { firstName } from "@/lib/analyst/inbox-view";
import { formatClock } from "@/lib/format/date";
import { useState } from "react";

/**
 * Barra "{nome} espera um atendente" (Conversas 1). "Devolver ao agent" fica
 * desabilitado: o backend só devolve conversas já assumidas.
 */
export function TakeoverBar({
  employeeName,
  waitingSince,
  onAssume,
}: {
  employeeName: string;
  waitingSince: string;
  onAssume: () => void;
}) {
  const since = formatClock(waitingSince);
  return (
    <div className="flex items-center gap-3 border-t border-nexo-rule bg-white px-5 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nexo-warning-soft text-nexo-warning-text">
        <HandIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-nexo-ink">{firstName(employeeName)} espera um atendente</p>
        <p className="text-xs text-nexo-ink-3">Agent pausado{since ? ` · desde ${since}` : ""}</p>
      </div>
      <Button type="button" size="sm" variant="outline" disabled title="Assuma antes de devolver ao agent">
        <BotIcon className="size-4" />
        Devolver ao agent
      </Button>
      <Button type="button" size="sm" className="bg-nexo-cta hover:bg-brand-900" onClick={onAssume}>
        <HeadsetIcon className="size-4" />
        Assumir atendimento
      </Button>
    </div>
  );
}

/** Campo de resposta do analista; desabilitado até assumir o atendimento. */
export function AnalystComposer({
  enabled,
  onSend,
}: {
  enabled: boolean;
  onSend: (content: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="border-t border-nexo-rule bg-white px-5 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        const content = value.trim();
        if (!content) return;
        setValue("");
        void onSend(content);
      }}
    >
      <div className="flex items-center gap-2 rounded-nexo-md border border-nexo-rule bg-white p-1.5 pl-3.5 focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/12">
        <BareInput
          className="h-9"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={enabled ? "Mensagem ao funcionário…" : "Assuma o atendimento para responder"}
          aria-label="Mensagem ao funcionário"
          disabled={!enabled}
        />
        <Button
          type="submit"
          size="icon-sm"
          className="rounded-full bg-nexo-cta hover:bg-brand-900"
          disabled={!enabled || !value.trim()}
          aria-label="Enviar"
        >
          <ArrowUpIcon className="size-4" />
        </Button>
      </div>
    </form>
  );
}
