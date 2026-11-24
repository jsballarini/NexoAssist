import { getSession } from "@/lib/auth/session";
import { ticketErrorToResponse } from "@/lib/api/ticket-http";
import { addSystemMessage } from "@/lib/conversation/repository";
import {
  createTicketServiceClient,
  TicketForbiddenError,
} from "@/lib/ticket-service";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    conversationId: z.string().uuid().optional(),
  })
  .optional();

type Params = { params: Promise<{ draftId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user || session.user.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { draftId } = await params;
  let conversationId: string | undefined;
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (parsed.success && parsed.data?.conversationId) {
      conversationId = parsed.data.conversationId;
    }
  } catch {
    /* body opcional */
  }

  const client = createTicketServiceClient();
  try {
    const ticket = await client.confirmDraft(session.user.userId, draftId);
    if (conversationId) {
      await addSystemMessage(
        conversationId,
        `Chamado ${ticket.id} confirmado (${ticket.statusLabel}).`,
      );
    }
    return NextResponse.json(ticket);
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