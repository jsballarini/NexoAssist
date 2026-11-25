import { getSession } from "@/lib/auth/session";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { getAnalystPollConfig } from "@/lib/analyst/poll-config";
import { redirect } from "next/navigation";

export default async function AtendimentoPage() {
  const session = await getSession();
  if (!session.user) {
    redirect("/login");
  }

  const { employeeHandoffPollMs } = getAnalystPollConfig();

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-gray-200 px-8 py-4">
        <p className="text-sm text-gray-500">Service desk de TI &gt; Atendimento</p>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">Atendimento</h1>
        <p className="mt-1 text-sm text-green-600">Assistente online</p>
      </header>
      <ChatWorkspace handoffPollMs={employeeHandoffPollMs} />
    </main>
  );
}