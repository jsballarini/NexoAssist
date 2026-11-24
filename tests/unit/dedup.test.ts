import { describe, expect, it } from "vitest";
import { resolveDraftOperation } from "@/lib/domain/dedup";

describe("UNIT-DEDUP-01", () => {
  it("chamado aberto equivalente → update", () => {
    const r = resolveDraftOperation(
      "notebook lento após windows",
      [{ id: "INC-20311", title: "Notebook lento após atualização do Windows" }],
      [],
    );
    expect(r.operation).toBe("update");
    expect(r.targetTicketId).toBe("INC-20311");
  });

  it("resolvido ≤7d sem aberto → reopen", () => {
    const r = resolveDraftOperation(
      "sap bloqueado novamente",
      [],
      [{ id: "INC-20150", title: "SAP bloqueado no acesso" }],
    );
    expect(r.operation).toBe("reopen");
    expect(r.targetTicketId).toBe("INC-20150");
  });

  it("sem match → create", () => {
    const r = resolveDraftOperation("impressora nova sala 4", [], []);
    expect(r.operation).toBe("create");
    expect(r.targetTicketId).toBeUndefined();
  });
});