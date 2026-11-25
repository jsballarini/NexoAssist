import { affectedScopeLabel, ticketCategoryLabel, ticketTypeLabel } from "../../src/lib/domain/ticket-labels";
import { isDraftSummary } from "./draft-types";
import { isFailedResult, type ToolCallRecord } from "./tool-records";
import { isToolFailure } from "./tool-results";

const LOOKUP_TOOLS = new Set([
  "list_open_tickets",
  "list_recent_resolved",
  "get_ticket",
  "search_kb",
]);

const SCOPE_QUICK_REPLIES = [
  affectedScopeLabel.only_me,
  "Equipe (5–20)",
  affectedScopeLabel.organization,
];

const URGENCY_QUICK_REPLIES = [
  "Sem pressa",
  "Tem alternativa",
  "Preciso resolver hoje",
  "Trabalho parado",
];

export const DUPLICATE_COLLECTION_QUICK_REPLIES = [
  "Sim, é o mesmo problema",
  "Não, é um problema novo",
];

const CATEGORY_QUICK_REPLIES = (
  Object.keys(ticketCategoryLabel) as (keyof typeof ticketCategoryLabel)[]
).map((key) => ticketCategoryLabel[key]);

const TYPE_QUICK_REPLIES = [ticketTypeLabel.INC, ticketTypeLabel.REQ];

/** Opções de botão para um campo de coleta de rascunho (uma pergunta por vez). */
export function quickRepliesForMissingField(field: string): string[] | undefined {
  switch (field) {
    case "category":
      return CATEGORY_QUICK_REPLIES;
    case "type":
      return TYPE_QUICK_REPLIES;
    case "affectedScope":
      return SCOPE_QUICK_REPLIES;
    case "urgency":
      return URGENCY_QUICK_REPLIES;
    default:
      return undefined;
  }
}

/** `null` = não há create_draft relevante; use heurística de texto. */
function inferFromCreateDraftCalls(calls: ToolCallRecord[]): string[] | null {
  for (let i = calls.length - 1; i >= 0; i--) {
    const call = calls[i];
    if (call.name !== "create_draft" || call.error) continue;
    const result = call.result;
    if (isDraftSummary(result)) return [];
    if (!isToolFailure(result)) continue;
    if (result.code === "DUPLICATE_CANDIDATE") return DUPLICATE_COLLECTION_QUICK_REPLIES;
    if (result.code === "DRAFT_INCOMPLETE" && result.missing.length > 0) {
      return quickRepliesForMissingField(result.missing[0]) ?? [];
    }
  }
  return null;
}

function turnWasLookupOnly(calls: ToolCallRecord[]): boolean {
  let lookup = false;
  let draftFlow = false;
  for (const call of calls) {
    if (call.error) continue;
    if (call.name === "create_draft") draftFlow = true;
    if (LOOKUP_TOOLS.has(call.name) && !isFailedResult(call.result)) lookup = true;
  }
  return lookup && !draftFlow;
}

/** Trecho final da resposta: onde costuma estar a pergunta ao funcionário. */
function questionTail(content: string): string {
  const lines = content.trim().split(/\n+/);
  return lines.slice(-2).join(" ").toLowerCase();
}

function endsWithQuestion(content: string): boolean {
  const trimmed = content.trim();
  const tail = questionTail(content);
  return /\?\s*$/.test(trimmed) || /\?\s*$/.test(tail);
}

/**
 * Fallback raro: o modelo fez pergunta de coleta no texto mas não chamou create_draft.
 * Ignora menções informativas (ex.: "Urgência: alta" em detalhes de chamado).
 */
export function inferQuickRepliesFromContent(content: string): string[] | undefined {
  if (!endsWithQuestion(content)) return undefined;
  const tail = questionTail(content);

  if (/qual\s+(é\s+)?a\s+categor|qual\s+categoria|que\s+categoria/.test(tail)) {
    return CATEGORY_QUICK_REPLIES;
  }
  if (/qual\s+(é\s+)?o\s+tipo|incidente\s+ou\s+requisi|inc\s+ou\s+req/.test(tail)) {
    return TYPE_QUICK_REPLIES;
  }
  if (/quem\s+(é|e)\s+afetado|qual\s+o\s+impacto|quantas\s+pessoas/.test(tail)) {
    return SCOPE_QUICK_REPLIES;
  }
  if (
    /qual\s+(é\s+)?a\s+urgência|qual\s+o\s+nível\s+de\s+urgência|como\s+está\s+a\s+urgência/.test(
      tail,
    )
  ) {
    return URGENCY_QUICK_REPLIES;
  }
  if (/mesmo\s+problema|problema\s+novo|é\s+o\s+mesmo/.test(tail)) {
    return DUPLICATE_COLLECTION_QUICK_REPLIES;
  }
  return undefined;
}

/**
 * Botões de resposta rápida para coleta de chamado: prioriza falhas de create_draft,
 * depois padrões no texto da resposta do assistente.
 */
export function inferCollectionQuickReplies(
  calls: ToolCallRecord[],
  content: string,
): string[] {
  const fromCalls = inferFromCreateDraftCalls(calls);
  if (fromCalls !== null) return fromCalls;
  if (turnWasLookupOnly(calls)) return [];
  return inferQuickRepliesFromContent(content) ?? [];
}