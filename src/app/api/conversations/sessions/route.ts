import { getSession } from "@/lib/auth/session";
import { listSessionHistory } from "@/lib/conversation/repository";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session.user || session.user.role !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await listSessionHistory(session.user.userId);
  return NextResponse.json({ items });
}