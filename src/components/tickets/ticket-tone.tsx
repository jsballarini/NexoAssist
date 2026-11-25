import { cn } from "@/utils";

type Tone = "info" | "warning" | "success" | "danger" | "violet" | "neutral";

const DOT_CLASS: Record<Tone, string> = {
  info: "bg-brand-500",
  warning: "bg-nexo-warning",
  success: "bg-nexo-success",
  danger: "bg-nexo-danger",
  violet: "bg-nexo-violet",
  neutral: "bg-gray-400",
};

const PILL_CLASS: Record<Tone, string> = {
  info: "bg-brand-50 text-brand-700",
  warning: "bg-nexo-warning-soft text-nexo-warning-text",
  success: "bg-nexo-success-soft text-nexo-success-text",
  danger: "bg-nexo-danger-soft text-nexo-danger-text",
  violet: "bg-violet-50 text-nexo-violet-text",
  neutral: "bg-gray-100 text-gray-700",
};

const STATUS_TONE: Record<string, Tone> = {
  open: "info",
  in_progress: "info",
  in_service: "info",
  waiting_analyst: "warning",
  approved: "violet",
  resolved: "success",
};

const STATUS_LABEL_TONE: Record<string, Tone> = {
  Aberto: "info",
  "Em andamento": "info",
  "Em atendimento": "info",
  "Aguardando analista": "warning",
  Aprovado: "violet",
  Resolvido: "success",
};

const PRIORITY_TONE: Record<string, Tone> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

/** Tom visual de um status de chamado; SLA vencido sempre vira perigo. */
export function statusTone(input: { status?: string; statusLabel?: string; slaBreached?: boolean }): Tone {
  if (input.slaBreached) return "danger";
  return (
    (input.status && STATUS_TONE[input.status]) ||
    (input.statusLabel && STATUS_LABEL_TONE[input.statusLabel]) ||
    "neutral"
  );
}

/** Tom visual de uma prioridade (`critical`…`low`). */
export function priorityTone(priority?: string): Tone {
  return (priority && PRIORITY_TONE[priority]) || "neutral";
}

/** Ponto colorido de 8px usado em status e prioridade. */
export function ToneDot({ tone, className }: { tone: Tone; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", DOT_CLASS[tone], className)} />;
}

/** Selo arredondado com ponto + rótulo (ex.: "Aguardando confirmação"). */
export function TonePill({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        PILL_CLASS[tone],
        className,
      )}
    >
      <ToneDot tone={tone} />
      {children}
    </span>
  );
}

export type { Tone };
