import { getOpenRouterConfig } from "../config";

const OPENROUTER_PROVIDER_ID = "openrouter";

/** Configuração de modelo OpenAI-compatível (OpenRouter) lida do ambiente a cada turno. */
export function buildOpenRouterModel() {
  const { apiKey, model, baseUrl } = getOpenRouterConfig();
  return {
    providerId: OPENROUTER_PROVIDER_ID,
    modelId: model,
    url: baseUrl,
    apiKey,
  };
}
