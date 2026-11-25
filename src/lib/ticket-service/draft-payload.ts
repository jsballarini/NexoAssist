import type {
  AffectedScope,
  DraftOperation,
  TicketCategory,
  TicketPriority,
  TicketType,
} from "@prisma/client";

export type DraftPayloadBody = {
  targetTicketId?: string;
  type?: TicketType;
  category?: TicketCategory;
  title?: string;
  description?: string;
  priority?: TicketPriority;
  affectedScope?: AffectedScope;
};

export type DraftSummary = {
  draftId: string;
  operation: DraftOperation;
  title: string;
  priority: TicketPriority;
  dueAtPreview: string;
  affectedScope?: AffectedScope;
  targetTicketId?: string;
  type?: TicketType;
  category?: TicketCategory;
  description?: string;
};

export {
  CreateTicketPayloadSchema,
  DraftPatchSchema,
  REQUIRED_CREATE_FIELDS,
  checkCreatePayload,
  type CreatePayloadCheck,
  type CreateTicketPayload,
  type DraftPatch,
  type RequiredCreateField,
} from "@/lib/domain/ticket-payload";
