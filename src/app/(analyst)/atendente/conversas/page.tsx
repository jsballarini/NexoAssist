import { LogoutLink } from "@/components/auth/logout-link";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AnalystConversasPage() {
  const session = await getSession();
  if (!session.user || session.user.role !== "analyst") {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col bg-gray-50 p-10">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Conversas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Console do analista — entrega completa na Fase 5 (M5).
        </p>
      </header>
      <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-8">
        <p className="text-gray-700">Olá, {session.user.name}.</p>
        <p className="mt-2 text-sm text-gray-500">Fila e handoff serão implementados em M5.</p>
        <div className="mt-6">
          <LogoutLink />
        </div>
      </div>
    </main>
  );
}