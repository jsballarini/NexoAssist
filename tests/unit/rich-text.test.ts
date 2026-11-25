import { describe, expect, it } from "vitest";
import { splitRichText } from "@/lib/chat/rich-text";

describe("UNIT-RICH-TEXT: **negrito** nas mensagens do chat", () => {
  it("divide trechos em negrito e texto comum", () => {
    expect(splitRichText("**INC-20518** é aberto")).toEqual([
      { kind: "bold", value: "INC-20518" },
      { kind: "text", value: " é aberto" },
    ]);
  });

  it("mantém asteriscos soltos quando não fecham par", () => {
    expect(splitRichText("prazo **vencido sem fechar")).toEqual([
      { kind: "text", value: "prazo **vencido sem fechar" },
    ]);
  });

  it("suporta vários negritos na mesma linha", () => {
    expect(splitRichText("- **Título:** Notebook\n- **Status:** Aberto")).toEqual([
      { kind: "text", value: "- " },
      { kind: "bold", value: "Título:" },
      { kind: "text", value: " Notebook\n- " },
      { kind: "bold", value: "Status:" },
      { kind: "text", value: " Aberto" },
    ]);
  });
});