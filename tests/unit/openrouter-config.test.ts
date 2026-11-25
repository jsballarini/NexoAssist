import { afterEach, describe, expect, it } from "vitest";
import { getOpenRouterConfig } from "../../lib/agent/config";

describe("getOpenRouterConfig", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("uses OPENROUTER_BASE_URL when set", () => {
    process.env.OPENROUTER_API_KEY = "sk-test";
    process.env.OPENROUTER_MODEL = "openai/gpt-4o-mini";
    process.env.OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/";
    const cfg = getOpenRouterConfig();
    expect(cfg.baseUrl).toBe("https://openrouter.ai/api/v1");
  });

  it("defaults base URL without env", () => {
    process.env.OPENROUTER_API_KEY = "sk-test";
    process.env.OPENROUTER_MODEL = "m";
    delete process.env.OPENROUTER_BASE_URL;
    expect(getOpenRouterConfig().baseUrl).toBe("https://openrouter.ai/api/v1");
  });
});