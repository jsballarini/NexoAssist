import { TicketLegacyUnavailableError } from "@/lib/ticket-service";
import { NextResponse } from "next/server";

export function ticketErrorToResponse(error: unknown): NextResponse | null {
  if (error instanceof TicketLegacyUnavailableError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        retryAfterMs: error.retryAfterMs,
      },
      { status: 503 },
    );
  }
  return null;
}