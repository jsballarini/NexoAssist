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
      AGENT_EVAL_FIXTURES: "true",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@agent": path.resolve(__dirname, "./lib/agent"),
    },
  },
});