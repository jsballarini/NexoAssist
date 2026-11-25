import { describe, expect, it } from "vitest";
import { createTicketServiceClient } from "@/lib/ticket-service";
import { runAgentTurn } from "../../lib/agent";
import { createAgentAdapters } from "@/lib/conversation/adapters-factory";
import { findAnaUserId } from "./helpers";

describe("EVAL-14", () => {
  it("cancelar rascunho", async () => {
    const uid = await findAnaUserId();
    const ticketClient = createTicketServiceClient();
    const draft = await ticketClient.createDraft(uid, "create", {
      title: "Teste cancel",
      description: "desc",
      priority: "low",
      type: "INC",
      category: "outros",
      affectedScope: "only_me",
    });
    const adapters = createAgentAdapters(uid);
    const result = await runAgentTurn(
      `Cancelar o rascunho ${draft.draftId}`,
      {
        userId: uid,
        userName: "Ana Souza",
        department: "Financeiro",
        conversationId: "eval-14",
      },
      adapters,
    );
    expect(result.trace.actions).toContain("cancel_draft");
  });
});