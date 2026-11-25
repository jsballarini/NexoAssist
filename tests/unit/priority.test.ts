import { describe, expect, it } from "vitest";
import {
  IMPACT_SCOPES,
  URGENCIES,
  classifyPriority,
  isImpactScope,
  isUrgency,
  type ImpactScope,
  type PriorityLevel,
  type Urgency,
} from "@/lib/domain/priority";

describe("UNIT-PRIORITY-01 classifyPriority (impacto × urgência)", () => {
  const cases: [ImpactScope, Urgency, PriorityLevel][] = [
    ["organization", "blocking_work", "critical"],
    ["team", "blocking_work", "critical"],
    ["only_me", "blocking_work", "high"],
    ["only_me", "same_day_commitment", "high"],
    ["team", "same_day_commitment", "high"],
    ["organization", "same_day_commitment", "high"],
    ["only_me", "has_workaround", "medium"],
    ["team", "has_workaround", "medium"],
    ["only_me", "low", "low"],
    ["team", "low", "medium"],
    ["organization", "low", "medium"],
  ];

  it.each(cases)("%s + %s => %s", (impact, urgency, expected) => {
    expect(classifyPriority(impact, urgency)).toBe(expected);
  });

  it("cobre todas as combinações com um resultado válido", () => {
    for (const impact of IMPACT_SCOPES) {
      for (const urgency of URGENCIES) {
        expect(["critical", "high", "medium", "low"]).toContain(classifyPriority(impact, urgency));
      }
    }
  });

  it("equipe parada é mais grave que uma pessoa parada", () => {
    expect(classifyPriority("team", "blocking_work")).toBe("critical");
    expect(classifyPriority("only_me", "blocking_work")).toBe("high");
  });

  it("valida valores desconhecidos", () => {
    expect(isImpactScope("team")).toBe(true);
    expect(isImpactScope("todos")).toBe(false);
    expect(isUrgency("blocking_work")).toBe(true);
    expect(isUrgency("agora")).toBe(false);
  });
});
