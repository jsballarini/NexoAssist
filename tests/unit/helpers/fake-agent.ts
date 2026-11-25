import type { AgentAdapters, AgentUserContext } from "../../../lib/agent/adapters";
import type { HandoffSummary } from "../../../lib/agent/handoff-summary";

export const FAKE_CTX: AgentUserContext = {
  userId: "user-from-session",
  userName: "Pessoa Teste",
  department: "TI",
  conversationId: "conv-1",
};

export type FakeCalls = {
  listOpen: string[];
  createDraft: { requesterId: string; operation: string; payload: unknown }[];
  transfer: { conversationId: string; reason: string; summary?: HandoffSummary }[];
  summaryPatches: { conversationId: string; patch: Partial<HandoffSummary> }[];
  ticketTransfer: { requesterId: string; publicId: string; reason: string }[];
};

/** Adapters em memória que registram com qual `requesterId` cada chamada foi feita. */
export function createFakeAdapters(opts?: {
  openTickets?: { id: string; title: string; slaBreached?: boolean }[];
}): { adapters: AgentAdapters; calls: FakeCalls } {
  const calls: FakeCalls = { listOpen: [], createDraft: [],
    transfer: [],
    summaryPatches: [],
    ticketTransfer: [],
  };
  const defaultOpen = [
    {
      id: "INC-1",
      title: "VPN caiu",
      statusLabel: "Em atendimento",
      slaBreached: true,
    },
  ];
  const openTickets = opts?.openTickets ?? defaultOpen;
  const adapters: AgentAdapters = {
    ticketClient: {
      async listOpen(requesterId) {
        calls.listOpen.push(requesterId);
        return openTickets.map((t) => ({
          ...t,
          statusLabel: "Em atendimento",
        })) as never;
      },
      async listRecentResolved() {
        return [];
      },
      async getById(_requesterId, publicId) {
        if (publicId === "INC-404") {
          const err = new Error("not owner");
          err.name = "TicketForbiddenError";
          throw err;
        }
        return { id: publicId, title: "Chamado", statusLabel: "Aberto", slaBreached: false } as never;
      },
      async createDraft(requesterId, operation, payload) {
        calls.createDraft.push({ requesterId, operation, payload });
        return {
          draftId: "D-1",
          operation,
          title: payload.title ?? "Rascunho",
          priority: payload.priority ?? "medium",
          dueAtPreview: new Date().toISOString(),
          affectedScope: payload.affectedScope,
        };
      },
      async cancelDraft() {},
      async transfer(requesterId, publicId, reason) {
        calls.ticketTransfer.push({ requesterId, publicId, reason });
        return { id: publicId, status: "waiting_analyst", transferReason: reason } as never;
      },
    },
    kbSearch: async () => [],
    conversationClient: {
      async transferToAnalyst(conversationId, reason, summary) {
        calls.transfer.push({ conversationId, reason, summary });
      },
      async updateHandoffSummary(conversationId, patch) {
        calls.summaryPatches.push({ conversationId, patch });
      },
    },
  };
  return { adapters, calls };
}
