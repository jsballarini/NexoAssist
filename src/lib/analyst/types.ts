export type InboxItem = {
  conversationId: string;
  employeeId: string;
  employeeName: string;
  preview: string;
  state: string;
  unreadCount: number;
  confidenceLast: number | null;
  updatedAt: string;
  assignedAnalystId: string | null;
  assignedAnalystName: string | null;
};