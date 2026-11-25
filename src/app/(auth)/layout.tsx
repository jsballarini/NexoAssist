import { NexoMark } from "@/components/ui/icons";

/** Métricas ilustrativas do frame "Identificação" do protótipo (sem API). */
const SHOWCASE_STATS = [
  { value: "8 s", label: "primeira resposta, em média" },
  { value: "72%", label: "resolvidos sem fila" },
  { value: "6", label: "analistas online agora", online: true },
];

function ShowcasePreview() {
  return (
    <div className="mx-auto w-full max-w-md rounded-nexo-lg border border-white/10 bg-white/5 p-5 text-sm">
      <p className="ml-auto w-fit rounded-nexo-md bg-white px-3 py-2 text-nexo-ink">
        Meu notebook não conecta na VPN. Erro 809.
      </p>
      <p className="mt-4 text-xs text-white/50">
        <span className="font-medium text-white/80">Nexo Assist</span> consultou seus chamados · criou
        um chamado
      </p>
      <p className="mt-2 w-fit max-w-[85%] rounded-nexo-md bg-white/10 px-3 py-2 text-white/90">
        Pronto: abri o chamado com prioridade alta. Um analista fala com você em até 4 h úteis.
      </p>
      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-nexo-ink">
        <span className="size-2 rounded-full bg-nexo-warning" />
        <span className="font-semibold">INC-20517</span>
        <span className="text-nexo-ink-3">Rede e VPN · Alta · em até 4 h</span>
      </p>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-white">
      <aside className="hidden min-h-screen w-[55%] flex-col justify-between bg-nexo-ink px-16 pb-12 pt-10 text-white lg:flex">
        <p className="flex items-center gap-2.5 text-base font-semibold">
          <NexoMark className="size-6 text-white" />
          Nexo Assist
        </p>

        <div className="space-y-10">
          <div>
            <p className="text-sm text-white/50">Service desk de TI da Nexo</p>
            <h1 className="mt-3 max-w-xl font-display text-5xl leading-tight font-normal">
              Seu problema de TI, resolvido em uma conversa.
            </h1>
            <p className="mt-5 max-w-md text-base text-white/60">
              Descreva o que está acontecendo. O assistente consulta seus chamados, busca na central de
              ajuda e chama um analista quando precisa.
            </p>
          </div>
          <ShowcasePreview />
        </div>

        <dl className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-6">
          {SHOWCASE_STATS.map((s) => (
            <div key={s.label} className="px-6 first:pl-0">
              <dt className="flex items-center gap-2 font-display text-4xl font-normal">
                {s.value}
                {s.online ? <span className="size-2 rounded-full bg-nexo-success" /> : null}
              </dt>
              <dd className="mt-1 text-sm text-white/50">{s.label}</dd>
            </div>
          ))}
        </dl>
      </aside>
      {children}
    </div>
  );
}
