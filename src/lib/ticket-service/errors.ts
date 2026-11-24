export const TICKET_LEGACY_UNAVAILABLE = "TICKET_LEGACY_UNAVAILABLE";

export class TicketLegacyUnavailableError extends Error {
  readonly code = TICKET_LEGACY_UNAVAILABLE;
  readonly retryAfterMs: number;

  constructor(retryAfterMs = 3000) {
    super("Sistema de chamados temporariamente indisponível");
    this.name = "TicketLegacyUnavailableError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class TicketForbiddenError extends Error {
  constructor(message = "Acesso negado ao chamado") {
    super(message);
    this.name = "TicketForbiddenError";
  }
}

export class TicketNotFoundError extends Error {
  constructor(message = "Chamado não encontrado") {
    super(message);
    this.name = "TicketNotFoundError";
  }
}

export class TicketNotImplementedError extends Error {
  constructor(method: string) {
    super(`${method} não implementado (F4)`);
    this.name = "TicketNotImplementedError";
  }
}