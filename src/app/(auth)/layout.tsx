export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white lg:flex-row">
      {children}
      <aside className="relative hidden min-h-screen w-full flex-col justify-between bg-brand-950 p-12 text-white lg:flex lg:w-1/2">
        <div>
          <p className="text-sm font-medium text-brand-200">Nexo Assist</p>
          <h1 className="mt-6 max-w-md text-3xl font-semibold leading-snug">
            Service desk de TI com assistente inteligente
          </h1>
          <p className="mt-4 max-w-sm text-sm text-brand-100/80">
            Abra chamados, consulte a central de ajuda e fale com analistas quando
            precisar.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-brand-100">
          <p className="font-medium text-white">Prévia do chat</p>
          <p className="mt-2 opacity-80">Assistente online — pronto para ajudar.</p>
        </div>
      </aside>
    </div>
  );
}