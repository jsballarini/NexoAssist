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

export function shouldUseFixtures(): boolean {
  if (process.env.AGENT_EVAL_FIXTURES === "true") return true;
  if (!process.env.OPENROUTER_API_KEY?.trim()) return true;
  return false;
}

export function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  if (!apiKey || !model) {
    throw new Error("OPENROUTER_API_KEY e OPENROUTER_MODEL são obrigatórios");
  }
  return { apiKey, model };
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