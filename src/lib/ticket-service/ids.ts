import { prisma } from "@/lib/db";
import type { TicketType } from "@prisma/client";

function parseNumericSuffix(publicId: string, prefix: string): number {
  if (!publicId.startsWith(prefix)) return 0;
  const num = Number.parseInt(publicId.slice(prefix.length), 10);
  return Number.isFinite(num) ? num : 0;
}

async function maxNumericId(table: "TicketDraft" | "Ticket", prefix: string): Promise<number> {
  if (table === "TicketDraft") {
    const rows = await prisma.ticketDraft.findMany({
      where: { publicId: { startsWith: prefix } },
      select: { publicId: true },
    });
    return rows.reduce((m, r) => Math.max(m, parseNumericSuffix(r.publicId, prefix)), 0);
  }
  const rows = await prisma.ticket.findMany({
    where: { publicId: { startsWith: prefix } },
    select: { publicId: true },
  });
  return rows.reduce((m, r) => Math.max(m, parseNumericSuffix(r.publicId, prefix)), 0);
}

export async function nextDraftPublicId(): Promise<string> {
  const max = await maxNumericId("TicketDraft", "D-");
  return `D-${max + 1}`;
}

export async function nextTicketPublicId(type: TicketType): Promise<string> {
  const prefix = type === "REQ" ? "REQ-" : "INC-";
  const max = await maxNumericId("Ticket", prefix);
  return `${prefix}${max + 1}`;
}