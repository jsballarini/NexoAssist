import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { deletePendingDrafts, deleteTicketsByTitlePrefix } from "../support/cleanup";
import { findAnaUserId, runEvalTurn } from "./helpers";
import { countPhrases, INTENT_VARIATIONS } from "./variations";

/**
 * EVAL-LLM (G2-QA-01, opcional): mesma matriz de variações, mas com o modelo real.
 * Só roda com `npm run test:evals:llm` (EVAL_USE_LLM=true + OPENROUTER_API_KEY); fora do CI.
 * Como o LLM é não determinístico, mede-se a acurácia por intenção contra um piso.
 */
const ENABLED = process.env.EVAL_USE_LLM === "true" && !!process.env.OPENROUTER_API_KEY?.trim();
const MIN_ACCURACY = Number(process.env.EVAL_LLM_MIN_ACCURACY ?? "0.7");

describe.skipIf(!ENABLED)("EVAL-LLM: acurácia por intenção com o modelo real", () => {
  const usage = { turns: 0, prompt: 0, completion: 0, latencyMs: 0 };
  const rows: { intent: string; passed: number; total: number; failures: string[] }[] = [];

  beforeAll(async () => {
    await deleteTicketsByTitlePrefix("ana.souza@nexo.com.br", "E-mail corporativo indisponível");
  });

  afterAll(async () => {
    await deletePendingDrafts("ana.souza@nexo.com.br");
  });

  it(
    "mede a acurácia da matriz de variações",
    async () => {
      const anaId = await findAnaUserId();
      const foreign = await prisma.ticket.findFirstOrThrow({
        where: { requesterId: { not: anaId } },
        select: { publicId: true, title: true },
      });

      for (const variation of INTENT_VARIATIONS) {
        const row = { intent: variation.intent, passed: 0, total: variation.phrases.length, failures: [] as string[] };
        for (const phrase of variation.phrases) {
          const text = phrase.replace("{foreign}", foreign.publicId);
          try {
            const result = await runEvalTurn(text, anaId);
            if (result.trace.usage) {
              usage.turns += 1;
              usage.prompt += result.trace.usage.promptTokens;
              usage.completion += result.trace.usage.completionTokens;
              usage.latencyMs += result.trace.usage.latencyMs;
            }
            const failure = variation.check(result, { foreignTitle: foreign.title });
            if (failure === null) row.passed += 1;
            else row.failures.push(`"${text}": ${failure}`);
          } catch (error) {
            row.failures.push(`"${text}": erro ${(error as Error).message}`);
          }
        }
        rows.push(row);
      }

      const passed = rows.reduce((s, r) => s + r.passed, 0);
      const accuracy = passed / countPhrases();
      console.log("\nIntenção          Acertos  Acurácia");
      for (const r of rows) {
        const pct = `${Math.round((r.passed / r.total) * 100)}%`;
        console.log(`${r.intent.padEnd(17)} ${`${r.passed}/${r.total}`.padEnd(8)} ${pct}`);
        for (const f of r.failures) console.log(`  - ${f}`);
      }
      console.log(`Total: ${passed}/${countPhrases()} (${Math.round(accuracy * 100)}%), piso ${Math.round(MIN_ACCURACY * 100)}%\n`);

      if (usage.turns > 0) {
        console.log(
          `Consumo médio por turno (${usage.turns} turnos): ${Math.round(usage.prompt / usage.turns)} tokens de entrada, ` +
            `${Math.round(usage.completion / usage.turns)} de saída, ${Math.round(usage.latencyMs / usage.turns)} ms\n`,
        );
      }

      expect(accuracy).toBeGreaterThanOrEqual(MIN_ACCURACY);
    },
    600_000,
  );
});

