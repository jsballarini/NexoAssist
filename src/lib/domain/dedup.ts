import type { DraftOperation } from "@prisma/client";

export type DedupTicketRef = {
  id: string;
  title: string;
};

export type DedupResolution = {
  operation: DraftOperation;
  targetTicketId?: string;
};

function tokens(hint: string): string[] {
  return hint
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3);
}

function matchesHint(ticketTitle: string, hint: string): boolean {
  const title = ticketTitle.toLowerCase();
  const hintLower = hint.toLowerCase();
  if (title.includes(hintLower) || hintLower.includes(title.slice(0, 12))) {
    return true;
  }
  const toks = tokens(hint);
  if (toks.length === 0) return false;
  const hits = toks.filter((t) => title.includes(t));
  return hits.length >= Math.min(2, toks.length);
}

/**
 * Regra Anexo A (MVP): aberto equivalente → update; resolvido ≤7d → reopen; senão create.
 */
export function resolveDraftOperation(
  problemHint: string,
  openTickets: DedupTicketRef[],
  recentResolved: DedupTicketRef[],
): DedupResolution {
  const open = openTickets.find((t) => matchesHint(t.title, problemHint));
  if (open) {
    return { operation: "update", targetTicketId: open.id };
  }
  const resolved = recentResolved.find((t) => matchesHint(t.title, problemHint));
  if (resolved) {
    return { operation: "reopen", targetTicketId: resolved.id };
  }
  return { operation: "create" };
}