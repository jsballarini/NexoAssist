import { getSessionOptions, type SessionData } from "@/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
const publicPaths = ["/login", "/api/auth/login"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    getSessionOptions(),
  );

  if (pathname === "/") {
    if (session.user) {
      const dest =
        session.user.role === "analyst" ? "/atendente/conversas" : "/atendimento";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/api/auth/logout") {
    return response;
  }

  if (isPublicPath(pathname)) {
    if (session.user && pathname === "/login") {
      const dest =
        session.user.role === "analyst" ? "/atendente/conversas" : "/atendimento";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return response;
  }

  if (!session.user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = session.user.role;

  if (
    pathname.startsWith("/atendimento") ||
    pathname.startsWith("/perfil")
  ) {
    if (role !== "employee") {
      return NextResponse.redirect(new URL("/atendente/conversas", request.url));
    }
  }

  if (pathname.startsWith("/atendente")) {
    if (role !== "analyst") {
      return NextResponse.redirect(new URL("/atendimento", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};