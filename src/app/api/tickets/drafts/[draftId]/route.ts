import { getSession } from "@/lib/auth/session";
import { ticketErrorToResponse } from "@/lib/api/ticket-http";
import { createTicketServiceClient, type DraftPatch } from "@/lib/ticket-service";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ draftId: string }> };

/** Edita campos de um rascunho pendente do próprio funcionário; devolve o `DraftSummary`. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user || session.user.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const { draftId } = await params;
  try {
    const draft = await createTicketServiceClient().updateDraft(
      session.user.userId,
      draftId,
      body as DraftPatch,
    );
    return NextResponse.json(draft);
  } catch (error) {
    const mapped = ticketErrorToResponse(error);
    if (mapped) return mapped;
    throw error;
  }
}
