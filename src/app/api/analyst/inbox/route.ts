import { getSession } from "@/lib/auth/session";
import { buildInboxETag, listInboxItems } from "@/lib/analyst";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.user || session.user.role !== "analyst") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serverTime = new Date().toISOString();
  const items = await listInboxItems();
  const etag = buildInboxETag(items);

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag },
    });
  }

  return NextResponse.json(
    { items, serverTime },
    { headers: { ETag: etag } },
  );
}