import { getSession } from "@/lib/auth/session";
import { resetEmployeeChatForE2E } from "@/lib/dev/reset-employee-chat";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const enabled =
  process.env.NODE_ENV !== "production" || process.env.CHAOS_ENDPOINT_ENABLED === "true";

export async function POST(request: Request) {
  if (!enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const conversationId = await resetEmployeeChatForE2E(user.id);
  return NextResponse.json({ ok: true, conversationId });
}