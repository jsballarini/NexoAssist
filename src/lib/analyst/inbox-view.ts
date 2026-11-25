import type { InboxItem } from "./types";

/** Filtros da fila (protótipo): Todas, Para você, Com o agent, Minhas. */
export type InboxFilter = "all" | "for_you" | "with_agent" | "mine";

export const INBOX_FILTERS: readonly { key: InboxFilter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "for_you", label: "Para você" },
  { key: "with_agent", label: "Com o agent" },
  { key: "mine", label: "Minhas" },
];

/** Tom do ponto colorido da linha de contexto de um item. */
export type InboxContextTone = "danger" | "warning" | "info" | "success" | "neutral";

/**
 * "Para você" = aguardando analista; "Com o agent" = agent sem segurança (revisão
 * sugerida, baixa confiança); "Minhas" = atribuídas ao analista logado.
 */
export function matchesFilter(item: InboxItem, filter: InboxFilter, analystId: string): boolean {
  switch (filter) {
    case "for_you":
      return item.state === "awaiting_analyst";
    case "with_agent":
      return item.needsReview;
    case "mine":
      return item.assignedAnalystId === analystId;
    default:
      return true;
  }
}

/** Busca por nome, prévia ou chamado vinculado (case-insensitive). */
export function matchesQuery(item: InboxItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.employeeName, item.preview, item.linkedTicketId ?? ""].some((v) =>
    v.toLowerCase().includes(q),
  );
}

export function filterInbox(
  items: InboxItem[],
  filter: InboxFilter,
  query: string,
  analystId: string,
): InboxItem[] {
  return items.filter((i) => matchesFilter(i, filter, analystId) && matchesQuery(i, query));
}

/** Contagem por filtro para os chips (ignora a busca). */
export function countByFilter(items: InboxItem[], analystId: string): Record<InboxFilter, number> {
  const counts: Record<InboxFilter, number> = { all: 0, for_you: 0, with_agent: 0, mine: 0 };
  for (const item of items) {
    for (const { key } of INBOX_FILTERS) {
      if (matchesFilter(item, key, analystId)) counts[key] += 1;
    }
  }
  return counts;
}

/** Linha de contexto abaixo da prévia ("Transferida · INC-20311", "Você está atendendo"…). */
export function inboxContext(
  item: InboxItem,
  analystId: string,
): { tone: InboxContextTone; label: string } {
  if (item.state === "awaiting_analyst") {
    return {
      tone: "danger",
      label: item.linkedTicketId ? `Transferida · ${item.linkedTicketId}` : "Transferida",
    };
  }
  if (item.state === "with_analyst") {
    if (item.assignedAnalystId === analystId) return { tone: "info", label: "Você está atendendo" };
    return { tone: "info", label: `${item.assignedAnalystName ?? "Analista"} atendendo` };
  }
  if (item.needsReview) {
    const confidence = item.confidenceLast !== null ? ` · confiança ${item.confidenceLast}%` : "";
    return { tone: "warning", label: `Agent pediu ajuda${confidence}` };
  }
  return { tone: "success", label: "Agent atendendo" };
}

/** Prefixo da prévia conforme o autor da última mensagem. */
export function previewPrefix(item: InboxItem): string {
  if (item.previewRole === "assistant") return "Nexo: ";
  if (item.previewRole === "analyst") return "Você: ";
  return "";
}

/** Primeiro nome para títulos curtos ("Chamados da Ana"). */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
