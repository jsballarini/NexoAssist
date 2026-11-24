import type { AgentAdapters, AgentUserContext } from "./adapters";
import type { DraftOperation, DraftPayloadBody } from "./draft-types";

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

function pickPayload(args: Record<string, unknown>): DraftPayloadBody {
  return {
    targetTicketId:
      typeof args.targetTicketId === "string"
        ? args.targetTicketId
        : typeof args.ticketId === "string"
          ? args.ticketId
          : typeof args.publicId === "string"
            ? args.publicId
            : undefined,
    type: args.type as DraftPayloadBody["type"],
    category: args.category as DraftPayloadBody["category"],
    title: typeof args.title === "string" ? args.title : undefined,
    description: typeof args.description === "string" ? args.description : undefined,
    priority: args.priority as DraftPayloadBody["priority"],
    affectedScope: args.affectedScope as DraftPayloadBody["affectedScope"],
  };
}

export async function runTool(
  name: ToolName,
  args: Record<string, unknown>,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
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
      return adapters.ticketClient.createDraft(
        ctx.userId,
        (args.operation as DraftOperation) ?? "create",
        pickPayload(args),
      );
    case "update_ticket":
      return adapters.ticketClient.createDraft(ctx.userId, "update", pickPayload(args));
    case "reopen_ticket":
      return adapters.ticketClient.createDraft(ctx.userId, "reopen", pickPayload(args));
    case "cancel_draft":
      await adapters.ticketClient.cancelDraft(ctx.userId, String(args.draftId ?? ""));
      return { cancelled: true, draftId: args.draftId };
    case "transfer_to_analyst":
      await adapters.conversationClient.transferToAnalyst(
        ctx.conversationId,
        String(args.reason ?? "Solicitação do funcionário"),
      );
      return { transferred: true, state: "awaiting_analyst" };
    default:
      throw new Error(`Tool not implemented: ${name}`);
  }
}