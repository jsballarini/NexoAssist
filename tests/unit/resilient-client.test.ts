import { describe, expect, it, vi } from "vitest";
import {
  createResilientTicketClient,
  readResilienceOptions,
  type ResilientMethods,
} from "../../src/lib/ticket-service/resilient-client";
import { TicketForbiddenError, TicketLegacyUnavailableError } from "../../src/lib/ticket-service/errors";

function innerWith(listOpen: ResilientMethods["listOpen"]): ResilientMethods {
  return { listOpen } as unknown as ResilientMethods;
}

describe("createResilientTicketClient (G2-RS-01)", () => {
  it("repete após 503 e devolve o resultado quando o legado volta", async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const listOpen = vi
      .fn()
      .mockRejectedValueOnce(new TicketLegacyUnavailableError())
      .mockResolvedValueOnce([{ id: "INC-1" }]);
    const client = createResilientTicketClient(innerWith(listOpen), {
      attempts: 3,
      backoffMs: [10, 20],
      turnBudgetMs: 1000,
      sleep,
    });

    await expect(client.listOpen("u1")).resolves.toEqual([{ id: "INC-1" }]);
    expect(listOpen).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it("esgota as tentativas, respeita o backoff e relança o erro original", async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const listOpen = vi.fn().mockRejectedValue(new TicketLegacyUnavailableError());
    const client = createResilientTicketClient(innerWith(listOpen), {
      attempts: 3,
      backoffMs: [10, 20],
      turnBudgetMs: 1000,
      sleep,
    });

    await expect(client.listOpen("u1")).rejects.toBeInstanceOf(TicketLegacyUnavailableError);
    expect(listOpen).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([10, 20]);
  });

  it("o teto por turno limita a espera acumulada entre chamadas", async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const listOpen = vi.fn().mockRejectedValue(new TicketLegacyUnavailableError());
    const client = createResilientTicketClient(innerWith(listOpen), {
      attempts: 3,
      backoffMs: [60],
      turnBudgetMs: 100,
      sleep,
    });

    await expect(client.listOpen("u1")).rejects.toBeInstanceOf(TicketLegacyUnavailableError);
    await expect(client.listOpen("u1")).rejects.toBeInstanceOf(TicketLegacyUnavailableError);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("não repete erros que não são indisponibilidade", async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const listOpen = vi.fn().mockRejectedValue(new TicketForbiddenError());
    const client = createResilientTicketClient(innerWith(listOpen), { sleep });

    await expect(client.listOpen("u1")).rejects.toBeInstanceOf(TicketForbiddenError);
    expect(listOpen).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe("readResilienceOptions", () => {
  it("lê as variáveis de ambiente e aplica defaults seguros", () => {
    const parsed = readResilienceOptions({
      TICKET_RETRY_ATTEMPTS: "2",
      TICKET_RETRY_BACKOFF_MS: "5, 15",
      TICKET_RETRY_TURN_BUDGET_MS: "50",
    });
    expect(parsed).toMatchObject({ attempts: 2, backoffMs: [5, 15], turnBudgetMs: 50 });

    const defaults = readResilienceOptions({});
    expect(defaults.attempts).toBe(3);
    expect(defaults.backoffMs).toEqual([1000, 2000, 4000]);
  });
});
