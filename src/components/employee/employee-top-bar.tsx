import { ChevronRightIcon } from "@/components/ui/icons";

/** Barra superior das telas do funcionário: breadcrumb + status opcional à direita. */
export function EmployeeTopBar({
  current,
  status,
}: {
  current: string;
  status?: React.ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-nexo-rule bg-white px-6">
      <nav aria-label="Trilha" className="flex items-center gap-1.5 text-sm">
        <span className="text-nexo-ink-3">Service desk de TI</span>
        <ChevronRightIcon className="size-3.5 text-nexo-ink-3" />
        <span className="font-medium text-nexo-ink" aria-current="page">
          {current}
        </span>
      </nav>
      {status}
    </header>
  );
}

export function AssistantOnlineBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-nexo-success-soft px-2.5 py-1 text-xs font-medium text-nexo-success-text">
      <span className="size-1.5 rounded-full bg-nexo-success" />
      Assistente online
    </span>
  );
}
