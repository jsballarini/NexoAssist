import { EmployeeTopBar } from "@/components/employee/employee-top-bar";
import { PasswordResetButton } from "@/components/employee/password-reset-button";
import { KeyIcon, LockIcon, MailIcon } from "@/components/ui/icons";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

const DEFAULT_PASSWORD_AGE_DAYS = 42;

function passwordAgeDays(): number {
  const raw = Number(process.env.NEXT_PUBLIC_PROFILE_PASSWORD_AGE_DAYS);
  return Number.isInteger(raw) && raw >= 0 ? raw : DEFAULT_PASSWORD_AGE_DAYS;
}

function ProfileRow({ label, value, aside }: { label: string; value: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <dt className="w-36 shrink-0 text-sm text-nexo-ink-3">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-sm font-medium text-nexo-ink">{value}</dd>
      {aside}
    </div>
  );
}

/** Tela "Meu perfil" (protótipo): dados de acesso somente leitura + bloco de senha. */
export default async function PerfilPage() {
  const session = await getSession();
  if (!session.user) {
    redirect("/login");
  }
  const { name, email } = session.user;
  const ageDays = passwordAgeDays();

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <EmployeeTopBar current="Meu perfil" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[540px] px-4 py-10">
          <h1 className="font-display text-2xl font-medium text-nexo-ink">Meu perfil</h1>
          <p className="mt-1 text-sm text-nexo-ink-3">Seus dados de acesso ao service desk de TI.</p>

          <dl className="mt-6 divide-y divide-nexo-rule rounded-nexo-lg border border-nexo-rule bg-white shadow-theme-xs">
            <ProfileRow label="Nome" value={name} />
            <ProfileRow
              label="E-mail corporativo"
              value={email}
              aside={
                <span className="flex shrink-0 items-center gap-1 text-xs text-nexo-ink-3">
                  <LockIcon className="size-3.5" />
                  Gerenciado pela TI
                </span>
              }
            />
          </dl>

          <section className="mt-5 overflow-hidden rounded-nexo-lg border border-nexo-rule bg-white shadow-theme-xs">
            <div className="flex items-start gap-3 px-4 py-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nexo-desk text-nexo-ink-2">
                <KeyIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-nexo-ink">Senha</h2>
                <p className="text-xs text-nexo-ink-3" data-profile-password-age>
                  Alterada há {ageDays} dias
                </p>
              </div>
              <PasswordResetButton />
            </div>
            <p className="flex items-center gap-1.5 border-t border-nexo-rule bg-nexo-desk px-4 py-2 text-xs text-nexo-ink-3">
              <MailIcon className="size-3.5" />
              Enviaremos um link de redefinição para {email}.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
