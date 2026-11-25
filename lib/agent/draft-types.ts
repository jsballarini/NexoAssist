import type { UiBlock } from "../../src/lib/conversation/types";

export type DraftOperation = "create" | "update" | "reopen";

export type DraftPayloadBody = {
  targetTicketId?: string;
  type?: "INC" | "REQ";
  category?:
    | "acesso"
    | "rede_vpn"
    | "hardware"
    | "software"
    | "email"
    | "outros";
  title?: string;
  description?: string;
  priority?: "critical" | "high" | "medium" | "low";
  affectedScope?: "only_me" | "team" | "organization";
  confirmedNew?: boolean;
};

export type DraftSummary = {
  draftId: string;
  operation: DraftOperation;
  title: string;
  priority: string;
  dueAtPreview: string;
  affectedScope?: DraftPayloadBody["affectedScope"];
  targetTicketId?: string;
  type?: DraftPayloadBody["type"];
  category?: DraftPayloadBody["category"];
  description?: string;
};

export function isDraftSummary(result: unknown): result is DraftSummary {
  return (
    !!result &&
    typeof result === "object" &&
    typeof (result as DraftSummary).draftId === "string" &&
    (result as DraftSummary).draftId.length > 0
  );
}

export type { UiBlock };