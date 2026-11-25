import { NexoMark } from "@/components/ui/icons";
import type { LoginPreviewTicket, LoginShowcaseStats } from "@/lib/public/login-showcase-stats";

function ShowcasePreview({ ticket }: { ticket: LoginPreviewTicket }) {
  return (
    <div className="mx-auto w-full max-w-[28rem] rounded-nexo-lg border border-white/10 bg-white/[0.06] p-5 text-sm">
      <p className="ml-auto w-fit max-w-[90%] rounded-nexo-md bg-white px-3.5 py-2.5 text-[13px] leading-snug text-nexo-ink">
        Meu notebook não conecta na VPN. Erro 809.
      </p>
      <p className="mt-4 text-xs leading-relaxed text-white/50">
        <span className="font-medium text-white/80">Nexo Assist</span> consultou seus chamados ·
        criou um chamado
      </p>
      <p className="mt-2.5 max-w-[92%] rounded-nexo-md bg-white/10 px-3.5 py-2.5 text-[13px] leading-snug text-white/90">
        Pronto: abri o chamado com prioridade alta. Um analista fala com você em até 4 h úteis.
      </p>
      {ticket ? (
        <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-nexo-ink">
          <span className="size-2 shrink-0 rounded-full bg-nexo-warning" />
          <span className="font-semibold">{ticket.publicId}</span>
          <span className="text-nexo-ink-3">
            {ticket.categoryLabel} · {ticket.priorityLabel} · {ticket.slaHint}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function LoginShowcase({
  stats,
  ticket,
}: {
  stats: LoginShowcaseStats;
  ticket: LoginPreviewTicket;
}) {
  const items = [
    { value: stats.firstResponseLabel, label: "primeira resposta, em média" },
    { value: stats.resolvedWithoutQueueLabel, label: "resolvidos sem fila" },
    { value: stats.analystsOnlineLabel, label: "analistas online agora", online: true },
  ] as const;

  return (
    <aside className="hidden min-h-screen w-1/2 flex-col justify-between bg-nexo-ink px-16 pb-12 pt-10 text-white lg:flex">
      <p className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
        <NexoMark className="size-6 text-white" />
        Nexo Assist
      </p>

      <div className="space-y-12">
        <div>
          <p className="text-sm font-normal text-white/50">Service desk de TI da Nexo</p>
          <h1 className="mt-3 max-w-[36rem] font-newsreader text-[48px] leading-[1.12] font-normal tracking-tight">
            Seu problema de TI, resolvido em uma conversa.
          </h1>
          <p className="mt-5 max-w-[32rem] text-base leading-relaxed text-white/60">
            Descreva o que está acontecendo. O assistente consulta seus chamados, busca na central de
            ajuda e chama um analista quando precisa.
          </p>
        </div>
        <ShowcasePreview ticket={ticket} />
      </div>

      <dl className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-6">
        {items.map((s) => (
          <div key={s.label} className="px-6 first:pl-0 last:pr-0">
            <dt className="flex items-center gap-2 font-newsreader text-[40px] leading-none font-normal tracking-tight">
              {s.value}
              {"online" in s && s.online ? (
                <span className="size-2 rounded-full bg-nexo-success" aria-hidden />
              ) : null}
            </dt>
            <dd className="mt-1.5 text-sm leading-snug text-white/50">{s.label}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}