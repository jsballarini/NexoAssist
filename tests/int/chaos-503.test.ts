import {
  CHAOS_ERROR_BODY,
  fetchWithTicketRetry,
} from "@/lib/ticket-service/retry";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("INT-503-01", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("chaos rate 1.0 → retries e corpo de erro estável", async () => {
    const fetchFn = vi.fn();
    fetchFn.mockResolvedValue(
      new Response(JSON.stringify(CHAOS_ERROR_BODY), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const resPromise = fetchWithTicketRetry(
      "/api/tickets",
      { method: "GET" },
      fetchFn,
      3,
    );
    await vi.runAllTimersAsync();
    const res = await resPromise;

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual(CHAOS_ERROR_BODY);
  });
});