import type { Clock } from "./clock";
import { getClock } from "./clock";
import type { TicketPriority, TicketStatus } from "@prisma/client";

const SP_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

function toSpParts(date: Date) {
  const spMs = date.getTime() - SP_UTC_OFFSET_MS;
  const d = new Date(spMs);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    dow: d.getUTCDay(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

function fromSpParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(Date.UTC(year, month, day, hour, minute, 0, 0) + SP_UTC_OFFSET_MS);
}

function isWeekend(dow: number): boolean {
  return dow === 0 || dow === 6;
}

function snapToBusinessOpen(date: Date): Date {
  let { year, month, day, hour, minute, dow } = toSpParts(date);
  while (isWeekend(dow)) {
    day += 1;
    const next = new Date(Date.UTC(year, month, day));
    year = next.getUTCFullYear();
    month = next.getUTCMonth();
    day = next.getUTCDate();
    dow = next.getUTCDay();
    hour = 8;
    minute = 0;
  }
  if (hour < 8) {
    hour = 8;
    minute = 0;
  } else if (hour >= 18) {
    day += 1;
    const next = new Date(Date.UTC(year, month, day));
    return snapToBusinessOpen(
      fromSpParts(
        next.getUTCFullYear(),
        next.getUTCMonth(),
        next.getUTCDate(),
        8,
        0,
      ),
    );
  }
  return fromSpParts(year, month, day, hour, minute);
}

function addBusinessHours(start: Date, hours: number): Date {
  let current = snapToBusinessOpen(start);
  let remaining = hours;

  while (remaining > 0) {
    const parts = toSpParts(current);
    if (isWeekend(parts.dow)) {
      current = snapToBusinessOpen(current);
      continue;
    }
    const endOfDay = fromSpParts(parts.year, parts.month, parts.day, 18, 0);
    const availableMs = endOfDay.getTime() - current.getTime();
    const needMs = remaining * 60 * 60 * 1000;

    if (needMs <= availableMs) {
      return new Date(current.getTime() + needMs);
    }

    remaining -= availableMs / (60 * 60 * 1000);
    const nextDay = new Date(Date.UTC(parts.year, parts.month, parts.day + 1));
    current = snapToBusinessOpen(
      fromSpParts(
        nextDay.getUTCFullYear(),
        nextDay.getUTCMonth(),
        nextDay.getUTCDate(),
        8,
        0,
      ),
    );
  }

  return current;
}

function addBusinessDays(start: Date, days: number): Date {
  let current = snapToBusinessOpen(start);
  let remaining = days;

  while (remaining > 0) {
    const p = toSpParts(current);
    let day = p.day;
    let month = p.month;
    let year = p.year;
    day += 1;
    const probe = new Date(Date.UTC(year, month, day));
    year = probe.getUTCFullYear();
    month = probe.getUTCMonth();
    day = probe.getUTCDate();
    const dow = probe.getUTCDay();
    if (!isWeekend(dow)) {
      remaining -= 1;
    }
    current = fromSpParts(year, month, day, 8, 0);
  }

  const startParts = toSpParts(snapToBusinessOpen(start));
  return fromSpParts(
    toSpParts(current).year,
    toSpParts(current).month,
    toSpParts(current).day,
    startParts.hour,
    startParts.minute,
  );
}

export function computeDueAt(
  priority: TicketPriority,
  openedAt: Date,
): Date {
  const base = openedAt;

  switch (priority) {
    case "critical":
      return new Date(base.getTime() + 60 * 60 * 1000);
    case "high": {
      const snapped = snapToBusinessOpen(base);
      const p = toSpParts(snapped);
      if (p.dow === 5 && p.hour >= 14) {
        const monday = fromSpParts(p.year, p.month, p.day + (8 - p.dow), 8, 0);
        return addBusinessHours(snapToBusinessOpen(monday), 4);
      }
      return addBusinessHours(snapped, 4);
    }
    case "medium":
      return addBusinessDays(snapToBusinessOpen(base), 3);
    case "low":
      return addBusinessDays(snapToBusinessOpen(base), 5);
    default:
      return addBusinessDays(snapToBusinessOpen(base), 3);
  }
}

const CLOSED_STATUSES: TicketStatus[] = ["resolved", "approved"];

export function isBreached(
  dueAt: Date,
  now: Date = getClock().now(),
  status?: TicketStatus,
): boolean {
  if (status && CLOSED_STATUSES.includes(status)) {
    return false;
  }
  return now.getTime() > dueAt.getTime();
}

export { fromSpParts, toSpParts };