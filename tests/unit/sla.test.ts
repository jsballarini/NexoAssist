import { describe, expect, it } from "vitest";
import { computeDueAt, fromSpParts, isBreached, toSpParts } from "@/lib/domain/sla";

describe("UNIT-SLA-01", () => {
  it("Alta aberta sex 14h → dueAt segunda 12h (SP)", () => {
    const opened = fromSpParts(2025, 10, 21, 14, 0);
    const due = computeDueAt("high", opened);
    const p = toSpParts(due);
    expect(p.dow).toBe(1);
    expect(p.hour).toBe(12);
    expect(p.minute).toBe(0);
  });
});

describe("UNIT-SLA-02", () => {
  it("Média vencida → isBreached true", () => {
    const dueAt = new Date("2020-01-01T12:00:00.000Z");
    const now = new Date("2025-01-01T12:00:00.000Z");
    expect(isBreached(dueAt, now, "in_progress")).toBe(true);
  });
});

describe("UNIT-SLA-03", () => {
  it("Crítica domingo → due 1h calendário", () => {
    const opened = fromSpParts(2025, 10, 2, 10, 0);
    expect(toSpParts(opened).dow).toBe(0);
    const due = computeDueAt("critical", opened);
    expect(due.getTime() - opened.getTime()).toBe(60 * 60 * 1000);
  });
});