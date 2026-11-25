#!/usr/bin/env node
/**
 * Roda a matriz de intenções contra o modelo real (G2-QA-01, opcional).
 * Uso: `npm run test:evals:llm` (requer OPENROUTER_API_KEY e OPENROUTER_MODEL no .env).
 * Nunca imprime a chave; sem ela, encerra com instruções.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

if (!process.env.OPENROUTER_API_KEY?.trim()) {
  console.error(
    "OPENROUTER_API_KEY ausente. Defina OPENROUTER_API_KEY e OPENROUTER_MODEL no .env para rodar os evals com LLM.\n" +
      "Os evals determinísticos continuam em `npm run test:evals`.",
  );
  process.exit(1);
}

const require = createRequire(import.meta.url);
const vitestBin = require.resolve("vitest/vitest.mjs");

const result = spawnSync(
  process.execPath,
  [vitestBin, "run", "tests/evals/llm-intent-accuracy.test.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, EVAL_USE_LLM: "true", AGENT_EVAL_FIXTURES: "false" },
  },
);

process.exit(result.status ?? 1);
