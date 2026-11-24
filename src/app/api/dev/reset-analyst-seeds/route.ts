import { restoreAnalystTransferSeeds } from "@/lib/dev/analyst-transfer-seeds";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const enabled =
  process.env.NODE_ENV !== "production" ||
  process.env.CHAOS_ENDPOINT_ENABLED === "true";

export async function POST() {
  if (!enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ana = await prisma.user.findUnique({
    where: { email: "ana.souza@nexo.com.br" },
  });
  const carla = await prisma.user.findUnique({
    where: { email: "carla.mendes@nexo.com.br" },
  });

  if (!ana || !carla) {
    return NextResponse.json({ error: "Seed users missing" }, { status: 500 });
  }

  await restoreAnalystTransferSeeds(ana.id, carla.id);

  return NextResponse.json({ ok: true });
}