import { prisma } from "@/lib/db";
import { ticketCategoryLabel, ticketPriorityLabel } from "@/lib/domain/ticket-labels";

export type LoginShowcaseStats = {
  firstResponseSeconds: number;
  firstResponseLabel: string;
  resolvedWithoutQueuePercent: number;
  resolvedWithoutQueueLabel: string;
  analystsOnline: number;
  analystsOnlineLabel: string;
};

export type LoginPreviewTicket = {
  publicId: string;
  categoryLabel: string;
  priorityLabel: string;
  slaHint: string;
} | null;

function formatFirstResponse(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return s <= 0 ? "< 1 s" : `${s} s`;
}

function formatSlaHint(dueAt: Date, now = new Date()): string {
  const diffMs = dueAt.getTime() - now.getTime();
  const hours = Math.ceil(diffMs / (60 * 60 * 1000));
  if (hours <= 0) return "prazo vencido";
  if (hours < 24) return `em até ${hours} h`;
  const days = Math.ceil(hours / 24);
  return `em até ${days} d`;
}

/** Latência média dos traces do assistente (ms → s). */
async function averageFirstResponseSeconds(): Promise<number> {
  const rows = await prisma.agentTrace.findMany({
    select: { usage: true },
    take: 800,
    orderBy: { message: { createdAt: "desc" } },
  });
  const latencies: number[] = [];
  for (const row of rows) {
    if (!row.usage || typeof row.usage !== "object") continue;
    const ms = (row.usage as { latencyMs?: unknown }).latencyMs;
    if (typeof ms === "number" && ms > 0 && ms < 120_000) latencies.push(ms);
  }
  if (latencies.length === 0) return 0;
  return latencies.reduce((a, b) => a + b, 0) / latencies.length / 1000;
}

/** Conversas com pelo menos uma msg de usuário e sem handoff humano. */
async function resolvedWithoutQueuePercent(): Promise<number> {
  const conversations = await prisma.conversation.findMany({
    where: { messages: { some: { role: "user" } } },
    select: {
      id: true,
      handoffSummary: true,
      _count: { select: { messages: { where: { role: "analyst" } } } },
    },
  });
  if (conversations.length === 0) return 0;
  const withoutQueue = conversations.filter(
    (c) => !c.handoffSummary && c._count.messages === 0,
  ).length;
  return Math.round((withoutQueue / conversations.length) * 100);
}

export async function getLoginShowcaseStats(): Promise<LoginShowcaseStats> {
  const [avgSec, pct, analysts] = await Promise.all([
    averageFirstResponseSeconds(),
    resolvedWithoutQueuePercent(),
    prisma.user.count({ where: { role: "analyst" } }),
  ]);

  const firstResponseSeconds = Math.round(avgSec);

  return {
    firstResponseSeconds,
    firstResponseLabel: formatFirstResponse(firstResponseSeconds),
    resolvedWithoutQueuePercent: pct,
    resolvedWithoutQueueLabel: `${pct}%`,
    analystsOnline: analysts,
    analystsOnlineLabel: String(analysts),
  };
}

/** Card de exemplo no login (VPN do seed quando existir). */
export async function getLoginPreviewTicket(): Promise<LoginPreviewTicket> {
  const ticket = await prisma.ticket.findFirst({
    where: { publicId: { in: ["INC-20517", "INC-20311"] } },
    orderBy: { lastUpdatedAt: "desc" },
    select: { publicId: true, category: true, priority: true, dueAt: true },
  });
  if (!ticket) return null;
  return {
    publicId: ticket.publicId,
    categoryLabel: ticketCategoryLabel[ticket.category],
    priorityLabel: ticketPriorityLabel[ticket.priority],
    slaHint: formatSlaHint(ticket.dueAt),
  };
}