const INC_PATTERN = /INC-\d+/;

type EvidenceItem = { type: string; id: string; excerpt?: string };

/** Ticket público vinculado a partir de evidence ou texto (heurística inbox). */
export function extractLinkedTicketId(
  evidence: unknown,
  content?: string,
): string | undefined {
  const list = Array.isArray(evidence) ? (evidence as EvidenceItem[]) : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (e.type === "ticket" && e.id) return e.id;
  }
  if (content) {
    const match = content.match(INC_PATTERN);
    if (match) return match[0];
  }
  return undefined;
}