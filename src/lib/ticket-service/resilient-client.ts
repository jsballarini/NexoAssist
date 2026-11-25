import { TicketLegacyUnavailableError } from "./errors";
import type { TicketServiceClient } from "./client";

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = [1000, 2000, 4000];
/** Teto de espera acumulada de retries por cliente (um cliente por turno do agent). */
const DEFAULT_TURN_BUDGET_MS = 6000;

export type ResilienceOptions = {
  /** Total de tentativas por chamada (inclui a primeira). */
  attempts: number;
  /** Espera antes de cada nova tentativa; o último valor se repete. */
  backoffMs: number[];
  /** Espera total máxima de retries somando todas as chamadas do cliente. */
  turnBudgetMs: number;
  sleep: (ms: number) => Promise<void>;
};

/** Métodos que o agent usa; `confirmDraft`/`findPendingDraft` ficam fora (fluxo HTTP). */
export type ResilientMethods = Pick<
  TicketServiceClient,
  "listOpen" | "listRecentResolved" | "getById" | "createDraft" | "cancelDraft" | "transfer"
>;

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function parseBackoff(raw: string | undefined): number[] {
  if (!raw) return DEFAULT_BACKOFF_MS;
  const values = raw
    .split(",")
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((v) => Number.isFinite(v) && v >= 0);
  return values.length > 0 ? values : DEFAULT_BACKOFF_MS;
}

/** Lê `TICKET_RETRY_ATTEMPTS`, `TICKET_RETRY_BACKOFF_MS` (lista) e `TICKET_RETRY_TURN_BUDGET_MS`. */
export function readResilienceOptions(env: Record<string, string | undefined> = process.env): ResilienceOptions {
  return {
    attempts: Math.max(1, readPositiveInt(env.TICKET_RETRY_ATTEMPTS, DEFAULT_ATTEMPTS)),
    backoffMs: parseBackoff(env.TICKET_RETRY_BACKOFF_MS),
    turnBudgetMs: readPositiveInt(env.TICKET_RETRY_TURN_BUDGET_MS, DEFAULT_TURN_BUDGET_MS),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

/**
 * Decora o cliente de chamados com retry/backoff para indisponibilidade do legado
 * (`TicketLegacyUnavailableError`). Outros erros passam direto. Quando as tentativas ou o
 * orçamento do turno se esgotam, o erro original é relançado para o agent responder com
 * mensagem amigável. Usado só pelo agent: a API HTTP mantém o 503 imediato.
 */
export function createResilientTicketClient(
  inner: ResilientMethods,
  options: Partial<ResilienceOptions> = {},
): ResilientMethods {
  const config = { ...readResilienceOptions(), ...options };
  let spentMs = 0;

  async function withRetry<T>(call: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await call();
      } catch (error) {
        if (!(error instanceof TicketLegacyUnavailableError) || attempt >= config.attempts) {
          throw error;
        }
        const delay = config.backoffMs[Math.min(attempt - 1, config.backoffMs.length - 1)];
        if (spentMs + delay > config.turnBudgetMs) throw error;
        spentMs += delay;
        await config.sleep(delay);
      }
    }
  }

  return {
    listOpen: (requesterId) => withRetry(() => inner.listOpen(requesterId)),
    listRecentResolved: (requesterId, withinDays) =>
      withRetry(() => inner.listRecentResolved(requesterId, withinDays)),
    getById: (requesterId, publicId) => withRetry(() => inner.getById(requesterId, publicId)),
    createDraft: (requesterId, operation, payload) =>
      withRetry(() => inner.createDraft(requesterId, operation, payload)),
    cancelDraft: (requesterId, draftId) => withRetry(() => inner.cancelDraft(requesterId, draftId)),
    transfer: (requesterId, publicId, reason) =>
      withRetry(() => inner.transfer(requesterId, publicId, reason)),
  };
}
