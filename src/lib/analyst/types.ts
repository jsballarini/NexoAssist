/** `handoff`: transferência/assumida ou devolvida ao agent após humano; `review`: baixa confiança; `closed`: arquivada pelo analista. */
export type InboxKind = "handoff" | "review" | "closed";

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
  /** Último analista que enviou mensagem (p. ex. após devolver ao agent). */
  lastAnalystId: string | null;
  /** `with_agent` após handoff humano (devolvida ao Nexo), monitorada em "Com o agent". */
  isHandback: boolean;
  /** Último turno do agent com baixa confiança ("agent sem segurança"). */
  needsReview: boolean;
  inboxKind: InboxKind;
};
