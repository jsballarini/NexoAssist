import { resolveDraftOperation } from "../../src/lib/domain/dedup";
import {
  classifyPriority,
  isImpactScope,
  isUrgency,
  type ImpactScope,
  type Urgency,
} from "../../src/lib/domain/priority";
import { checkCreatePayload } from "../../src/lib/domain/ticket-payload";
import type { AgentAdapters, AgentUserContext } from "./adapters";
import type { DraftOperation, DraftPayloadBody } from "./draft-types";
import type { DuplicateCandidate, ToolFailure } from "./tool-results";

const RECENT_RESOLVED_DAYS = 7;

type DraftArgs = Record<string, unknown>;

export function pickPayload(args: DraftArgs): DraftPayloadBody {
  const targetTicketId = [args.targetTicketId, args.ticketId, args.publicId].find(
    (v): v is string => typeof v === "string",
  );
  const text = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    targetTicketId,
    type: args.type as DraftPayloadBody["type"],
    category: args.category as DraftPayloadBody["category"],
    title: text(args.title),
    description: text(args.description),
    priority: args.priority as DraftPayloadBody["priority"],
    affectedScope: args.affectedScope as DraftPayloadBody["affectedScope"],
  };
}

function readImpact(args: DraftArgs): ImpactScope | undefined {
  return [args.impact, args.affectedScope].find(isImpactScope);
}

function readUrgency(args: DraftArgs): Urgency | undefined {
  return [args.urgency].find(isUrgency);
}

/**
 * Em chamados novos a prioridade nunca vem do texto livre do modelo: é calculada
 * por `classifyPriority(impacto, urgência)`; o escopo afetado é o próprio impacto.
 */
export function withDerivedPriority(args: DraftArgs): DraftPayloadBody {
  const impact = readImpact(args);
  const urgency = readUrgency(args);
  return {
    ...pickPayload(args),
    priority: impact && urgency ? classifyPriority(impact, urgency) : undefined,
    affectedScope: impact,
  };
}

const MISSING_FIELD_QUESTIONS: Record<string, string> = {
  title: "título curto do problema",
  description: "descrição do que acontece",
  type: "tipo (INC se algo parou, REQ se é um pedido)",
  category: "categoria (acesso, rede_vpn, hardware, software, email, outros)",
  affectedScope: "quem é afetado (impact: only_me, team ou organization)",
  urgency: "urgência (urgency: low, has_workaround, same_day_commitment ou blocking_work)",
};

/** Campos que ainda precisam ser perguntados, em termos de coleta (impacto/urgência). */
export function missingCreateFields(args: DraftArgs): string[] {
  const payload = withDerivedPriority(args);
  const check = checkCreatePayload(payload);
  if (check.ok) return [];
  const fields = new Set<string>([...check.missing, ...check.invalid]);
  if (fields.delete("priority")) {
    if (!readUrgency(args)) fields.add("urgency");
    if (!readImpact(args)) fields.add("affectedScope");
  }
  return [...fields];
}

async function findDuplicate(
  title: string,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
): Promise<DuplicateCandidate | undefined> {
  const [open, recent] = await Promise.all([
    adapters.ticketClient.listOpen(ctx.userId),
    adapters.ticketClient.listRecentResolved(ctx.userId, RECENT_RESOLVED_DAYS),
  ]);
  const resolution = resolveDraftOperation(
    title,
    open.map((t) => ({ id: t.id, title: t.title })),
    recent.map((t) => ({ id: t.id, title: t.title })),
  );
  if (resolution.operation === "create" || !resolution.targetTicketId) return undefined;

  const source = resolution.operation === "update" ? open : recent;
  const match = source.find((t) => t.id === resolution.targetTicketId);
  const kind =
    resolution.operation === "update"
      ? "chamado aberto"
      : `chamado resolvido há até ${RECENT_RESOLVED_DAYS} dias`;
  return {
    operation: resolution.operation,
    targetTicketId: resolution.targetTicketId,
    matchReason: `Título semelhante ao ${kind} ${resolution.targetTicketId}${
      match ? ` ("${match.title}")` : ""
    }`,
  };
}

/**
 * `create_draft`: antes de criar, checa duplicidade (aberto → update; resolvido ≤7 dias →
 * reopen) e a presença dos seis campos obrigatórios. Retorna falha estruturada em vez de criar.
 */
export async function createDraftGuarded(
  operation: DraftOperation,
  args: DraftArgs,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
): Promise<unknown> {
  if (operation !== "create") {
    const hasUrgency = readUrgency(args) && readImpact(args);
    const payload = hasUrgency ? withDerivedPriority(args) : pickPayload(args);
    return adapters.ticketClient.createDraft(ctx.userId, operation, payload);
  }

  const title = typeof args.title === "string" ? args.title.trim() : "";
  if (title && args.confirmedNew !== true) {
    const duplicate = await findDuplicate(title, ctx, adapters);
    if (duplicate) {
      const failure: ToolFailure = {
        ok: false,
        code: "DUPLICATE_CANDIDATE",
        duplicate,
        instruction:
          `Pergunte ao funcionário se é o mesmo problema do ${duplicate.targetTicketId}. ` +
          `Se sim, chame create_draft com operation=${duplicate.operation} e targetTicketId; ` +
          "se não, chame create_draft de novo com confirmedNew=true.",
      };
      return failure;
    }
  }

  const missing = missingCreateFields(args);
  if (missing.length > 0) {
    const failure: ToolFailure = {
      ok: false,
      code: "DRAFT_INCOMPLETE",
      missing,
      instruction:
        "Não crie o rascunho ainda. Pergunte um item por vez (com quickReplies quando houver opções): " +
        missing.map((f) => MISSING_FIELD_QUESTIONS[f] ?? f).join("; "),
    };
    return failure;
  }

  return adapters.ticketClient.createDraft(ctx.userId, "create", withDerivedPriority(args));
}
