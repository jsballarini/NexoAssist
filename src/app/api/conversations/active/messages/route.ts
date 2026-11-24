import { getSession } from "@/lib/auth/session";
import { postUserMessage } from "@/lib/conversation";
import {
  ConversationAwaitingAnalystError,
  ConversationWithAnalystError,
  SessionMessageLimitError,
} from "@/lib/conversation/types";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  content: z.string().min(1).max(4000),
  turnId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.user || session.user.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.userId },
    select: { department: true },
  });

  try {
    const result = await postUserMessage(
      session.user.userId,
      session.user.name,
      user?.department ?? "",
      parsed.data.content,
      parsed.data.turnId,
    );
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof SessionMessageLimitError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 429 },
      );
    }
    if (error instanceof ConversationAwaitingAnalystError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 423 },
      );
    }
    if (error instanceof ConversationWithAnalystError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 423 },
      );
    }
    throw error;
  }
}