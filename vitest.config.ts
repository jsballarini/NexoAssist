import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    env: {
      TICKET_CHAOS_RATE: "0",
      TEST_USE_WALL_CLOCK: "false",
      // `npm run test:evals:llm` define EVAL_USE_LLM=true para exercitar o modelo real.
      AGENT_EVAL_FIXTURES: process.env.EVAL_USE_LLM === "true" ? "false" : "true",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@agent": path.resolve(__dirname, "./lib/agent"),
    },
  },
});