import { AgentDecisionSchema, type AgentDecision } from "../schemas";
import type { ToolCallRecord } from "../tool-records";
import type { ToolName } from "../tools";
import { REPORT_DECISION_TOOL } from "./tools";

/** Subconjunto do `fullStream` do Mastra usado pelo agent. */
export type StreamChunk = { type: string; payload?: Record<string, unknown> };

export type StreamOutcome = {
  text: string;
  calls: ToolCallRecord[];
  decision?: AgentDecision;
  error?: string;
};

export type StreamHooks = {
  onToken?: (delta: string) => void;
  /** Disparado quando uma ferramenta inicia ou termina (snapshot ordenado). */
  onToolActivity?: (calls: ToolCallRecord[]) => void;
};

const KNOWN_TOOLS = new Set<string>([
  "list_open_tickets",
  "list_recent_resolved",
  "get_ticket",
  "search_kb",
  "create_draft",
  "update_ticket",
  "reopen_ticket",
  "cancel_draft",
  "transfer_to_analyst",
]);

const MAX_ERROR_CHARS = 300;

function errorText(value: unknown): string {
  if (value instanceof Error) return value.message.slice(0, MAX_ERROR_CHARS);
  if (typeof value === "string") return value.slice(0, MAX_ERROR_CHARS);
  try {
    return JSON.stringify(value).slice(0, MAX_ERROR_CHARS);
  } catch {
    return "Erro desconhecido";
  }
}

function asArgs(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/**
 * Consome o stream do agent: repassa tokens, registra chamadas/resultados de ferramentas,
 * captura a decisão de `report_decision` e erros. Não conhece UI nem persistência.
 */
export async function consumeAgentStream(
  stream: AsyncIterable<StreamChunk>,
  hooks: StreamHooks = {},
): Promise<StreamOutcome> {
  const calls: ToolCallRecord[] = [];
  const byId = new Map<string, ToolCallRecord>();
  const decisionIds = new Set<string>();
  let text = "";
  let decision: AgentDecision | undefined;
  let error: string | undefined;

  for await (const chunk of stream) {
    const p = chunk.payload ?? {};
    switch (chunk.type) {
      case "text-delta": {
        const delta = typeof p.text === "string" ? p.text : "";
        if (delta) {
          text += delta;
          hooks.onToken?.(delta);
        }
        break;
      }
      case "tool-call": {
        const name = String(p.toolName ?? "");
        const id = String(p.toolCallId ?? "");
        if (name === REPORT_DECISION_TOOL) {
          decisionIds.add(id);
          const parsed = AgentDecisionSchema.safeParse(p.args);
          if (parsed.success) decision = parsed.data;
          break;
        }
        if (!KNOWN_TOOLS.has(name)) break;
        const record: ToolCallRecord = { name: name as ToolName, args: asArgs(p.args) };
        calls.push(record);
        byId.set(id, record);
        hooks.onToolActivity?.([...calls]);
        break;
      }
      case "tool-result": {
        const record = byId.get(String(p.toolCallId ?? ""));
        if (record) {
          record.result = p.result;
          hooks.onToolActivity?.([...calls]);
        }
        break;
      }
      case "tool-error": {
        const id = String(p.toolCallId ?? "");
        if (decisionIds.has(id)) break;
        const record = byId.get(id);
        if (record) {
          record.error = errorText(p.error);
          hooks.onToolActivity?.([...calls]);
        }
        break;
      }
      case "error":
        error = errorText(p.error);
        break;
      default:
        break;
    }
  }

  return { text, calls, decision, error };
}
