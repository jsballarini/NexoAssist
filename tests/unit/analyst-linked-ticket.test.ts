import { describe, expect, it } from "vitest";
import { extractLinkedTicketId } from "@/lib/analyst/linked-ticket";

describe("extractLinkedTicketId", () => {
  it("reads last ticket evidence", () => {
    expect(
      extractLinkedTicketId([
        { type: "article", id: "kb-1" },
        { type: "ticket", id: "INC-20311" },
      ]),
    ).toBe("INC-20311");
  });

  it("falls back to INC in content", () => {
    expect(extractLinkedTicketId([], "Ver INC-99999")).toBe("INC-99999");
  });

  it("prefers the ticket named in the handoff summary", () => {
    expect(
      extractLinkedTicketId([{ type: "ticket", id: "INC-1" }], "Vou transferir", ["INC-20311"]),
    ).toBe("INC-20311");
    expect(extractLinkedTicketId([], "Pedido REQ-10442 aprovado", [])).toBe("REQ-10442");
  });
});