import { getSession } from "@/lib/auth/session";
import { ticketErrorToResponse } from "@/lib/api/ticket-http";
import { createTicketServiceClient, TicketForbiddenError } from "@/lib/ticket-service";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ draftId: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user || session.user.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { draftId } = await params;
  const client = createTicketServiceClient();

  try {
    await client.cancelDraft(session.user.userId, draftId);
    return new Response(null, { status: 204 });
  } catch (error) {
    const chaos = ticketErrorToResponse(error);
    if (chaos) return chaos;
    if (error instanceof TicketForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const mapped = ticketErrorToResponse(error);
    if (mapped) return mapped;
    throw error;
  }
}