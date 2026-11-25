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

export class TicketInvalidStateError extends Error {
  constructor(message = "Operação inválida para o estado atual do chamado") {
    super(message);
    this.name = "TicketInvalidStateError";
  }
}

export class TicketNotImplementedError extends Error {
  constructor(method: string) {
    super(`${method} não implementado (F4)`);
    this.name = "TicketNotImplementedError";
  }
}

export class DraftNotFoundError extends Error {
  constructor() {
    super("Rascunho não encontrado");
    this.name = "DraftNotFoundError";
  }
}

export class DraftExpiredError extends Error {
  constructor() {
    super("Rascunho expirado");
    this.name = "DraftExpiredError";
  }
}

export class DraftInvalidError extends Error {
  /** Campos obrigatórios ausentes ou inválidos (quando a falha é de validação). */
  readonly fields: string[];

  constructor(message: string, fields: string[] = []) {
    super(message);
    this.name = "DraftInvalidError";
    this.fields = fields;
  }
}