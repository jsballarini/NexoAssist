import type { AgentAdapters, AgentUserContext } from "./adapters";
import { createDraftGuarded, pickPayload } from "./draft-guard";
import { toToolFailure } from "./tool-results";
import { executeTransfer, type ToolExtras } from "./transfer-tool";

export type ToolName =
  | "list_open_tickets"
  | "list_recent_resolved"
  | "get_ticket"
  | "search_kb"
  | "create_draft"
  | "update_ticket"
  | "reopen_ticket"
  | "cancel_draft"
  | "transfer_to_analyst";

async function execute(
  name: ToolName,
  args: Record<string, unknown>,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  extras: ToolExtras,
): Promise<unknown> {
  switch (name) {
    case "list_open_tickets":
      return adapters.ticketClient.listOpen(ctx.userId);
    case "list_recent_resolved":
      return adapters.ticketClient.listRecentResolved(
        ctx.userId,
        typeof args.withinDays === "number" ? args.withinDays : 7,
      );
    case "get_ticket":
      return adapters.ticketClient.getById(
        ctx.userId,
        String(args.publicId ?? args.ticketId ?? ""),
      );
    case "search_kb":
      return adapters.kbSearch(String(args.query ?? ""));
    case "create_draft":
      return createDraftGuarded(
        (args.operation as "create" | "update" | "reopen") ?? "create",
        args,
        ctx,
        adapters,
      );
    case "update_ticket":
      return createDraftGuarded("update", args, ctx, adapters);
    case "reopen_ticket":
      return createDraftGuarded("reopen", args, ctx, adapters);
    case "cancel_draft":
      await adapters.ticketClient.cancelDraft(ctx.userId, String(args.draftId ?? ""));
      return { cancelled: true, draftId: args.draftId };
    case "transfer_to_analyst":
      return executeTransfer(args, ctx, adapters, extras);
    default:
      throw new Error(`Tool not implemented: ${name}`);
  }
}

/**
 * Executa uma ferramenta. Falhas esperadas do ticket-service (indisponibilidade, chamado de
 * terceiros, rascunho inválido) viram resultados estruturados; o resto propaga.
 */
export async function runTool(
  name: ToolName,
  args: Record<string, unknown>,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  extras: ToolExtras = {},
): Promise<unknown> {
  try {
    return await execute(name, args, ctx, adapters, extras);
  } catch (error) {
    const failure = toToolFailure(error);
    if (failure) return failure;
    throw error;
  }
}

export { pickPayload };
