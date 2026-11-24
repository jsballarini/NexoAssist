import { prisma } from "@/lib/db";
import { TicketForbiddenError } from "@/lib/ticket-service/errors";
import { TicketServiceImpl } from "@/lib/ticket-service/impl/service";
import { describe, expect, it, vi } from "vitest";

describe("UNIT-RBAC-01", () => {
  it("negar leitura de ticket de outro requester", async () => {
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      publicId: "INC-20150",
      requesterId: "user-diego",
      title: "x",
      description: "y",
      type: "INC",
      category: "acesso",
      priority: "medium",
      status: "resolved",
      affectedScope: "only_me",
      openedAt: new Date(),
      dueAt: new Date(),
      lastUpdatedAt: new Date(),
      resolvedAt: new Date(),
    });

    const svc = new TicketServiceImpl();
    await expect(svc.getById("user-ana", "INC-20150")).rejects.toBeInstanceOf(
      TicketForbiddenError,
    );

    vi.restoreAllMocks();
  });
});