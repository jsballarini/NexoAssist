import { cn } from "@/utils";
import type { ComponentProps } from "react";

/**
 * Input sem borda/anel para ficar dentro de um contêiner estilizado (composer, busca).
 * Neutraliza os estilos que o `@tailwindcss/forms` aplica a `input[type=text]`.
 */
export function BareInput({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-nexo-ink shadow-none outline-hidden placeholder:text-nexo-ink-3 focus:border-0 focus:shadow-none focus:ring-0 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
