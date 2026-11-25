import { describe, expect, it } from "vitest";
import { priorityTone, statusTone } from "@/components/tickets/ticket-tone";
import { formatDaysAgo, formatDeadline, formatListTime, formatShortDate } from "@/lib/format/date";

const NOW = new Date("2026-10-21T15:00:00-03:00");

describe("date formatters (fuso São Paulo)", () => {
  it("formats short dates without the month dot", () => {
    expect(formatShortDate("2026-10-16T14:20:00-03:00")).toBe("16 out");
  });

  it("labels list times as hour, ontem or short date", () => {
    expect(formatListTime("2026-10-21T10:05:00-03:00", NOW)).toBe("10:05");
    expect(formatListTime("2026-10-20T10:05:00-03:00", NOW)).toBe("ontem");
    expect(formatListTime("2026-10-14T10:05:00-03:00", NOW)).toBe("14 out");
  });

  it("counts whole days and shows only the hour for same-day deadlines", () => {
    expect(formatDaysAgo("2026-10-16T14:00:00-03:00", NOW)).toBe("há 5 dias");
    expect(formatDaysAgo("2026-10-21T09:00:00-03:00", NOW)).toBe("hoje");
    expect(formatDeadline("2026-10-21T13:43:00-03:00", NOW)).toBe("13:43");
    expect(formatDeadline("2026-10-22T09:00:00-03:00", NOW)).toBe("22 out, 09:00");
  });

  it("returns empty strings for invalid input", () => {
    expect(formatShortDate("not-a-date")).toBe("");
    expect(formatDaysAgo(undefined, NOW)).toBe("");
  });
});

describe("ticket tones", () => {
  it("maps status (raw or label) and lets SLA breach win", () => {
    expect(statusTone({ status: "waiting_analyst" })).toBe("warning");
    expect(statusTone({ statusLabel: "Aprovado" })).toBe("violet");
    expect(statusTone({ status: "resolved", slaBreached: true })).toBe("danger");
    expect(statusTone({})).toBe("neutral");
  });

  it("maps priorities", () => {
    expect(priorityTone("high")).toBe("warning");
    expect(priorityTone("critical")).toBe("danger");
    expect(priorityTone(undefined)).toBe("neutral");
  });
});
