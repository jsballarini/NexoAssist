import { getSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function PerfilPage() {
  const session = await getSession();
  if (!session.user) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 flex-col overflow-y-auto p-8">
      <header className="border-b border-gray-200 pb-4">
        <p className="text-sm text-gray-500">Service desk de TI &gt; Meu perfil</p>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">Meu perfil</h1>
      </header>
      <div className="mt-8 max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-sm">
        <dl className="space-y-6">
          <div>
            <dt className="text-sm font-medium text-gray-500">Nome</dt>
            <dd className="mt-1 text-base text-gray-900">{session.user.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">E-mail</dt>
            <dd className="mt-1 text-base text-gray-900">{session.user.email}</dd>
            <p className="mt-1 text-xs text-gray-500">Gerenciado pela TI</p>
          </div>
        </dl>
        <div className="mt-8">
          <Button type="button" variant="outline" disabled>
            Redefinir senha
          </Button>
          <p
            className="mt-2 text-xs text-gray-500"
            data-profile-password-age
          >
            Senha alterada há{" "}
            {process.env.NEXT_PUBLIC_PROFILE_PASSWORD_AGE_DAYS ?? "90"} dias
          </p>
        </div>
      </div>
    </main>
  );
}