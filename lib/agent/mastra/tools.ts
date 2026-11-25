import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { AgentAdapters, AgentUserContext } from "../adapters";
import { AgentDecisionSchema } from "../schemas";
import { runTool, type ToolName } from "../tools";
import type { ToolExtras } from "../transfer-tool";

export const REPORT_DECISION_TOOL = "report_decision";

const MAX_ERROR_CHARS = 200;

const ticketTypeSchema = z.enum(["INC", "REQ"]);
const categorySchema = z.enum(["acesso", "rede_vpn", "hardware", "software", "email", "outros"]);
const prioritySchema = z.enum(["critical", "high", "medium", "low"]);
const scopeSchema = z.enum(["only_me", "team", "organization"]);
const urgencySchema = z.enum(["low", "has_workaround", "same_day_commitment", "blocking_work"]);

const createDraftFields = {
  type: ticketTypeSchema.optional().describe("INC (algo parou) ou REQ (pedido)."),
  category: categorySchema.optional(),
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(3).max(2000).optional(),
  impact: scopeSchema
    .optional()
    .describe("Quem é afetado: only_me, team ou organization. Pergunte ao funcionário."),
  urgency: urgencySchema
    .optional()
    .describe(
      "low (sem pressa), has_workaround (atrapalha mas há alternativa), same_day_commitment (compromisso hoje) ou blocking_work (trabalho parado).",
    ),
};

const draftFields = {
  targetTicketId: z.string().optional().describe("ID público do chamado (INC-/REQ-) para update ou reopen."),
  type: ticketTypeSchema.optional().describe("INC (algo parou) ou REQ (pedido)."),
  category: categorySchema.optional(),
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(3).max(2000).optional(),
  priority: prioritySchema.optional(),
  affectedScope: scopeSchema.optional().describe("only_me, team ou organization."),
};

/** Converte erros de ferramenta em resultado seguro para o modelo (sem vazar existência de terceiros). */
export function describeToolError(error: unknown): string {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : "Falha desconhecida";
  return `${name}: ${message}`.slice(0, MAX_ERROR_CHARS);
}

/**
 * Ferramentas do agent Mastra. O solicitante vem sempre de `ctx` (nunca do modelo) e a
 * execução delega a `runTool`, que fala só com os adapters injetados.
 */
export function createMastraTools(
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  extras: ToolExtras = {},
) {
  const exec =
    (name: ToolName) =>
    async (args: Record<string, unknown>): Promise<unknown> => {
      try {
        return await runTool(name, args, ctx, adapters, extras);
      } catch (error) {
        return { error: describeToolError(error) };
      }
    };

  return {
    list_open_tickets: createTool({
      id: "list_open_tickets",
      description: "Lista os chamados abertos do funcionário atual (com status e se o prazo venceu).",
      inputSchema: z.object({}),
      execute: exec("list_open_tickets"),
    }),
    list_recent_resolved: createTool({
      id: "list_recent_resolved",
      description: "Lista chamados resolvidos recentemente do funcionário (padrão: últimos 7 dias).",
      inputSchema: z.object({ withinDays: z.number().int().min(1).max(30).optional() }),
      execute: exec("list_recent_resolved"),
    }),
    get_ticket: createTool({
      id: "get_ticket",
      description: "Consulta um chamado do funcionário pelo ID público (ex.: INC-20311).",
      inputSchema: z.object({ publicId: z.string().min(3) }),
      execute: exec("get_ticket"),
    }),
    search_kb: createTool({
      id: "search_kb",
      description: "Busca artigos na central de ajuda. Use antes de abrir chamado para dúvidas.",
      inputSchema: z.object({ query: z.string().min(2).max(200) }),
      execute: exec("search_kb"),
    }),
    create_draft: createTool({
      id: "create_draft",
      description:
        "Cria um RASCUNHO de chamado para o funcionário confirmar (nunca cria o chamado direto). " +
        "operation: create, update (complementar chamado aberto) ou reopen (resolvido há até 7 dias). " +
        "Em create, a prioridade é calculada por impact × urgency (não envie priority) e todos os campos " +
        "(title, description, type, category, impact, urgency) são obrigatórios: se faltar algum, a ferramenta " +
        "devolve DRAFT_INCOMPLETE; se houver chamado parecido, devolve DUPLICATE_CANDIDATE.",
      inputSchema: z.object({
        operation: z.enum(["create", "update", "reopen"]).default("create"),
        targetTicketId: z.string().optional().describe("ID público do chamado para update ou reopen."),
        priority: prioritySchema.optional().describe("Só para update/reopen; ignorada em create."),
        confirmedNew: z
          .boolean()
          .optional()
          .describe("true quando o funcionário confirmou que NÃO é o mesmo problema de um chamado existente."),
        ...createDraftFields,
      }),
      execute: exec("create_draft"),
    }),
    update_ticket: createTool({
      id: "update_ticket",
      description: "Atalho para rascunho de atualização de um chamado aberto do funcionário.",
      inputSchema: z.object(draftFields),
      execute: exec("update_ticket"),
    }),
    reopen_ticket: createTool({
      id: "reopen_ticket",
      description: "Atalho para rascunho de reabertura de chamado resolvido há até 7 dias.",
      inputSchema: z.object(draftFields),
      execute: exec("reopen_ticket"),
    }),
    cancel_draft: createTool({
      id: "cancel_draft",
      description: "Cancela um rascunho pendente do funcionário.",
      inputSchema: z.object({ draftId: z.string().min(2) }),
      execute: exec("cancel_draft"),
    }),
    transfer_to_analyst: createTool({
      id: "transfer_to_analyst",
      description:
        "Transfere a conversa para um analista humano e pausa o assistente. " +
        "Informe o motivo, o problema em uma frase e o que já foi tentado; se o caso é sobre um chamado, " +
        "passe ticketId.",
      inputSchema: z.object({
        reason: z.string().min(3).max(500),
        problem: z.string().max(500).optional().describe("O problema do funcionário em uma frase."),
        stepsTried: z.array(z.string().max(200)).max(10).optional().describe("O que já foi tentado."),
        ticketId: z.string().optional().describe("ID público do chamado relacionado (INC-/REQ-)."),
      }),
      execute: exec("transfer_to_analyst"),
    }),
    [REPORT_DECISION_TOOL]: createTool({
      id: REPORT_DECISION_TOOL,
      description:
        "OBRIGATÓRIA, exatamente uma vez por turno, depois das demais ferramentas e antes da " +
        "resposta final: registra o que você entendeu, sua confiança como inteiro 0-100 (ex.: 85) e o porquê das ações.",
      inputSchema: AgentDecisionSchema,
      execute: async () => ({ ok: true }),
    }),
  };
}
