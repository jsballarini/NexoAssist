export { createTicketServiceClient, type TicketServiceClient } from "./client";
export { CHAOS_ERROR_BODY, fetchWithTicketRetry } from "./retry";
export {
  TicketForbiddenError,
  TicketLegacyUnavailableError,
  TicketNotFoundError,
} from "./errors";
export { shouldSimulateOutage, getChaosRate } from "./chaos";
export type { TicketDetail, TicketSummary } from "./types";