import {
  getConfidenceTransferOffer,
  getConfidenceTransferStrong,
  type RuleId,
} from "../../src/lib/domain/rules";

export type TransferAction = "none" | "offer" | "transfer";

export type TransferRuleId = Extract<
  RuleId,
  "TRANSFER_USER_REQUEST" | "TRANSFER_CRITICAL" | "TRANSFER_SLA_BREACH" | "TRANSFER_LOW_CONFIDENCE"
>;

export type TransferSignals = {
  /** Confiança do agent no turno (0-100); `undefined` se o modelo não reportou decisão. */
  confidence?: number;
  /** Algum rascunho/chamado do turno tem prioridade `critical`. */
  critical: boolean;
  /** Algum chamado consultado no turno está com SLA vencido. */
  slaBreached: boolean;
  /** O funcionário pediu um analista. */
  userRequested: boolean;
  /** Assunto fora de TI: não há o que transferir por baixa confiança. */
  outOfScope?: boolean;
};

export type TransferDecision = {
  action: TransferAction;
  reasons: TransferRuleId[];
};

/** Detecta pedido explícito de atendimento humano. */
export const TRANSFER_REQUEST_PATTERN =
  /preciso falar|falar com (um |uma |o |a )?(analista|humano|atendente|pessoa)|quero (um |uma )?(humano|analista|atendente|pessoa)|chamar (um |uma )?(analista|atendente)|\b(passa|passar|transfer\w*|encaminh\w*)\b.{0,25}\b(analista|humano|atendente)/i;

export function userRequestedAnalyst(message: string): boolean {
  return TRANSFER_REQUEST_PATTERN.test(message);
}

/**
 * Política de transferência (Anexo A): transfere quando o funcionário pede, quando o caso é
 * crítico ou quando a confiança fica abaixo do limiar forte; apenas oferece analista com SLA
 * vencido ou confiança abaixo do limiar de oferta.
 */
export function evaluateTransferNeed(signals: TransferSignals): TransferDecision {
  const transferReasons: TransferRuleId[] = [];
  const offerReasons: TransferRuleId[] = [];

  if (signals.userRequested) transferReasons.push("TRANSFER_USER_REQUEST");
  if (signals.critical) transferReasons.push("TRANSFER_CRITICAL");

  if (signals.slaBreached) offerReasons.push("TRANSFER_SLA_BREACH");

  if (typeof signals.confidence === "number" && !signals.outOfScope) {
    if (signals.confidence < getConfidenceTransferStrong()) {
      transferReasons.push("TRANSFER_LOW_CONFIDENCE");
    } else if (signals.confidence < getConfidenceTransferOffer()) {
      offerReasons.push("TRANSFER_LOW_CONFIDENCE");
    }
  }

  if (transferReasons.length > 0) return { action: "transfer", reasons: transferReasons };
  if (offerReasons.length > 0) return { action: "offer", reasons: offerReasons };
  return { action: "none", reasons: [] };
}

const REASON_TEXT: Record<TransferRuleId, string> = {
  TRANSFER_USER_REQUEST: "Funcionário pediu atendimento humano",
  TRANSFER_CRITICAL: "Caso crítico (equipe ou empresa parada)",
  TRANSFER_SLA_BREACH: "Chamado com prazo de atendimento vencido",
  TRANSFER_LOW_CONFIDENCE: "agent_sem_seguranca: o agent não tem segurança sobre como resolver",
};

/** Motivo legível (para o analista) a partir das regras que dispararam a transferência. */
export function describeTransferReasons(reasons: TransferRuleId[]): string {
  return reasons.map((r) => REASON_TEXT[r]).join("; ");
}
