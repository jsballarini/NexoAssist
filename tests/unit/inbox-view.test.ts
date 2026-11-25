import { describe, expect, it } from "vitest";
import {
  countByFilter,
  filterInbox,
  firstName,
  inboxContext,
  matchesFilter,
  previewPrefix,
} from "@/lib/analyst/inbox-view";
import type { InboxItem } from "@/lib/analyst/types";

const ME = "analyst-1";

function item(overrides: Partial<InboxItem>): InboxItem {
  return {
    conversationId: "c1",
    employeeId: "e1",
    employeeName: "Ana Souza",
    preview: "Está parado há 5 dias",
    previewRole: "user",
    state: "awaiting_analyst",
    unreadCount: 0,
    confidenceLast: null,
    updatedAt: new Date().toISOString(),
    assignedAnalystId: null,
    assignedAnalystName: null,
    lastAnalystId: null,
    isHandback: false,
    needsReview: false,
    inboxKind: "handoff",
    ...overrides,
  };
}

const items = [
  item({ conversationId: "a", linkedTicketId: "INC-20311" }),
  item({ conversationId: "b", employeeName: "Bruno Tavares", state: "with_agent", needsReview: true, confidenceLast: 41, inboxKind: "review" }),
  item({ conversationId: "c", employeeName: "Carla Mendes", state: "with_analyst", assignedAnalystId: ME }),
];

describe("inbox view", () => {
  it("counts each chip independently of the search", () => {
    expect(countByFilter(items, ME)).toEqual({
      all: 3,
      for_you: 1,
      with_agent: 1,
      mine: 1,
      closed: 0,
    });
  });

  it("routes returned conversations to Com o agent, not Minhas", () => {
    const returned = item({
      conversationId: "d",
      state: "with_agent",
      assignedAnalystId: null,
      lastAnalystId: ME,
      isHandback: true,
      inboxKind: "handoff",
    });
    expect(matchesFilter(returned, "mine", ME)).toBe(false);
    expect(matchesFilter(returned, "with_agent", ME)).toBe(true);
    expect(inboxContext({ ...returned, lastAnalystId: null }, ME).label).toContain("Agent retomou");
  });

  it("filters by chip and searches name, preview and linked ticket", () => {
    expect(filterInbox(items, "for_you", "", ME).map((i) => i.conversationId)).toEqual(["a"]);
    expect(filterInbox(items, "all", "inc-20311", ME).map((i) => i.conversationId)).toEqual(["a"]);
    expect(filterInbox(items, "with_agent", "bruno", ME)).toHaveLength(1);
  });

  it("describes the context line like the prototype", () => {
    expect(inboxContext(items[0], ME)).toEqual({ tone: "danger", label: "Transferida · INC-20311" });
    expect(inboxContext(items[1], ME)).toEqual({ tone: "warning", label: "Agent pediu ajuda · confiança 41%" });
    expect(inboxContext(items[2], ME)).toEqual({ tone: "info", label: "Você está atendendo" });
    expect(inboxContext({ ...items[2], assignedAnalystId: "x", assignedAnalystName: "Mariana" }, ME).label).toBe(
      "Mariana atendendo",
    );
  });

  it("routes closed conversations only to Encerrados", () => {
    const closed = item({ conversationId: "z", state: "closed", inboxKind: "closed" });
    expect(matchesFilter(closed, "closed", ME)).toBe(true);
    expect(matchesFilter(closed, "all", ME)).toBe(false);
    expect(inboxContext(closed, ME)).toEqual({ tone: "neutral", label: "Sessão encerrada" });
    expect(countByFilter([...items, closed], ME).closed).toBe(1);
  });

  it("prefixes agent previews and extracts first names", () => {
    expect(previewPrefix(item({ previewRole: "assistant" }))).toBe("Nexo: ");
    expect(previewPrefix(item({ previewRole: "user" }))).toBe("");
    expect(firstName("Ana Souza")).toBe("Ana");
  });
});
