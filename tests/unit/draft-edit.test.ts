import { describe, expect, it } from "vitest";
import {
  blockFromSummary,
  buildDraftPatch,
  formFromBlock,
  type DraftBlock,
} from "@/components/chat/draft-edit";

const block: DraftBlock = {
  type: "draft_card",
  draftId: "DRF-1",
  operation: "create",
  title: "VPN não conecta",
  priority: "medium",
  dueAtPreview: "2026-11-26T12:00:00.000Z",
  affectedScope: "only_me",
  ticketType: "INC",
  category: "rede_vpn",
  description: "Erro 809",
};

describe("UNIT-DRAFT-EDIT: helpers do card de rascunho", () => {
  it("não envia nada quando o formulário não mudou", () => {
    expect(buildDraftPatch(block, formFromBlock(block))).toEqual({});
  });

  it("envia somente os campos alterados, com nomes da API", () => {
    const form = { ...formFromBlock(block), ticketType: "REQ", description: " Novo texto ", priority: "high" };
    expect(buildDraftPatch(block, form)).toEqual({ type: "REQ", description: "Novo texto", priority: "high" });
  });

  it("ignora campos esvaziados (o schema exige valor)", () => {
    expect(buildDraftPatch(block, { ...formFromBlock(block), title: "   " })).toEqual({});
  });

  it("aplica o DraftSummary da API ao bloco preservando o id", () => {
    const next = blockFromSummary(block, {
      title: "Novo",
      priority: "high",
      dueAtPreview: "2026-11-25T20:00:00.000Z",
      affectedScope: "team",
      type: "INC",
      category: "rede_vpn",
      description: "Erro 809 editado",
    });
    expect(next).toMatchObject({ draftId: "DRF-1", title: "Novo", priority: "high", affectedScope: "team" });
    expect(next.description).toBe("Erro 809 editado");
  });
});
