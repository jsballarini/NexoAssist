"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actionLabels } from "@/lib/chat/action-labels";
import { formatDurationMs, formatRelativeTime, initialsFromName } from "@/lib/analyst/format";
import type { InboxItem } from "@/lib/analyst/types";
import { formatUsage, ruleLabels } from "@/lib/chat/trace-format";
import { HandoffSummaryPanel, type HandoffSummaryView } from "./handoff-summary-panel";
import { MessageContent } from "@/components/chat/message-content";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PollConfig = {
  inboxIntervalMs: number;
  inboxBackgroundMs: number;
  threadIntervalMs: number;
};

type ThreadMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type TraceItem = {
  messageId: string;
  content: string;
  trace: {
    understanding: string;
    actions: string[];
    confidence: number;
    rulesFired: string[];
    evidence?: { type: string; id: string; excerpt?: string }[];
    rawToolCalls?: string[] | null;
    reasoning?: string;
    usage?: { promptTokens: number; completionTokens: number; latencyMs: number } | null;
    durationMs?: number;
  };
};

type TicketItem = {
  id: string;
  title: string;
  statusLabel: string;
  slaBreached: boolean;
};

type TicketSummary = {
  open: number;
  closed: number;
};

type Filter = "all" | "needs_you" | "review" | "mine";

const STATE_LABELS: Record<string, string> = {
  awaiting_analyst: "Aguardando analista",
  with_analyst: "Com analista",
  with_agent: "Com o agent",
};

const STATE_BADGE_CLASS: Record<string, string> = {
  awaiting_analyst: "bg-amber-100 text-amber-900",
  with_analyst: "bg-blue-100 text-blue-900",
  with_agent: "bg-gray-100 text-gray-700",
};

/** Selo distinto para "agent sem segurança" (baixa confiança no último turno). */
const REVIEW_BADGE_CLASS = "bg-rose-100 text-rose-900";
const REVIEW_BADGE_LABEL = "Agent sem segurança";

