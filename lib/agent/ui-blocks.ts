import type { UiBlock } from "../../src/lib/conversation/types";
import { isDraftSummary, type DraftSummary } from "./draft-types";
import { isFailedResult, type ToolCallRecord } from "./tool-records";

const DRAFT_TOOL_NAMES = new Set(["create_draft", "update_ticket", "reopen_ticket"]);

type TicketLike = {
  id: string;
  title: string;
  statusLabel: string;
  slaBreached: boolean;
  openedAt?: string;
  status?: string;
  description?: string;
  categoryLabel?: string;
  priority?: string;
  lastUpdatedAt?: string;
};

type KbHit = { slug: string; title: string };

function isTicketLike(v: unknown): v is TicketLike {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as TicketLike).id === "string" &&
    typeof (v as TicketLike).title === "string"
  );
}

function ticketCard(t: TicketLike): UiBlock {
  return {
    type: "ticket_card",
    ticketId: t.id,
    title: t.title,
    statusLabel: t.statusLabel,
    slaBreached: t.slaBreached,
    status: t.status,
    description: t.description,
    categoryLabel: t.categoryLabel,
    priority: t.priority,
    openedAt: t.openedAt,
    lastUpdatedAt: t.lastUpdatedAt,
  };
}

function draftCardFromSummary(d: DraftSummary): UiBlock {
  return {
    type: "draft_card",
    draftId: d.draftId,
    operation: d.operation,
    title: d.title,
    priority: d.priority,
    dueAtPreview: d.dueAtPreview,
    affectedScope: d.affectedScope,
    ticketType: d.type,
    category: d.category,
    description: d.description,
  };
}

/**
 * Um turno pode cancelar e recriar rascunho (instrução do agente). Só o último
 * rascunho não cancelado deve aparecer na mensagem.
 */
export function activeDraftCardsFromCalls(calls: ToolCallRecord[]): UiBlock[] {
  const cancelled = new Set<string>();
  for (const call of calls) {
    if (call.name !== "cancel_draft" || call.error) continue;
    const fromArgs = typeof call.args.draftId === "string" ? call.args.draftId : "";
    const fromResult =
      call.result && typeof call.result === "object"
        ? String((call.result as { draftId?: unknown }).draftId ?? "")
        : "";
    const id = fromArgs || fromResult;
    if (id) cancelled.add(id);
  }

  let last: UiBlock | undefined;
  for (const call of calls) {
    if (!DRAFT_TOOL_NAMES.has(call.name) || call.error || isFailedResult(call.result)) continue;
    if (!isDraftSummary(call.result) || cancelled.has(call.result.draftId)) continue;
    last = draftCardFromSummary(call.result);
  }
  return last ? [last] : [];
}

function blocksForCall(call: ToolCallRecord): UiBlock[] {
  if (DRAFT_TOOL_NAMES.has(call.name)) return [];
  if (call.error || isFailedResult(call.result)) return [];
  const result = call.result;

  switch (call.name) {
    case "list_open_tickets": {
      const tickets = (Array.isArray(result) ? result : []).filter(isTicketLike);
      if (tickets.length >= 2) {
        return [
          {
            type: "ticket_selector",
            tickets: tickets.map((t) => ({
              ticketId: t.id,
              title: t.title,
              statusLabel: t.statusLabel,
              openedAt: t.openedAt ?? new Date().toISOString(),
              slaBreached: t.slaBreached,
              status: t.status,
            })),
          },
        ];
      }
      const breached = tickets.find((t) => t.slaBreached);
      return breached ? [ticketCard(breached)] : [];
    }
    case "get_ticket":
      return isTicketLike(result) ? [ticketCard(result)] : [];
    case "search_kb": {
      const hits = (Array.isArray(result) ? result : []) as KbHit[];
      return hits.length > 0
        ? [
            {
              type: "kb_chips",
              articles: hits.map((h) => ({ slug: h.slug, title: h.title })),
            },
          ]
        : [];
    }
    default:
      return [];
  }
}

/**
 * Monta os blocos de UI de forma determinística a partir dos resultados reais das
 * ferramentas (o modelo não inventa cards) mais opções rápidas e a confiança.
 */
export function buildUiBlocks(
  calls: ToolCallRecord[],
  options: { confidence: number; quickReplies?: string[] },
): UiBlock[] {
  const blocks: UiBlock[] = [...calls.flatMap(blocksForCall), ...activeDraftCardsFromCalls(calls)];
  if (options.quickReplies && options.quickReplies.length > 0) {
    blocks.push({ type: "quick_replies", options: options.quickReplies });
  }
  blocks.push({ type: "confidence", value: options.confidence });
  return blocks;
}
