import { prisma } from "@/lib/db";
import { getIronSessionFromRequest, type SessionUser } from "@/lib/auth/session";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "E-mail não encontrado" }, { status: 401 });
  }

  const sessionUser: SessionUser = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const payload = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
  const response = NextResponse.json(payload);
  const session = await getIronSessionFromRequest(request, response);
  session.user = sessionUser;
  await session.save();
  return response;
}