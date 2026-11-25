import { z } from "zod";

const MAX_TEXT_CHARS = 500;
const MAX_STEPS = 10;
const MAX_STEP_CHARS = 200;
const MAX_TICKETS = 10;
const MAX_RULES = 20;

/** Resumo estruturado entregue ao analista no handoff (Anexo A: problema, passos, chamados, motivo). */
export const HandoffSummarySchema = z.object({
  problem: z.string().min(1).max(MAX_TEXT_CHARS),
  stepsTried: z.array(z.string().max(MAX_STEP_CHARS)).max(MAX_STEPS),
  ticketIds: z.array(z.string()).max(MAX_TICKETS),
  reason: z.string().min(1).max(MAX_TEXT_CHARS),
  /** Confiança do agent (0-100) no turno da transferência; `null` quando ainda não reportada. */
  confidence: z.number().min(0).max(100).nullable(),
  rulesFired: z.array(z.string()).max(MAX_RULES),
});

export type HandoffSummary = z.infer<typeof HandoffSummarySchema>;

export type HandoffSummaryInput = {
  problem?: string;
  stepsTried?: string[];
  ticketIds?: string[];
  reason: string;
  confidence?: number | null;
  rulesFired?: string[];
};

function clip(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

function unique(values: string[] | undefined, max: number): string[] {
  return [...new Set((values ?? []).map((v) => v.trim()).filter(Boolean))].slice(0, max);
}

/** Monta e valida o resumo, truncando textos longos e removendo duplicados. */
export function buildHandoffSummary(input: HandoffSummaryInput): HandoffSummary {
  const reason = clip(input.reason.trim() || "Solicitação do funcionário", MAX_TEXT_CHARS);
  const confidence =
    typeof input.confidence === "number" && Number.isFinite(input.confidence)
      ? Math.min(100, Math.max(0, Math.round(input.confidence)))
      : null;
  return HandoffSummarySchema.parse({
    problem: clip(input.problem?.trim() || reason, MAX_TEXT_CHARS),
    stepsTried: unique(input.stepsTried, MAX_STEPS).map((s) => clip(s, MAX_STEP_CHARS)),
    ticketIds: unique(input.ticketIds, MAX_TICKETS),
    reason,
    confidence,
    rulesFired: unique(input.rulesFired, MAX_RULES),
  });
}

/** Lê um valor persistido (Json) de forma segura; `undefined` se não for um resumo válido. */
export function parseHandoffSummary(value: unknown): HandoffSummary | undefined {
  const parsed = HandoffSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
