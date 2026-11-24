import type { AgentAdapters, AgentUserContext } from "./adapters";

export type ToolName =
  | "list_open_tickets"
  | "list_recent_resolved"
  | "get_ticket"
  | "search_kb";

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
    default:
      throw new Error(`Tool not implemented: ${name}`);
  }
}