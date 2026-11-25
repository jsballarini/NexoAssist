"use client";

import { MessageContent } from "@/components/chat/message-content";
import { HeadsetIcon, SwapIcon } from "@/components/ui/icons";
import { formatClock, formatShortDate } from "@/lib/format/date";
import { cn } from "@/utils";
import { Fragment, useEffect, useRef } from "react";
import type { ThreadMessage } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

function dayLabel(iso: string, now = new Date()): string {
  const key = dayKey.format(new Date(iso));
  if (key === dayKey.format(now)) return "Hoje";
  if (key === dayKey.format(new Date(now.getTime() - DAY_MS))) return "Ontem";
  return formatShortDate(iso);
}

function SystemIcon({ text }: { text: string }) {
  if (/assumiu/i.test(text)) return <HeadsetIcon className="size-3.5" />;
  if (/transfer|devolveu/i.test(text)) return <SwapIcon className="size-3.5" />;
  return null;
}

function Bubble({ message }: { message: ThreadMessage }) {
  const time = formatClock(message.createdAt);
  if (message.role === "system") {
    return (
      <p className="flex items-center justify-center gap-1.5 py-1 text-xs text-nexo-ink-3" role="status">
        <SystemIcon text={message.content} />
        <span>
          {message.content}
          {time ? ` · ${time}` : ""}
        </span>
      </p>
    );
  }

  const fromEmployee = message.role === "user";
  const isAnalyst = message.role === "analyst";
  return (
    <div
      className={cn("flex max-w-[75%] flex-col gap-1", fromEmployee ? "mr-auto items-start" : "ml-auto items-end")}
      data-thread-role={message.role}
    >
      {!fromEmployee ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-nexo-ink">
          {isAnalyst ? (message.authorName ?? "Analista") : "Nexo Assist"}
          <span
            className={cn(
              "rounded px-1 py-px text-[10px] font-semibold",
              isAnalyst ? "bg-nexo-success-soft text-nexo-success-text" : "bg-brand-50 text-brand-700",
            )}
          >
            {isAnalyst ? "Analista" : "IA"}
          </span>
        </p>
      ) : null}
      <div
        className={cn(
          "rounded-nexo-md px-3.5 py-2.5 text-sm text-nexo-ink",
          fromEmployee && "border border-nexo-rule bg-white",
          message.role === "assistant" && "bg-brand-50",
          isAnalyst && "bg-nexo-success-soft",
        )}
      >
        <MessageContent text={message.content} className="whitespace-pre-wrap" />
        {time ? <span className="mt-1 block text-right text-[10px] text-nexo-ink-3">{time}</span> : null}
      </div>
    </div>
  );
}

/** Histórico da conversa na visão do analista, com separador de dia e linhas de sistema. */
export function ThreadMessages({ messages }: { messages: ThreadMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-nexo-desk">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-6 py-6">
        {messages.map((m, i) => {
          const label = dayLabel(m.createdAt);
          const showDay = i === 0 || dayLabel(messages[i - 1].createdAt) !== label;
          return (
            <Fragment key={m.id}>
              {showDay ? (
                <span className="mx-auto rounded-full border border-nexo-rule bg-white px-2.5 py-0.5 text-xs text-nexo-ink-3">
                  {label}
                </span>
              ) : null}
              <Bubble message={m} />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
