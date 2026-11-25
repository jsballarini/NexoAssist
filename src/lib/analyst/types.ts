export type InboxItem = {
  conversationId: string;
  employeeId: string;
  employeeName: string;
  employeeDepartment?: string;
  linkedTicketId?: string;
  preview: string;
  state: string;
  unreadCount: number;
  confidenceLast: number | null;
  updatedAt: string;
  assignedAnalystId: string | null;
  assignedAnalystName: string | null;
};