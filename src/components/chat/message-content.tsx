import { splitRichText } from "@/lib/chat/rich-text";

/** Parágrafo de mensagem com suporte a `**negrito**` (Markdown mínimo). */
export function MessageContent({ text, className }: { text: string; className?: string }) {
  const parts = splitRichText(text);
  return (
    <p className={className}>
      {parts.map((part, i) =>
        part.kind === "bold" ? (
          <strong key={i}>{part.value}</strong>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </p>
  );
}