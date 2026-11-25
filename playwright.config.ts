import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const e2eHost = "127.0.0.1";
const e2ePort = process.env.PLAYWRIGHT_PORT ?? "3099";
const e2eBaseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://${e2eHost}:${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /e2e-.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  timeout: 180_000,
  reporter: "list",
  use: {
    baseURL: e2eBaseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -H ${e2eHost} -p ${e2ePort}`,
    url: e2eBaseURL,
    timeout: 180_000,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    env: {
      ...process.env,
      NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-playwright",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://nexo:nexo@localhost:5432/nexo",
      SESSION_SECRET:
        process.env.SESSION_SECRET ?? "local-dev-session-secret-32chars!",
      AGENT_EVAL_FIXTURES: "true",
      TICKET_CHAOS_RATE: "0",
      CHAOS_ENDPOINT_ENABLED: "true",
    },
  },
});