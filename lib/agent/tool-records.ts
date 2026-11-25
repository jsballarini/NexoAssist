import type { ToolName } from "./tools";
import { isNotFoundResult, isToolFailure } from "./tool-results";

/** Chamada de ferramenta observada em um turno (nome, argumentos, resultado ou erro). */
export type ToolCallRecord = {
  name: ToolName;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
};

export const TOOL_ERROR_KEY = "error";

/**
 * Resultado que sinaliza falha: `{ error }` (erro inesperado), `{ ok: false, code }`
 * (falha esperada e estruturada) ou `{ found: false }` (chamado fora da lista do usuário).
 */
export function isFailedResult(result: unknown): boolean {
  if (isToolFailure(result) || isNotFoundResult(result)) return true;
  return (
    !!result &&
    typeof result === "object" &&
    TOOL_ERROR_KEY in result &&
    typeof (result as Record<string, unknown>)[TOOL_ERROR_KEY] === "string"
  );
}
