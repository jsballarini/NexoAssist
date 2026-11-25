import { LoginForm } from "@/components/auth/login-form";
import { NexoMark } from "@/components/ui/icons";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col px-8 py-8 lg:px-16">
      <div className="flex items-center justify-between gap-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-nexo-ink lg:invisible">
          <NexoMark className="size-5 text-brand-500" />
          Nexo Assist
        </p>
        <p className="text-nexo-ink-3">
          Problema para entrar?{" "}
          <a href="tel:4000" className="font-medium text-brand-700 hover:underline">
            Ligue no ramal 4000
          </a>
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
        <h1 className="font-display text-4xl font-normal text-nexo-ink">Entrar</h1>
        <p className="mt-2 text-sm text-nexo-ink-3">
          Use seu e-mail corporativo e a senha da rede Nexo.
        </p>
        <div className="mt-8 border-b border-nexo-rule pb-8">
          <LoginForm />
        </div>
      </div>

      <footer className="flex items-center justify-between gap-4 text-xs text-nexo-ink-3">
        <span>© {new Date().getFullYear()} Nexo · Service desk de TI</span>
        <a href="#privacidade" className="hover:text-nexo-ink hover:underline">
          Privacidade e uso de dados
        </a>
      </footer>
    </main>
  );
}
