/**
 * Converte apenas `**negrito**` em segmentos para React (sem HTML arbitrário).
 * Saídas do LLM e fixtures usam esse padrão; o restante do texto fica literal.
 */
export type RichTextPart = { kind: "text"; value: string } | { kind: "bold"; value: string };

const BOLD_RE = /\*\*([^*]+)\*\*/g;

export function splitRichText(input: string): RichTextPart[] {
  const parts: RichTextPart[] = [];
  let last = 0;
  for (const match of input.matchAll(BOLD_RE)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ kind: "text", value: input.slice(last, start) });
    parts.push({ kind: "bold", value: match[1] });
    last = start + match[0].length;
  }
  if (last < input.length) parts.push({ kind: "text", value: input.slice(last) });
  if (parts.length === 0) parts.push({ kind: "text", value: input });
  return parts;
}