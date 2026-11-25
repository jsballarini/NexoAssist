const TICKET_PATTERN = /\b(?:INC|REQ)-\d+/;

type EvidenceItem = { type: string; id: string; excerpt?: string };

/**
 * Ticket público vinculado à conversa (heurística da fila). Prioridade: chamado
 * citado no resumo do handoff, última evidência `ticket` do agent, ID no texto.
 */
export function extractLinkedTicketId(
  evidence: unknown,
  content?: string,
  handoffTicketIds?: readonly string[],
): string | undefined {
  const fromHandoff = handoffTicketIds?.find(Boolean);
  if (fromHandoff) return fromHandoff;
  const list = Array.isArray(evidence) ? (evidence as EvidenceItem[]) : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (e.type === "ticket" && e.id) return e.id;
  }
  if (content) {
    const match = content.match(TICKET_PATTERN);
    if (match) return match[0];
  }
  return undefined;
}
