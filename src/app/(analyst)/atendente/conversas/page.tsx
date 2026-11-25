import { AnalystWorkspace } from "@/components/analyst/analyst-workspace";
import { getAnalystPollConfig } from "@/lib/analyst/poll-config";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AnalystConversasPage() {
  const session = await getSession();
  if (!session.user || session.user.role !== "analyst") {
    redirect("/login");
  }

  const pollConfig = getAnalystPollConfig();

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AnalystWorkspace
        analystName={session.user.name}
        analystId={session.user.userId}
        pollConfig={pollConfig}
      />
    </main>
  );
}