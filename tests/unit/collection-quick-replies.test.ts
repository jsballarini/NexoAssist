import { describe, expect, it } from "vitest";
import {
  inferCollectionQuickReplies,
  inferQuickRepliesFromContent,
  quickRepliesForMissingField,
} from "../../lib/agent/collection-quick-replies";
import type { ToolCallRecord } from "../../lib/agent/tool-records";

describe("collection-quick-replies", () => {
  it("mapeia categoria e outros campos de coleta", () => {
    expect(quickRepliesForMissingField("category")).toEqual([
      "Acesso",
      "Rede e VPN",
      "Hardware",
      "Software",
      "E-mail",
      "Outros",
    ]);
    expect(quickRepliesForMissingField("affectedScope")).toContain("Só eu");
    expect(quickRepliesForMissingField("title")).toBeUndefined();
  });

  it("infere botões de DRAFT_INCOMPLETE no último create_draft", () => {
    const calls: ToolCallRecord[] = [
      {
        name: "create_draft",
        args: { title: "Notebook lento" },
        result: {
          ok: false,
          code: "DRAFT_INCOMPLETE",
          missing: ["category"],
          instruction: "pergunte categoria",
        },
      },
    ];
    expect(inferCollectionQuickReplies(calls, "Qual é a categoria?")).toContain("Hardware");
  });

  it("cai no texto quando não há create_draft na conversa", () => {
    const content =
      "Qual é a categoria do chamado? É acesso, rede VPN, hardware, software, email ou outros?";
    expect(inferQuickRepliesFromContent(content)).toContain("Hardware");
    expect(inferCollectionQuickReplies([], content)).toContain("Rede e VPN");
  });

  it("não infere botões só porque o texto cita urgência ou categoria (consulta)", () => {
    const content = [
      "INC-20520 — VPN",
      "Categoria: Rede e VPN",
      "Urgência: alta",
      "Precisa de mais alguma coisa?",
    ].join("\n");
    expect(inferQuickRepliesFromContent(content)).toBeUndefined();
    const calls: ToolCallRecord[] = [
      {
        name: "get_ticket",
        args: { publicId: "INC-20520" },
        result: { id: "INC-20520", title: "VPN", statusLabel: "Aberto", slaBreached: false },
      },
    ];
    expect(inferCollectionQuickReplies(calls, content)).toEqual([]);
  });

  it("não mostra categoria no texto se o último create_draft já gerou rascunho", () => {
    const calls: ToolCallRecord[] = [
      {
        name: "create_draft",
        args: {},
        result: {
          ok: false,
          code: "DRAFT_INCOMPLETE",
          missing: ["category"],
          instruction: "pergunte",
        },
      },
      {
        name: "create_draft",
        args: {},
        result: {
          draftId: "D-3",
          operation: "create",
          title: "VPN",
          priority: "high",
          dueAtPreview: "2026-11-25",
        },
      },
    ];
    const content =
      "Rascunho criado. Categoria: Rede e VPN. Prioridade: Alta.";
    expect(inferCollectionQuickReplies(calls, content)).toEqual([]);
  });
});