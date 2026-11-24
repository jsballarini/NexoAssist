import { getSession } from "@/lib/auth/session";
import { createTicketServiceClient } from "@/lib/ticket-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session.user || session.user.role !== "analyst") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: employeeId } = await params;
  const ticketClient = createTicketServiceClient();
  const items = await ticketClient.listOpen(employeeId);

  return NextResponse.json({ items });
}