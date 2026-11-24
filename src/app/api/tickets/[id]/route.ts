import { getSession } from "@/lib/auth/session";
import { ticketErrorToResponse } from "@/lib/api/ticket-http";
import {
  createTicketServiceClient,
  TicketForbiddenError,
  TicketNotFoundError,
} from "@/lib/ticket-service";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "employee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const client = createTicketServiceClient();

  try {
    const detail = await client.getById(session.user.userId, id);
    return NextResponse.json(detail);
  } catch (error) {
    const chaos = ticketErrorToResponse(error);
    if (chaos) return chaos;
    if (error instanceof TicketForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof TicketNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}