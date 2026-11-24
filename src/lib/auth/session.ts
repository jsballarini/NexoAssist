import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";
import type { NextRequest, NextResponse } from "next/server";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
};

export type SessionData = {
  user?: SessionUser;
};

const DEV_SESSION_FALLBACK = "local-dev-session-secret-32chars!";

/** iron-session exige string ≥32; .env vazio (`SESSION_SECRET=`) não pode passar. */
export function resolveSessionPassword(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (min 32 characters)");
  }
  return DEV_SESSION_FALLBACK;
}

export function getSessionOptions(): SessionOptions {
  return {
    password: resolveSessionPassword(),
    cookieName: "nexo_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}

export async function getSession() {
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions());
  return session;
}

export async function requireRole(role: UserRole) {
  const session = await getSession();
  if (!session.user || session.user.role !== role) {
    return null;
  }
  return session.user;
}

export async function getIronSessionFromRequest(
  req: NextRequest,
  res: NextResponse,
) {
  return getIronSession<SessionData>(req, res, getSessionOptions());
}