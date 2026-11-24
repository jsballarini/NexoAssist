import { TICKET_LEGACY_UNAVAILABLE } from "./errors";

export type TicketErrorResponse = {
  error: string;
  code: string;
  retryAfterMs: number;
};

export const CHAOS_ERROR_BODY: TicketErrorResponse = {
  error: "Sistema de chamados temporariamente indisponível",
  code: TICKET_LEGACY_UNAVAILABLE,
  retryAfterMs: 3000,
};

const BACKOFF_MS = [1000, 2000, 4000];

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export async function fetchWithTicketRetry(
  url: string,
  init: RequestInit | undefined,
  fetchFn: FetchFn,
  maxAttempts = 3,
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastResponse = await fetchFn(url, init);
    if (lastResponse.status !== 503) {
      return lastResponse;
    }
    const delay = BACKOFF_MS[attempt] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
    await new Promise((r) => setTimeout(r, delay));
  }

  return lastResponse!;
}