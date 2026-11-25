import { describe, expect, it } from "vitest";
import { actionLabels } from "@/lib/chat/action-labels";

describe("actionLabels", () => {
  it("maps known tools to PT labels", () => {
    expect(actionLabels(["list_open_tickets", "search_kb"])).toEqual([
      "Consultou seus chamados",
      "Pesquisou na central de ajuda",
    ]);
  });

  it("falls back for unknown actions", () => {
    expect(actionLabels(["custom_tool"])).toEqual(["custom tool"]);
  });
});