import { getSession } from "@/lib/auth/session";
import {
  returnToAgent,
  ConversationAlreadyAssignedError,
  AnalystHandoffError,
} from "@/lib/analyst";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session.user || session.user.role !== "analyst") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await returnToAgent(session.user.userId, id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConversationAlreadyAssignedError) {
      return NextResponse.json({ error: "already_assigned" }, { status: 409 });
    }
    if (error instanceof AnalystHandoffError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.httpStatus });
    }
    throw error;
  }
}