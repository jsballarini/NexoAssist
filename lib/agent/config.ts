const globalForLlm = globalThis as unknown as { __nexoLlmActive?: number };

function getLlmActive() {
  if (globalForLlm.__nexoLlmActive === undefined) {
    globalForLlm.__nexoLlmActive = 0;
  }
  return globalForLlm.__nexoLlmActive;
}

function setLlmActive(n: number) {
  globalForLlm.__nexoLlmActive = n;
}

/** Fixtures determinísticos só rodam quando explicitamente habilitados (CI/evals). */
export function shouldUseFixtures(): boolean {
  return process.env.AGENT_EVAL_FIXTURES === "true";
}

function readPositiveInt(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const DEFAULT_HISTORY_MAX_MESSAGES = 20;
const DEFAULT_MAX_STEPS = 5;
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;

export function getHistoryMaxMessages(): number {
  return readPositiveInt("AGENT_HISTORY_MAX_MESSAGES", DEFAULT_HISTORY_MAX_MESSAGES);
}

export function getMaxSteps(): number {
  return readPositiveInt("AGENT_MAX_STEPS", DEFAULT_MAX_STEPS);
}

export function getMaxOutputTokens(): number {
  return readPositiveInt("AGENT_MAX_OUTPUT_TOKENS", DEFAULT_MAX_OUTPUT_TOKENS);
}

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  if (!apiKey || !model) {
    throw new Error("OPENROUTER_API_KEY e OPENROUTER_MODEL são obrigatórios");
  }
  const baseUrl = (
    process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL
  ).replace(/\/$/, "");
  return { apiKey, model, baseUrl };
}

export function getMaxConcurrency(): number {
  const raw = process.env.LLM_MAX_CONCURRENCY ?? "2";
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? 2 : Math.max(1, n);
}

export async function withLlmConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  const max = getMaxConcurrency();
  while (getLlmActive() >= max) {
    await new Promise((r) => setTimeout(r, 50));
  }
  setLlmActive(getLlmActive() + 1);
  try {
    return await fn();
  } finally {
    setLlmActive(getLlmActive() - 1);
  }
}