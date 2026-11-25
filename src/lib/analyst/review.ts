import { getConfidenceTransferOffer } from "@/lib/domain/rules";

/** Regra registrada no trace quando o agent não tem segurança (oferta ou transferência). */
export const LOW_CONFIDENCE_RULE = "TRANSFER_LOW_CONFIDENCE";

export type ReviewSignals = {
  confidence: number | null | undefined;
  rulesFired: readonly string[] | null | undefined;
};

/**
 * Indica se o último turno do agent merece revisão do analista:
 * confiança abaixo do limiar de oferta ou regra de baixa segurança disparada.
 */
export function isReviewSuggested(
  { confidence, rulesFired }: ReviewSignals,
  threshold: number = getConfidenceTransferOffer(),
): boolean {
  if (rulesFired?.includes(LOW_CONFIDENCE_RULE)) return true;
  return typeof confidence === "number" && confidence < threshold;
}
