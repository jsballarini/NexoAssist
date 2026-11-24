import { getSession } from "@/lib/auth/session";
import { startNewSession } from "@/lib/conversation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session.user || session.user.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meta = await startNewSession(session.user.userId);
  return NextResponse.json(meta);
}