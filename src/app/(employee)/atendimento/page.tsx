import { getSession } from "@/lib/auth/session";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { AssistantOnlineBadge, EmployeeTopBar } from "@/components/employee/employee-top-bar";
import { getAnalystPollConfig } from "@/lib/analyst/poll-config";
import { redirect } from "next/navigation";

export default async function AtendimentoPage() {
  const session = await getSession();
  if (!session.user) {
    redirect("/login");
  }

  const { employeeHandoffPollMs } = getAnalystPollConfig();

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <EmployeeTopBar current="Atendimento" status={<AssistantOnlineBadge />} />
      <ChatWorkspace handoffPollMs={employeeHandoffPollMs} />
    </main>
  );
}
