import { getSession } from "@/lib/auth/session";
import { listConversationTraces, AnalystHandoffError } from "@/lib/analyst";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session.user || session.user.role !== "analyst") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const traces = await listConversationTraces(id);
    return NextResponse.json({ items: traces });
  } catch (error) {
    if (error instanceof AnalystHandoffError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus });
    }
    throw error;
  }
}