export function AnalystWorkspace({
  analystName,
  analystId,
  pollConfig,
}: {
  analystName: string;
  analystId: string;
  pollConfig: PollConfig;
}) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [threadState, setThreadState] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [handoffSummary, setHandoffSummary] = useState<HandoffSummaryView | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketSummary, setTicketSummary] = useState<TicketSummary | null>(null);
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const inboxEtag = useRef<string | null>(null);

  const refreshInbox = useCallback(async () => {
    const headers: HeadersInit = {};
    if (inboxEtag.current) headers["If-None-Match"] = inboxEtag.current;
    const res = await fetch("/api/analyst/inbox", { headers });
    if (res.status === 304) return;
    if (!res.ok) return;
    const etag = res.headers.get("ETag");
    if (etag) inboxEtag.current = etag;
    const data = (await res.json()) as { items: InboxItem[] };
    setItems(data.items);
    if (!selectedId && data.items.length > 0) {
      setSelectedId(data.items[0].conversationId);
    }
  }, [selectedId]);

  const refreshThread = useCallback(async () => {
    if (!selectedId) return;
    const res = await fetch(`/api/analyst/conversations/${selectedId}/messages`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      messages: ThreadMessage[];
      state: string;
      employeeId: string;
      handoffSummary?: HandoffSummaryView | null;
    };
    setHandoffSummary(data.handoffSummary ?? null);
    setMessages(data.messages);
    setThreadState(data.state);
    setEmployeeId(data.employeeId);

    const tRes = await fetch(`/api/analyst/conversations/${selectedId}/traces`);
    if (tRes.ok) {
      const tData = (await tRes.json()) as { items: TraceItem[] };
      setTraces(tData.items);
    }
  }, [selectedId]);

  const refreshTickets = useCallback(async () => {
    if (!employeeId) return;
    const res = await fetch(`/api/analyst/employees/${employeeId}/tickets`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      items: TicketItem[];
      summary?: TicketSummary;
    };
    setTickets(data.items);
    setTicketSummary(data.summary ?? null);
  }, [employeeId]);

  useEffect(() => {
    void refreshInbox();
    const ms =
      document.visibilityState === "visible"
        ? pollConfig.inboxIntervalMs
        : pollConfig.inboxBackgroundMs;
    const t = setInterval(() => void refreshInbox(), ms);
    const onVis = () => void refreshInbox();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pollConfig, refreshInbox]);

  useEffect(() => {
    void refreshThread();
    if (!selectedId) return;
    const t = setInterval(() => void refreshThread(), pollConfig.threadIntervalMs);
    return () => clearInterval(t);
  }, [selectedId, pollConfig.threadIntervalMs, refreshThread]);

  useEffect(() => {
    void refreshTickets();
  }, [employeeId, refreshTickets]);

  const selected = items.find((i) => i.conversationId === selectedId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
    if (filter === "needs_you") {
      if (i.state !== "awaiting_analyst") return false;
    } else if (filter === "review") {
      if (!i.needsReview) return false;
    } else if (filter === "mine") {
      if (i.assignedAnalystId !== analystId) return false;
    }
    if (!q) return true;
    return (
      i.employeeName.toLowerCase().includes(q) ||
      i.preview.toLowerCase().includes(q)
    );
    });
  }, [items, filter, search, analystId]);

  async function assume() {
    if (!selectedId) return;
    inboxEtag.current = null;
    await fetch(`/api/analyst/conversations/${selectedId}/assume`, { method: "POST" });
    await refreshInbox();
    await refreshThread();
  }

  async function returnToAgent() {
    if (!selectedId) return;
    inboxEtag.current = null;
    await fetch(`/api/analyst/conversations/${selectedId}/return-to-agent`, {
      method: "POST",
    });
    await refreshInbox();
    await refreshThread();
  }

  async function closeConv() {
    if (!selectedId) return;
    inboxEtag.current = null;
    await fetch(`/api/analyst/conversations/${selectedId}/close`, { method: "POST" });
    await refreshInbox();
    setSelectedId(null);
  }

  async function sendAnalyst() {
    if (!selectedId || !input.trim()) return;
    const content = input.trim();
    setInput("");
    await fetch(`/api/analyst/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    await refreshThread();
  }

  const canCompose =
    threadState === "with_analyst" && selected?.assignedAnalystId === analystId;

  const headerState = threadState || selected?.state || "";
  const stateLabel = STATE_LABELS[headerState] ?? headerState;
  const stateBadgeClass =
    STATE_BADGE_CLASS[headerState] ?? "bg-gray-100 text-gray-700";
  const linkedTicketId = selected?.linkedTicketId;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full" data-analyst-ready="true">
      <aside className="flex w-16 shrink-0 flex-col items-center border-r border-gray-200 bg-gray-900 py-4 text-white">
        <span className="text-xs font-semibold">Nexo</span>
      </aside>

      <aside className="flex w-[380px] shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <p className="font-semibold text-gray-900">Fila</p>
          <p className="text-xs text-gray-500">Olá, {analystName}</p>
          <Input
            className="mt-2 h-8 text-xs"
            placeholder="Buscar na fila…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar na fila"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {(
              [
                ["all", "Todas"],
                ["needs_you", "Precisam de você"],
                ["review", "Revisão sugerida"],
                ["mine", "Minhas"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`rounded-full px-2 py-0.5 text-xs ${filter === key ? "bg-brand-100 text-brand-800" : "bg-gray-100 text-gray-600"}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {filtered.map((item) => (
            <li key={item.conversationId}>
              <button
                type="button"
                data-inbox-state={item.state}
                data-inbox-kind={item.inboxKind}
                data-inbox-review={item.needsReview ? "true" : "false"}
                className={`flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${selectedId === item.conversationId ? "bg-brand-50" : ""}`}
                onClick={() => setSelectedId(item.conversationId)}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
                  {initialsFromName(item.employeeName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900">{item.employeeName}</span>
                    {item.unreadCount > 0 ? (
                      <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {item.unreadCount}
                      </span>
                    ) : null}
                  </span>
                  <p className="line-clamp-2 text-xs text-gray-600">{item.preview}</p>
                  {item.needsReview ? (
                    <span
                      className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${REVIEW_BADGE_CLASS}`}
                      data-review-badge
                    >
                      {REVIEW_BADGE_LABEL}
                      {item.confidenceLast !== null ? ` · ${item.confidenceLast}%` : ""}
                    </span>
                  ) : null}
                  <p className="mt-1 text-xs text-gray-400">
                    {formatRelativeTime(item.updatedAt)}
                  </p>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-gray-50">
        {selected ? (
          <>
            <div
              className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-2"
              data-takeover-bar
              data-thread-state={headerState}
            >
              <span className="text-sm font-medium text-gray-800">
                {selected.employeeName}
              </span>
              {selected.employeeDepartment ? (
                <span className="text-xs text-gray-500">{selected.employeeDepartment}</span>
              ) : null}
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${stateBadgeClass}`}
              >
                {stateLabel}
              </span>
              {selected.needsReview ? (
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${REVIEW_BADGE_CLASS}`}
                  data-review-badge
                >
                  {REVIEW_BADGE_LABEL}
                </span>
              ) : null}
              {linkedTicketId ? (
                <span className="rounded border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                  {linkedTicketId}
                </span>
              ) : null}
              {(selected.state === "awaiting_analyst" || threadState === "awaiting_analyst") &&
              threadState !== "with_analyst" ? (
                <Button type="button" size="sm" onClick={() => void assume()}>
                  Assumir
                </Button>
              ) : null}
              {threadState === "with_analyst" && selected.assignedAnalystId === analystId ? (
                <>
                  <Button type="button" size="sm" variant="outline" onClick={() => void returnToAgent()}>
                    Devolver
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => void closeConv()}>
                    Encerrar
                  </Button>
                </>
              ) : null}
            </div>
            {handoffSummary ? <HandoffSummaryPanel summary={handoffSummary} /> : null}
            {selected.inboxKind === "review" ? (
              <p className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-900" role="status">
                Revisão sugerida: a conversa ainda está com o agent, mas o último turno teve baixa confiança
                ({selected.confidenceLast ?? "—"}%).
              </p>
            ) : null}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-brand-600 text-white"
                      : m.role === "analyst"
                        ? "bg-blue-100 text-blue-900"
                        : "border border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  <MessageContent text={m.content} className="whitespace-pre-wrap" />
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 border-t border-gray-200 bg-white p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void sendAnalyst();
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Mensagem ao funcionário…"
                disabled={!canCompose}
              />
              <Button type="submit" disabled={!canCompose || !input.trim()}>
                Enviar
              </Button>
            </form>
          </>
        ) : (
          <p className="p-8 text-gray-500">Selecione uma conversa na fila.</p>
        )}
      </section>

      <aside
        className="flex w-[340px] shrink-0 flex-col border-l border-gray-200 bg-white"
        data-ticket-panel
      >
        <p className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
          Chamados do funcionário
        </p>
        {ticketSummary ? (
          <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-600">
            Abertos: {ticketSummary.open} · Fechados: {ticketSummary.closed}
          </p>
        ) : null}
        <ul className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
          {tickets.map((t) => {
            const isLinked = linkedTicketId && t.id === linkedTicketId;
            return (
              <li
                key={t.id}
                className={`rounded-lg border p-2 ${
                  isLinked
                    ? "border-brand-400 ring-2 ring-brand-200"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{t.id}</p>
                  {isLinked ? (
                    <span className="text-[10px] font-medium uppercase text-brand-700">
                      Desta conversa
                    </span>
                  ) : null}
                </div>
                <p className="text-gray-600">{t.title}</p>
                <p className="text-xs text-gray-500">{t.statusLabel}</p>
                {t.slaBreached ? (
                  <span className="text-xs font-medium text-red-600">Vencido</span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="border-t border-gray-200 p-3">
          <p className="text-xs font-semibold text-gray-700">Trace do agent</p>
          {traces.map((tr) => (
            <div key={tr.messageId} className="mt-2 rounded border border-gray-100 p-2 text-xs">
              <button
                type="button"
                className="font-medium text-brand-700"
                onClick={() =>
                  setExpandedTrace(expandedTrace === tr.messageId ? null : tr.messageId)
                }
                data-trace-toggle
              >
                {expandedTrace === tr.messageId ? "Ocultar" : "Expandir"} trace
              </button>
              {expandedTrace === tr.messageId ? (
                <div className="mt-2 space-y-1 text-gray-700">
                  <p data-trace-understanding>{tr.trace.understanding}</p>
                  <p>Confiança: {tr.trace.confidence}%</p>
                  {tr.trace.reasoning ? (
                    <p data-trace-reasoning>
                      <span className="font-medium">Por quê:</span> {tr.trace.reasoning}
                    </p>
                  ) : null}
                  <p>Duração: {formatDurationMs(tr.trace.durationMs)}</p>
                  {formatUsage(tr.trace.usage) ? (
                    <p data-trace-usage>Consumo: {formatUsage(tr.trace.usage)}</p>
                  ) : null}
                  {tr.trace.actions.length ? (
                    <div className="flex flex-wrap gap-1">
                      {actionLabels(tr.trace.actions).map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p data-trace-rules>Regras: {ruleLabels(tr.trace.rulesFired).join(", ") || "—"}</p>
                  {tr.trace.evidence?.length ? (
                    <ul className="list-inside list-disc">
                      {tr.trace.evidence.map((e, idx) => (
                        <li key={idx}>
                          {e.type}: {e.id}
                          {e.excerpt ? ` — ${e.excerpt.slice(0, 40)}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {tr.trace.rawToolCalls?.length ? (
                    <p className="text-[10px] text-gray-500">
                      rawToolCalls: {tr.trace.rawToolCalls.join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}