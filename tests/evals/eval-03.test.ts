import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-03", () => {
  it("VPN 809 win10 usa search_kb e cita artigo", async () => {
    const result = await runEvalTurn("VPN erro 809 no windows 10");
    expect(result.trace.actions).toContain("search_kb");
    expect(result.content.toLowerCase()).toMatch(/vpn|809/);
    const slugs = result.trace.evidence.map((e) => e.id);
    expect(slugs.some((s) => s.includes("vpn-erro-809"))).toBe(true);
  });
});