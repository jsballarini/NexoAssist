import { getSession } from "@/lib/auth/session";
import {
  getThreadMessages,
  postAnalystMessage,
  ConversationAlreadyAssignedError,
  AnalystHandoffError,
} from "@/lib/analyst";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  content: z.string().min(1).max(4000),
});

export async function GET(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session.user || session.user.role !== "analyst") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const sinceRaw = url.searchParams.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : undefined;

  try {
    const result = await getThreadMessages(id, since);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AnalystHandoffError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus });
    }
    throw error;
  }
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session.user || session.user.role !== "analyst") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const result = await postAnalystMessage(
      session.user.userId,
      id,
      parsed.data.content,
    );
    return NextResponse.json(result, { status: 201 });
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