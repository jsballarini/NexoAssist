/** Resultados estruturados de falhas esperadas das ferramentas (nunca exceções para o modelo). */

export const TICKET_LEGACY_UNAVAILABLE_CODE = "TICKET_LEGACY_UNAVAILABLE";
export const TICKET_NOT_IN_YOUR_LIST = "ticket_not_in_your_list";
const DEFAULT_RETRY_AFTER_MS = 3000;
const MAX_MESSAGE_CHARS = 200;

export type DuplicateCandidate = {
  operation: "update" | "reopen";
  targetTicketId: string;
  matchReason: string;
};

export type ToolFailure =
  | { ok: false; code: typeof TICKET_LEGACY_UNAVAILABLE_CODE; retryAfterMs: number; message: string }
  | { ok: false; code: "DRAFT_INVALID"; message: string; fields: string[] }
  | { ok: false; code: "INVALID_STATE"; message: string }
  | { ok: false; code: "DRAFT_INCOMPLETE"; missing: string[]; instruction: string }
  | {
      ok: false;
      code: "DUPLICATE_CANDIDATE";
      duplicate: DuplicateCandidate;
      instruction: string;
    };

/** Chamado inexistente ou de terceiros: mesma resposta para não vazar existência. */
export type TicketNotFoundResult = { found: false; messageKey: typeof TICKET_NOT_IN_YOUR_LIST };

export const TICKET_NOT_FOUND_RESULT: TicketNotFoundResult = {
  found: false,
  messageKey: TICKET_NOT_IN_YOUR_LIST,
};

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "";
}

/**
 * Converte erros conhecidos do ticket-service (por nome, sem importar a implementação)
 * em resultados tratáveis. Erros desconhecidos retornam `undefined` e sobem normalmente.
 */
export function toToolFailure(error: unknown): ToolFailure | TicketNotFoundResult | undefined {
  switch (errorName(error)) {
    case "TicketForbiddenError":
    case "TicketNotFoundError":
      return TICKET_NOT_FOUND_RESULT;
    case "TicketLegacyUnavailableError": {
      const retry = (error as { retryAfterMs?: unknown }).retryAfterMs;
      return {
        ok: false,
        code: TICKET_LEGACY_UNAVAILABLE_CODE,
        retryAfterMs: typeof retry === "number" ? retry : DEFAULT_RETRY_AFTER_MS,
        message: "Sistema de chamados temporariamente indisponível",
      };
    }
    case "DraftInvalidError": {
      const fields = (error as { fields?: unknown }).fields;
      return {
        ok: false,
        code: "DRAFT_INVALID",
        message: (error as Error).message.slice(0, MAX_MESSAGE_CHARS),
        fields: Array.isArray(fields) ? fields.map(String) : [],
      };
    }
    case "TicketInvalidStateError":
      return {
        ok: false,
        code: "INVALID_STATE",
        message: (error as Error).message.slice(0, MAX_MESSAGE_CHARS),
      };
    default:
      return undefined;
  }
}

export function isNotFoundResult(result: unknown): result is TicketNotFoundResult {
  return !!result && typeof result === "object" && (result as { found?: unknown }).found === false;
}

export function isToolFailure(result: unknown): result is ToolFailure {
  return !!result && typeof result === "object" && (result as { ok?: unknown }).ok === false;
}
