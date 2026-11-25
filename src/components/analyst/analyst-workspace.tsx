"use client";

import { countByFilter, filterInbox, type InboxFilter } from "@/lib/analyst/inbox-view";
import type { InboxItem } from "@/lib/analyst/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnalystRail } from "./analyst-rail";
import { HandoffSummaryPanel, type HandoffSummaryView } from "./handoff-summary-panel";
import { InboxPanel } from "./inbox-panel";
import { AnalystComposer, TakeoverBar } from "./takeover-bar";
import { ThreadHeader } from "./thread-header";
import { ThreadMessages } from "./thread-messages";
import { TicketsPanel } from "./tickets-panel";
import type { PanelTicket, ThreadMessage, TicketCounts, TraceItem } from "./types";

type PollConfig = {
  inboxIntervalMs: number;
  inboxBackgroundMs: number;
  threadIntervalMs: number;
};

/** Console do atendente (Conversas 1/2): fila, conversa, takeover e painel de chamados/trace. */
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
  const [openTickets, setOpenTickets] = useState<PanelTicket[]>([]);
  const [resolvedTickets, setResolvedTickets] = useState<PanelTicket[]>([]);
  const [ticketCounts, setTicketCounts] = useState<TicketCounts | null>(null);
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const inboxEtag = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const employeeRef = useRef<string | null>(null);

  // Respostas atrasadas de uma seleção anterior não podem sobrescrever a atual.
  useEffect(() => {
    selectedRef.current = selectedId;
    setMessages([]);
    setTraces([]);
    setHandoffSummary(null);
    setThreadState("");
    setEmployeeId(null);
  }, [selectedId]);

  useEffect(() => {
    employeeRef.current = employeeId;
    setOpenTickets([]);
    setResolvedTickets([]);
    setTicketCounts(null);
  }, [employeeId]);

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
    const convId = selectedId;
    if (!convId) return;
    const res = await fetch(`/api/analyst/conversations/${convId}/messages`);
    if (!res.ok || selectedRef.current !== convId) return;
    const data = (await res.json()) as {
      messages: ThreadMessage[];
      state: string;
      employeeId: string;
      handoffSummary?: HandoffSummaryView | null;
    };
    if (selectedRef.current !== convId) return;
    setHandoffSummary(data.handoffSummary ?? null);
    setMessages(data.messages);
    setThreadState(data.state);
    setEmployeeId(data.employeeId);

    const tRes = await fetch(`/api/analyst/conversations/${convId}/traces`);
    if (!tRes.ok || selectedRef.current !== convId) return;
    const tData = (await tRes.json()) as { items: TraceItem[] };
    if (selectedRef.current === convId) setTraces(tData.items);
  }, [selectedId]);

  const refreshTickets = useCallback(async () => {
    const empId = employeeId;
    if (!empId) return;
    const res = await fetch(`/api/analyst/employees/${empId}/tickets`);
    if (!res.ok || employeeRef.current !== empId) return;
    const data = (await res.json()) as {
      items: PanelTicket[];
      resolved?: PanelTicket[];
      summary?: TicketCounts;
    };
    if (employeeRef.current !== empId) return;
    setOpenTickets(data.items);
    setResolvedTickets(data.resolved ?? []);
    setTicketCounts(data.summary ?? null);
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
  const filtered = useMemo(
    () => filterInbox(items, filter, search, analystId),
    [items, filter, search, analystId],
  );
  const counts = useMemo(() => countByFilter(items, analystId), [items, analystId]);

  async function runAction(path: string) {
    if (!selectedId) return;
    inboxEtag.current = null;
    await fetch(`/api/analyst/conversations/${selectedId}/${path}`, { method: "POST" });
    await refreshInbox();
  }

  async function assume() {
    await runAction("assume");
    await refreshThread();
  }

  async function returnToAgent() {
    await runAction("return-to-agent");
    await refreshThread();
  }

  async function closeConv() {
    await runAction("close");
    setSelectedId(null);
  }

  async function sendAnalyst(content: string) {
    if (!selectedId) return;
    await fetch(`/api/analyst/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    await refreshThread();
  }

  const headerState = threadState || selected?.state || "";
  const isMine = selected?.assignedAnalystId === analystId;
  const canCompose = threadState === "with_analyst" && isMine;
  const awaiting = headerState === "awaiting_analyst";

  return (
    <div className="flex h-full min-h-0 w-full bg-white" data-analyst-ready="true">
      <AnalystRail analystName={analystName} waitingCount={counts.for_you} />
      <InboxPanel
        items={filtered}
        counts={counts}
        analystId={analystId}
        selectedId={selectedId}
        filter={filter}
        search={search}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        onSelect={setSelectedId}
      />

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            <ThreadHeader
              item={selected}
              state={headerState}
              isMine={isMine}
              panelOpen={panelOpen}
              onReturn={() => void returnToAgent()}
              onClose={() => void closeConv()}
              onTogglePanel={() => setPanelOpen(true)}
            />
            {handoffSummary ? <HandoffSummaryPanel summary={handoffSummary} /> : null}
            {selected.inboxKind === "review" ? (
              <p
                className="border-b border-nexo-rule bg-nexo-warning-soft px-5 py-2 text-xs text-nexo-warning-text"
                role="status"
              >
                Revisão sugerida: a conversa ainda está com o agent, mas o último turno teve baixa confiança (
                {selected.confidenceLast ?? "—"}%).
              </p>
            ) : null}
            <ThreadMessages messages={messages} />
            {awaiting ? (
              <TakeoverBar
                employeeName={selected.employeeName}
                waitingSince={selected.updatedAt}
                onAssume={() => void assume()}
              />
            ) : null}
            <AnalystComposer enabled={canCompose} onSend={sendAnalyst} />
          </>
        ) : (
          <p className="flex flex-1 items-center justify-center bg-nexo-desk text-sm text-nexo-ink-3">
            Selecione uma conversa na fila.
          </p>
        )}
      </section>

      {selected && panelOpen ? (
        <TicketsPanel
          key={selected.conversationId}
          employeeName={selected.employeeName}
          linkedTicketId={selected.linkedTicketId}
          state={headerState}
          assignedAnalystName={selected.assignedAnalystName}
          updatedAt={selected.updatedAt}
          openTickets={openTickets}
          resolvedTickets={resolvedTickets}
          counts={ticketCounts}
          traces={traces}
          onClose={() => setPanelOpen(false)}
        />
      ) : null}
    </div>
  );
}
