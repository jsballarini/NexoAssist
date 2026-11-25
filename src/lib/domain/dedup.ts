import type { DraftOperation, TicketCategory } from "@prisma/client";

export type DedupTicketRef = {
  id: string;
  title: string;
  category?: TicketCategory | string;
  description?: string;
};

export type DedupResolution = {
  operation: DraftOperation;
  targetTicketId?: string;
};

/** Palavras/tópicos que isolados já indicam o mesmo assunto de TI. */
const TOPIC_KEYWORDS = [
  "vpn",
  "sharepoint",
  "sap",
  "outlook",
  "e-mail",
  "email",
  "notebook",
  "laptop",
  "impressora",
  "wifi",
  "wi-fi",
  "rede",
  "senha",
  "acesso",
  "teams",
  "onedrive",
  "809",
  "monitor",
  "teclado",
  "mouse",
] as const;

export function buildProblemHint(
  title?: string | null,
  description?: string | null,
): string {
  return [title?.trim(), description?.trim()].filter(Boolean).join(" — ");
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function tokens(hint: string): string[] {
  return normalize(hint)
    .split(/\W+/)
    .filter((t) => t.length > 3);
}

function significantKeywords(text: string): string[] {
  const n = normalize(text);
  const topics = TOPIC_KEYWORDS.filter((k) => n.includes(k));
  const toks = tokens(text);
  return [...new Set([...topics, ...toks])];
}

function ticketHaystack(ticket: DedupTicketRef): string {
  return normalize(`${ticket.title} ${ticket.description ?? ""}`);
}

function matchesHint(
  ticket: DedupTicketRef,
  hint: string,
  problemCategory?: string,
): boolean {
  const haystack = ticketHaystack(ticket);
  const hintNorm = normalize(hint);
  if (haystack.includes(hintNorm) || hintNorm.includes(normalize(ticket.title).slice(0, 20))) {
    return true;
  }

  const hintKw = significantKeywords(hint);
  const ticketKw = significantKeywords(haystack);
  if (hintKw.length === 0) return false;

  const shared = hintKw.filter((k) => ticketKw.includes(k));
  if (shared.some((k) => TOPIC_KEYWORDS.includes(k as (typeof TOPIC_KEYWORDS)[number]))) {
    return true;
  }

  if (shared.length >= Math.min(2, hintKw.length)) {
    return true;
  }

  if (
    problemCategory &&
    ticket.category &&
    problemCategory === ticket.category &&
    shared.length >= 1
  ) {
    return true;
  }

  return false;
}

function pickBest(
  candidates: DedupTicketRef[],
  hint: string,
  category?: string,
): DedupTicketRef | undefined {
  return candidates.find((t) => matchesHint(t, hint, category));
}

/**
 * Regra Anexo A (MVP): aberto equivalente → update; resolvido ≤7d → reopen; senão create.
 * Compara título, descrição e categoria com heurística de palavras-chave.
 */
export function resolveDraftOperation(
  problemHint: string,
  openTickets: DedupTicketRef[],
  recentResolved: DedupTicketRef[],
  problemCategory?: string,
): DedupResolution {
  const hint = problemHint.trim();
  if (hint.length < 3) return { operation: "create" };

  const open = pickBest(openTickets, hint, problemCategory);
  if (open) {
    return { operation: "update", targetTicketId: open.id };
  }
  const resolved = pickBest(recentResolved, hint, problemCategory);
  if (resolved) {
    return { operation: "reopen", targetTicketId: resolved.id };
  }
  return { operation: "create" };
}