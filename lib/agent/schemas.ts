import { z } from "zod";

const MAX_UNDERSTANDING_CHARS = 400;
const MAX_REASONING_CHARS = 1200;
const MAX_CONTENT_CHARS = 4000;
const MAX_QUICK_REPLIES = 4;
const MAX_QUICK_REPLY_CHARS = 60;

/** Decisão estruturada que o modelo reporta a cada turno (transparência PRD). */
export const AgentDecisionSchema = z.object({
  understanding: z
    .string()
    .trim()
    .min(1)
    .max(MAX_UNDERSTANDING_CHARS)
    .describe("O que o funcionário quer, em uma frase."),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe("Grau de segurança na decisão, de 0 a 100."),
  reasoning: z
    .string()
    .trim()
    .min(1)
    .max(MAX_REASONING_CHARS)
    .describe("Por que as ações foram escolhidas, em linguagem natural curta."),
  outOfScope: z
    .boolean()
    .optional()
    .describe("true quando o pedido não é de TI (RH, financeiro, facilities)."),
  quickReplies: z
    .array(z.string().trim().min(1).max(MAX_QUICK_REPLY_CHARS))
    .max(MAX_QUICK_REPLIES)
    .optional()
    .describe("Opções rápidas para o funcionário responder a uma pergunta sua."),
});

export type AgentDecision = z.infer<typeof AgentDecisionSchema>;

function asDecisionRecord(raw: unknown): Record<string, unknown> | undefined {
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined;
    } catch {
      return undefined;
    }
  }
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : undefined;
}

/**
 * Interpreta argumentos de `report_decision` do stream ou do resumo do Mastra.
 * Tolera JSON em string e campos mínimos faltando.
 */
export function parseAgentDecision(raw: unknown): AgentDecision | undefined {
  const obj = asDecisionRecord(raw);
  if (!obj) return undefined;

  const understanding =
    typeof obj.understanding === "string"
      ? obj.understanding.trim()
      : String(obj.understanding ?? "").trim();
  let reasoning =
    typeof obj.reasoning === "string"
      ? obj.reasoning.trim()
      : String(obj.reasoning ?? "").trim();
  if (!reasoning && understanding) reasoning = understanding;

  let confidence: unknown = obj.confidence;
  if (typeof confidence === "string") confidence = Number(confidence);
  if (typeof confidence !== "number" || Number.isNaN(confidence)) return undefined;

  const candidate = {
    understanding,
    confidence,
    reasoning,
    ...(typeof obj.outOfScope === "boolean" ? { outOfScope: obj.outOfScope } : {}),
    ...(Array.isArray(obj.quickReplies) ? { quickReplies: obj.quickReplies } : {}),
  };

  const parsed = AgentDecisionSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;

  const { quickReplies: _drop, ...withoutQr } = candidate;
  const retry = AgentDecisionSchema.safeParse(withoutQr);
  return retry.success ? retry.data : undefined;
}

/** Decisão + texto final entregue ao funcionário. */
export const AgentTurnSchema = AgentDecisionSchema.extend({
  content: z.string().trim().min(1).max(MAX_CONTENT_CHARS),
});

export type AgentTurn = z.infer<typeof AgentTurnSchema>;

export const AgentUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
});

export type AgentUsage = z.infer<typeof AgentUsageSchema>;
