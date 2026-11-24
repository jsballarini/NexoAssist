import { getSession } from "@/lib/auth/session";
import { ticketErrorToResponse } from "@/lib/api/ticket-http";
import {
  createTicketServiceClient,
  TicketForbiddenError,
} from "@/lib/ticket-service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "employee") {
    return NextResponse.json({ items: [] });
  }

  const scope = request.nextUrl.searchParams.get("scope") ?? "open";
  const withinDays = Number.parseInt(
    request.nextUrl.searchParams.get("withinDays") ?? "7",
    10,
  );

  const client = createTicketServiceClient();

  try {
    const items =
      scope === "recent_resolved"
        ? await client.listRecentResolved(session.user.userId, withinDays)
        : await client.listOpen(session.user.userId);

    return NextResponse.json({ items });
  } catch (error) {
    const chaos = ticketErrorToResponse(error);
    if (chaos) return chaos;
    if (error instanceof TicketForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}