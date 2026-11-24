import { describe, expect, it } from "vitest";
import { findDiegoUserId, runEvalTurnAsUser } from "./helpers";

describe("EVAL-12", () => {
  it("SAP bloqueado — reopen INC-20150", async () => {
    const { prisma } = await import("@/lib/db");
    const { TicketStatus } = await import("@prisma/client");
    await prisma.ticket.updateMany({
      where: { publicId: "INC-20150" },
      data: {
        status: TicketStatus.resolved,
        resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    });
    const diegoId = await findDiegoUserId();
    const result = await runEvalTurnAsUser(
      diegoId,
      "Diego Ramos",
      "RH",
      "Minha senha do SAP está bloqueada de novo",
    );
    expect(result.trace.actions).toContain("reopen_ticket");
    expect(result.content).toMatch(/INC-20150/);
  });
});