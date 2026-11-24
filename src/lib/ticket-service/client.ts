import { TicketServiceImpl } from "./impl/service";
import type { TicketDetail, TicketSummary } from "./types";

export type TicketServiceClient = {
  listOpen(requesterId: string): Promise<TicketSummary[]>;
  listRecentResolved(
    requesterId: string,
    withinDays?: number,
  ): Promise<TicketSummary[]>;
  getById(requesterId: string, publicId: string): Promise<TicketDetail>;
};

let singleton: TicketServiceImpl | null = null;

export function createTicketServiceClient(): TicketServiceClient {
  if (!singleton) {
    singleton = new TicketServiceImpl();
  }
  return singleton;
}