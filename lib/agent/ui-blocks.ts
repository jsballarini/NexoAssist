import type { UiBlock } from "../../src/lib/conversation/types";
import type { DraftSummary } from "./draft-types";
import { isFailedResult, type ToolCallRecord } from "./tool-records";

type TicketLike = {
  id: string;
  title: string;
  statusLabel: string;
  slaBreached: boolean;
  openedAt?: string;
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
  };
}

function blocksForCall(call: ToolCallRecord): UiBlock[] {
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
    case "create_draft":
    case "update_ticket":
    case "reopen_ticket": {
      const d = result as DraftSummary | undefined;
      if (!d?.draftId) return [];
      return [
        {
          type: "draft_card",
          draftId: d.draftId,
          operation: d.operation,
          title: d.title,
          priority: d.priority,
          dueAtPreview: d.dueAtPreview,
          affectedScope: d.affectedScope,
        },
      ];
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
  const blocks: UiBlock[] = calls.flatMap(blocksForCall);
  if (options.quickReplies && options.quickReplies.length > 0) {
    blocks.push({ type: "quick_replies", options: options.quickReplies });
  }
  blocks.push({ type: "confidence", value: options.confidence });
  return blocks;
}
