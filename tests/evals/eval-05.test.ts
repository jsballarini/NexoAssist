import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-05", () => {
  it("horário desk usa search_kb horario", async () => {
    const result = await runEvalTurn("Qual o horário do service desk?");
    expect(result.trace.actions).toContain("search_kb");
    const slugs = result.trace.evidence.map((e) => e.id);
    expect(slugs).toContain("horario-service-desk");
  });
});