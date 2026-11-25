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
