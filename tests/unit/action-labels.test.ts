import { describe, expect, it } from "vitest";
import { actionLabels, statusLineLabels } from "@/lib/chat/action-labels";

describe("actionLabels", () => {
  it("maps known tools to PT labels", () => {
    expect(actionLabels(["list_open_tickets", "search_kb"])).toEqual([
      "consultou seus chamados",
      "buscou na central de ajuda",
    ]);
  });

  it("falls back for unknown actions", () => {
    expect(actionLabels(["custom_tool"])).toEqual(["custom tool"]);
  });

  it("collapses repeated steps of the same turn", () => {
    expect(actionLabels(["create_draft", "cancel_draft", "create_draft"])).toEqual([
      "montou o rascunho",
      "cancelou o rascunho",
    ]);
  });

  it("ignores report_decision in the status line", () => {
    expect(actionLabels(["report_decision", "search_kb"])).toEqual(["buscou na central de ajuda"]);
  });
});

describe("statusLineLabels", () => {
  it("maps rules when no tools ran", () => {
    expect(statusLineLabels([], ["SCOPE_IT", "KB_PARTIAL_MATCH"])).toEqual([
      "buscou na central de ajuda",
    ]);
  });

  it("shows fallback when only scope rules fired", () => {
    expect(statusLineLabels([], ["SCOPE_IT", "NO_DECISION_REPORTED"], { hasReply: true })).toEqual([
      "entendeu sua mensagem",
    ]);
  });
});
