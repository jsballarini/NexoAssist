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
  findPendingDraft(requesterId: string): Promise<DraftSummary | null>;
  confirmDraft(requesterId: string, draftId: string): Promise<TicketDetail>;
  cancelDraft(requesterId: string, draftId: string): Promise<void>;
  /** Marca o chamado como `waiting_analyst` e registra o motivo. */
  transfer(requesterId: string, publicId: string, reason: string): Promise<TicketDetail>;
};

let singleton: TicketServiceImpl | null = null;

export function createTicketServiceClient(): TicketServiceClient {
  if (!singleton) {
    singleton = new TicketServiceImpl();
  }
  return singleton;
}