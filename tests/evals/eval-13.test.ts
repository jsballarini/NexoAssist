import { describe, expect, it } from "vitest";
import { runEvalTurn } from "./helpers";

describe("EVAL-13", () => {
  it("cenário ambíguo → baixa confiança, sem mutação", async () => {
    const result = await runEvalTurn("Não sei se é VPN ou rede, não tenho certeza");
    expect(result.trace.actions).toEqual([]);
    expect(result.trace.confidence).toBeLessThanOrEqual(50);
    expect(result.content.toLowerCase()).toMatch(/analista/);
  });
});