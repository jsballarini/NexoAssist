/** `handoff`: conversa transferida/assumida; `review`: com o agent, mas com baixa segurança. */
export type InboxKind = "handoff" | "review";

export type InboxItem = {
  conversationId: string;
  employeeId: string;
  employeeName: string;
  employeeDepartment?: string;
  linkedTicketId?: string;
  preview: string;
  /** Papel do autor da última mensagem (`user`, `assistant`, `analyst`, `system`). */
  previewRole: string | null;
  state: string;
  unreadCount: number;
  confidenceLast: number | null;
  updatedAt: string;
  assignedAnalystId: string | null;
  assignedAnalystName: string | null;
  /** Último turno do agent com baixa confiança ("agent sem segurança"). */
  needsReview: boolean;
  inboxKind: InboxKind;
};
