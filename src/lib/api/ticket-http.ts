import {
  DraftExpiredError,
  DraftInvalidError,
  DraftNotFoundError,
  TicketForbiddenError,
  TicketLegacyUnavailableError,
  TicketNotFoundError,
} from "@/lib/ticket-service";
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
  if (error instanceof TicketNotFoundError || error instanceof DraftNotFoundError) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
  if (error instanceof TicketForbiddenError) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
  if (error instanceof DraftExpiredError || error instanceof DraftInvalidError) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
  return null;
}