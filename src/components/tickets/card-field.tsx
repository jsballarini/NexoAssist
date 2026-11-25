import { cn } from "@/utils";

/** Campo "rótulo em cima, valor embaixo" dos cards de chamado/rascunho do protótipo. */
export function CardField({
  label,
  children,
  className,
  field,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  /** Valor de `data-draft-field` (contrato dos testes E2E do card de rascunho). */
  field?: string;
}) {
  return (
    <div className={cn("min-w-0", className)} data-draft-field={field}>
      <dt className="text-xs text-nexo-ink-3">{label}</dt>
      <dd className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm font-medium text-nexo-ink">
        {children}
      </dd>
    </div>
  );
}
