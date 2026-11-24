"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useRef, useState } from "react";
import type { InboxItem } from "@/lib/analyst/types";

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
  };
};

type TicketItem = {
  id: string;
  title: string;
  statusLabel: string;
  slaBreached: boolean;
};

type Filter = "all" | "needs_you" | "with_agent" | "mine";

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
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
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
    };
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
    const data = (await res.json()) as { items: TicketItem[] };
    setTickets(data.items);
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

  const filtered = items.filter((i) => {
    if (filter === "needs_you") return i.state === "awaiting_analyst";
    if (filter === "with_agent") return i.state === "with_agent";
    if (filter === "mine") return i.assignedAnalystId === analystId;
    return true;
  });

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

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full" data-analyst-ready="true">
      <aside className="flex w-16 shrink-0 flex-col items-center border-r border-gray-200 bg-gray-900 py-4 text-white">
        <span className="text-xs font-semibold">Nexo</span>
      </aside>

      <aside className="flex w-[380px] shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <p className="font-semibold text-gray-900">Fila</p>
          <p className="text-xs text-gray-500">Olá, {analystName}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(
              [
                ["all", "Todas"],
                ["needs_you", "Precisam de você"],
                ["with_agent", "Com o agent"],
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
                className={`w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${selectedId === item.conversationId ? "bg-brand-50" : ""}`}
                onClick={() => setSelectedId(item.conversationId)}
              >
                <p className="font-medium text-gray-900">{item.employeeName}</p>
                <p className="line-clamp-2 text-xs text-gray-600">{item.preview}</p>
                <p className="mt-1 text-xs text-gray-400">{item.state}</p>
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
            >
              <span className="text-sm font-medium text-gray-800">
                {selected.employeeName}
              </span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{threadState}</span>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-brand-600 text-white"
                      : m.role === "analyst"
                        ? "bg-blue-100 text-blue-900"
                        : "bg-white border border-gray-200 text-gray-800"
                  }`}
                >
                  {m.content}
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
        <ul className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
          {tickets.map((t) => (
            <li key={t.id} className="rounded-lg border border-gray-200 p-2">
              <p className="font-medium">{t.id}</p>
              <p className="text-gray-600">{t.title}</p>
              <p className="text-xs text-gray-500">{t.statusLabel}</p>
              {t.slaBreached ? (
                <span className="text-xs font-medium text-red-600">Vencido</span>
              ) : null}
            </li>
          ))}
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
                <p className="mt-1 text-gray-700" data-trace-understanding>
                  {tr.trace.understanding}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}