import type { DraftOperation } from "@prisma/client";
import { TicketServiceImpl } from "./impl/service";
import type { DraftPayloadBody, DraftSummary } from "./draft-payload";
import type { TicketDetail, TicketSummary } from "./types";

export type TicketServiceClient = {
  listOpen(requesterId: string): Promise<TicketSummary[]>;
  listRecentResolved(
    requesterId: string,
    withinDays?: number,
  ): Promise<TicketSummary[]>;
  getById(requesterId: string, publicId: string): Promise<TicketDetail>;
  createDraft(
    requesterId: string,
    operation: DraftOperation,
    payload: DraftPayloadBody,
  ): Promise<DraftSummary>;
  confirmDraft(requesterId: string, draftId: string): Promise<TicketDetail>;
  cancelDraft(requesterId: string, draftId: string): Promise<void>;
};

let singleton: TicketServiceImpl | null = null;

export function createTicketServiceClient(): TicketServiceClient {
  if (!singleton) {
    singleton = new TicketServiceImpl();
  }
  return singleton;
}