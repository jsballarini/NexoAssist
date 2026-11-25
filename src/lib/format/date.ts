const TIME_ZONE = "America/Sao_Paulo";

const clockFormat = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const shortDateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: TIME_ZONE,
});

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

function toDate(value: string | Date): Date | null {
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Hora curta "10:05" no fuso de São Paulo; "" para datas inválidas. */
export function formatClock(value: string | Date | undefined): string {
  const d = value ? toDate(value) : null;
  return d ? clockFormat.format(d) : "";
}

/** Data curta "16 out" (sem ponto final do mês abreviado). */
export function formatShortDate(value: string | Date | undefined): string {
  const d = value ? toDate(value) : null;
  return d ? shortDateFormat.format(d).replace(/\./g, "").replace(" de ", " ") : "";
}

/** Data e hora curtas "16 out, 14:20". */
export function formatDateTime(value: string | Date | undefined): string {
  const d = value ? toDate(value) : null;
  return d ? `${formatShortDate(d)}, ${formatClock(d)}` : "";
}

/** Prazo: só a hora quando vence hoje, senão "16 out, 14:20". */
export function formatDeadline(value: string | Date | undefined, now: Date = new Date()): string {
  const d = value ? toDate(value) : null;
  if (!d) return "";
  return dayKeyFormat.format(d) === dayKeyFormat.format(now) ? formatClock(d) : formatDateTime(d);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Idade em dias inteiros: "hoje", "há 1 dia", "há N dias". */
export function formatDaysAgo(value: string | Date | undefined, now: Date = new Date()): string {
  const d = value ? toDate(value) : null;
  if (!d) return "";
  const days = Math.max(0, Math.floor((now.getTime() - d.getTime()) / DAY_MS));
  if (days === 0) return "hoje";
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

/**
 * Rótulo de tempo de item de lista no estilo do protótipo: hora se hoje,
 * "ontem" se ontem, senão data curta.
 */
export function formatListTime(value: string | Date | undefined, now: Date = new Date()): string {
  const d = value ? toDate(value) : null;
  if (!d) return "";
  const day = dayKeyFormat.format(d);
  if (day === dayKeyFormat.format(now)) return formatClock(d);
  const yesterday = new Date(now.getTime() - DAY_MS);
  if (day === dayKeyFormat.format(yesterday)) return "ontem";
  return formatShortDate(d);
}
