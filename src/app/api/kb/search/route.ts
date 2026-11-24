import { getSession } from "@/lib/auth/session";
import { searchArticles } from "@/lib/knowledge-base";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q");
  if (!q?.trim()) {
    return NextResponse.json({ error: "Query obrigatória" }, { status: 400 });
  }

  const results = await searchArticles(q, 5);
  return NextResponse.json({ items: results });
}