import { beforeAll, describe, expect, it } from "vitest";
import { EMPTY_TURN_CONTEXT } from "../../lib/agent/turn-context";
import { deleteTicketsByTitlePrefix } from "../support/cleanup";
import { runEvalTurn } from "./helpers";

const VPN_MESSAGE = "VPN não conecta no Windows 11, tenho reunião às 14h";

describe("EVAL-06", () => {
  beforeAll(async () => {
    await deleteTicketsByTitlePrefix("ana.souza@nexo.com.br", "VPN Windows 11");
  });

  it("passo 1: VPN Win11 com reunião → pergunta quem é afetado, sem criar rascunho", async () => {
    const result = await runEvalTurn(VPN_MESSAGE);

    expect(result.trace.actions).not.toContain("create_draft");
    expect(result.uiBlocks.some((b) => b.type === "draft_card")).toBe(false);
    const qr = result.uiBlocks.find((b) => b.type === "quick_replies");
    expect(qr).toBeDefined();
    if (qr && qr.type === "quick_replies") {
      expect(qr.options).toEqual(expect.arrayContaining(["Só eu", "Equipe (5–20)"]));
    }
  });

  it("passo 2: resposta de abrangência → rascunho com prioridade alta derivada", async () => {
    const result = await runEvalTurn("Só eu", undefined, {
      ...EMPTY_TURN_CONTEXT,
      messages: [
        { role: "user", content: VPN_MESSAGE },
        { role: "assistant", content: "Para definir a prioridade, quem é afetado?" },
        { role: "user", content: "Só eu" },
      ],
    });

    expect(result.trace.actions).toContain("create_draft");
    const draft = result.uiBlocks.find((b) => b.type === "draft_card");
    expect(draft).toBeDefined();
    if (draft && draft.type === "draft_card") {
      expect(draft.priority).toBe("high");
      expect(draft.affectedScope).toBe("only_me");
    }
  });
});
