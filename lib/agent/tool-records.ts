import type { ToolName } from "./tools";

/** Chamada de ferramenta observada em um turno (nome, argumentos, resultado ou erro). */
export type ToolCallRecord = {
  name: ToolName;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
};

export const TOOL_ERROR_KEY = "error";

/** Resultado de ferramenta que sinaliza falha tratada (execute devolve `{ error }`). */
export function isFailedResult(result: unknown): result is { error: string } {
  return (
    !!result &&
    typeof result === "object" &&
    TOOL_ERROR_KEY in result &&
    typeof (result as Record<string, unknown>)[TOOL_ERROR_KEY] === "string"
  );
}
