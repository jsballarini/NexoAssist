import { describe, expect, it } from "vitest";

describe("login showcase stats (formato)", () => {
  it("formata segundos arredondados", async () => {
    const { getLoginShowcaseStats } = await import("@/lib/public/login-showcase-stats");
    const stats = await getLoginShowcaseStats();
    expect(stats.firstResponseLabel).toMatch(/s$/);
    expect(stats.resolvedWithoutQueueLabel).toMatch(/%$/);
    expect(stats.analystsOnline).toBeGreaterThanOrEqual(0);
  });
});