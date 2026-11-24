import { getSession } from "@/lib/auth/session";
import { getConversationForUser, listMessages } from "@/lib/conversation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session.user || session.user.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const conv = await getConversationForUser(conversationId, session.user.userId);
  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sinceRaw = new URL(request.url).searchParams.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : undefined;
  if (sinceRaw && since && Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Invalid since" }, { status: 400 });
  }

  const messages = await listMessages(conversationId, since);
  return NextResponse.json({
    items: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      uiBlocks: m.uiBlocks,
      createdAt: m.createdAt.toISOString(),
      trace: m.agentTrace
        ? {
            understanding: m.agentTrace.understanding,
            actions: m.agentTrace.actions,
            confidence: m.agentTrace.confidence,
            rulesFired: m.agentTrace.rulesFired,
            evidence: m.agentTrace.evidence,
          }
        : null,
    })),
  });
}