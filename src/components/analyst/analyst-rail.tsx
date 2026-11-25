"use client";

import { ChatIcon, LogoutIcon, NexoMark } from "@/components/ui/icons";
import { PersonAvatar } from "./person-avatar";

/** Trilho lateral do console (protótipo): marca, atalho de Conversas com contador e usuário. */
export function AnalystRail({ analystName, waitingCount }: { analystName: string; waitingCount: number }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <nav
      className="flex w-14 shrink-0 flex-col items-center gap-4 border-r border-nexo-rule bg-nexo-desk py-4"
      aria-label="Navegação do atendente"
    >
      <NexoMark className="size-6 text-brand-500" />
      <span
        className="relative mt-2 flex size-9 items-center justify-center rounded-nexo-md bg-white text-brand-600 shadow-theme-xs"
        aria-current="page"
        title="Conversas"
      >
        <ChatIcon className="size-5" />
        {waitingCount > 0 ? (
          <span
            className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] leading-4 font-semibold text-white"
            aria-label={`${waitingCount} aguardando atendente`}
          >
            {waitingCount}
          </span>
        ) : null}
      </span>
      <div className="mt-auto flex flex-col items-center gap-3">
        <span title={analystName}>
          <PersonAvatar name={analystName} size="sm" />
        </span>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-nexo-sm p-1 text-nexo-ink-3 hover:text-nexo-ink"
          aria-label="Sair"
          title="Sair"
        >
          <LogoutIcon className="size-4" />
        </button>
      </div>
    </nav>
  );
}
