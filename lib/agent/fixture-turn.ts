import type { AgentAdapters, AgentUserContext, TurnResult } from "./adapters";
import { resolveDraftOperation } from "../../src/lib/domain/dedup";
import {
  classifyOutOfScope,
  inferRulesFromContent,
  normalizeConfidence,
  outOfScopeReply,
} from "../../src/lib/domain/rules";
import type { UiBlock } from "../../src/lib/conversation/types";
import type { DraftSummary } from "./draft-types";
import { collectEvidence } from "./evidence";
import { EMPTY_TURN_CONTEXT, type TurnContext } from "./turn-context";
import { runTool, type ToolName } from "./tools";
import type { ToolCallRecord } from "./tool-records";
import { applyTransferPolicy } from "./transfer-step";
import { userRequestedAnalyst } from "./transfer-policy";
import {
  isLegacyUnavailable,
  isNotFoundResult,
  isToolFailure,
  LEGACY_UNAVAILABLE_QUICK_REPLIES,
  LEGACY_UNAVAILABLE_REPLY,
  toToolFailure,
} from "./tool-results";
import type { ImpactScope, Urgency } from "../../src/lib/domain/priority";

const TICKET_ID_PATTERN = /\b(?:inc|req)-\d+\b/i;
const STATUS_LIST_PATTERN =
  /(status|andamento|situa[cç][aã]o).*(chamado|ticket)|meus (chamados|tickets)|(chamados?|tickets?) abert/;
const SAP_RESET_PATTERN = /sap.*(bloquead|senha)|senha.*sap/;
const VPN_WIN11_PATTERN = /vpn.*(win\s*11|windows\s*11)|win\s*11.*vpn|windows\s*11.*vpn/;
const SCOPE_QUESTION = "quem é afetado";
const SCOPE_QUICK_REPLIES = ["Só eu", "Equipe (5–20)", "Organização inteira"];
const DUPLICATE_QUICK_REPLIES = ["Sim, é o mesmo problema", "Não, é um problema novo"];
const SCOPE_REPLIES: { pattern: RegExp; scope: ImpactScope }[] = [
  { pattern: /^(só eu|somente eu|apenas eu)/, scope: "only_me" },
  { pattern: /^equipe/, scope: "team" },
  { pattern: /^organiza/, scope: "organization" },
];
const PRIORITY_PT: Record<DraftSummary["priority"], string> = {
  critical: "crítica",
  high: "alta",
  medium: "média",
  low: "baixa",
};
const URGENCY_FROM_PRIORITY: Record<DraftSummary["priority"], Urgency> = {
  critical: "blocking_work",
  high: "same_day_commitment",
  medium: "has_workaround",
  low: "low",
};

function extractTicketId(input: string): string | undefined {
  return input.match(TICKET_ID_PATTERN)?.[0].toUpperCase();
}

function scopeFromReply(lower: string) {
  return SCOPE_REPLIES.find((r) => r.pattern.test(lower))?.scope;
}

/** Retorna o rascunho só quando o resultado da tool é de fato um `DraftSummary`. */
function asDraft(value: unknown): DraftSummary | undefined {
  return value && typeof value === "object" && "draftId" in value ? (value as DraftSummary) : undefined;
}

/** Texto da pergunta de duplicidade quando a tool devolve `DUPLICATE_CANDIDATE`. */
function duplicateReply(value: unknown): string | undefined {
  if (!isToolFailure(value) || value.code !== "DUPLICATE_CANDIDATE") return undefined;
  const verb = value.duplicate.operation === "reopen" ? "resolvido recentemente" : "aberto";
  return `Você já tem o chamado ${value.duplicate.targetTicketId} (${verb}) parecido com este. É o mesmo problema?`;
}

/** Mesma resposta para chamado inexistente e de terceiros (não vaza existência). */
function notFoundReply(ticketId: string): string {
  return `Não encontrei o chamado ${ticketId} entre os seus chamados. Confira o número ou peça para ver seus chamados abertos.`;
}

function notFoundBlocks(confidence: number): UiBlock[] {
  return [
    { type: "confidence", value: confidence },
    { type: "quick_replies", options: ["Ver meus chamados abertos"] },
  ];
}

function notFoundPlan(ticketId: string): Plan {
  return {
    tools: [],
    understanding: `Chamado ${ticketId} não está entre os chamados do funcionário.`,
    reply: notFoundReply(ticketId),
    confidence: 81,
    uiBlocks: () => notFoundBlocks(81),
  };
}

async function isTicketVisible(
  adapters: AgentAdapters,
  ctx: AgentUserContext,
  publicId: string,
): Promise<boolean> {
  try {
    await adapters.ticketClient.getById(ctx.userId, publicId);
    return true;
  } catch (error) {
    if (isNotFoundResult(toToolFailure(error))) return false;
    throw error;
  }
}

function draftBlocks(d: DraftSummary | undefined, confidence: number): UiBlock[] {
  const blocks: UiBlock[] = [];
  if (d) {
    blocks.push({
      type: "draft_card",
      draftId: d.draftId,
      operation: d.operation,
      title: d.title,
      priority: d.priority,
      dueAtPreview: d.dueAtPreview,
      affectedScope: d.affectedScope,
      ticketType: d.type,
      category: d.category,
      description: d.description,
    });
  }
  blocks.push({ type: "confidence", value: confidence });
  return blocks;
}

/**
 * Procura, no histórico, a pergunta "quem é afetado?" do fixture e devolve a mensagem
 * original do funcionário que a motivou (fluxo VPN em dois passos).
 */
function findScopeQuestionOrigin(turnContext: TurnContext): string | undefined {
  const { messages } = turnContext;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role === "assistant" && m.content.toLowerCase().includes(SCOPE_QUESTION)) {
      return messages
        .slice(0, i)
        .reverse()
        .find((x) => x.role === "user")?.content;
    }
  }
  return undefined;
}

function buildVpnDraftPlan(originalMessage: string, scope: ImpactScope): Plan {
  return {
    tools: [
      {
        name: "create_draft",
        args: {
          operation: "create",
          type: "INC",
          category: "rede_vpn",
          title: "VPN Windows 11 — reunião 14h",
          description: originalMessage,
          impact: scope,
          urgency: "same_day_commitment",
        },
      },
    ],
    understanding: "Novo problema VPN Windows 11 com compromisso no mesmo dia; abrangência informada.",
    reply: (data) => {
      const d = asDraft(data[0]);
      if (d) {
        return `Preparei o rascunho ${d.draftId} (prioridade ${PRIORITY_PT[d.priority]}). SLA previsto: ${new Date(d.dueAtPreview).toLocaleString("pt-BR")}. Confirme no card abaixo.`;
      }
      return duplicateReply(data[0]) ?? "Não consegui preparar o rascunho agora. Posso chamar um analista.";
    },
    confidence: 78,
    uiBlocks: (data) => {
      const d = asDraft(data[0]);
      if (d) return draftBlocks(d, 78);
      return duplicateReply(data[0])
        ? [
            { type: "confidence", value: 78 },
            { type: "quick_replies", options: DUPLICATE_QUICK_REPLIES },
          ]
        : [{ type: "confidence", value: 78 }];
    },
  };
}

type Plan = {
  tools: { name: ToolName; args: Record<string, unknown> }[];
  understanding: string;
  reply: string | ((data: unknown[]) => string);
  confidence: number;
  uiBlocks?: (data: unknown[]) => UiBlock[];
  rulesOverride?: string[];
};

async function matchPlan(
  input: string,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  turnContext: TurnContext,
): Promise<Plan> {
  const lower = input.toLowerCase().trim();

  const pending = turnContext.pendingDraft;
  const replyScope = scopeFromReply(lower);
  if (pending && replyScope) {
    return {
      tools: [
        { name: "cancel_draft", args: { draftId: pending.draftId } },
        {
          name: "create_draft",
          args: {
            operation: pending.operation,
            targetTicketId: pending.targetTicketId,
            type: "INC",
            category: /vpn/i.test(pending.title) ? "rede_vpn" : "outros",
            title: pending.title,
            description: pending.title,
            impact: replyScope,
            urgency: URGENCY_FROM_PRIORITY[pending.priority],
            confirmedNew: true,
          },
        },
      ],
      understanding: "Funcionário informou quem é afetado; refazendo o rascunho pendente.",
      reply: (data) => {
        const d = asDraft(data[1]);
        return d
          ? `Atualizei o rascunho (${d.draftId}) com a abrangência informada. Confirme no card abaixo.`
          : "Atualizei o rascunho com a abrangência informada.";
      },
      confidence: 80,
      uiBlocks: (data) => draftBlocks(asDraft(data[1]), 80),
    };
  }

  if (!pending && replyScope) {
    const origin = findScopeQuestionOrigin(turnContext);
    if (origin && VPN_WIN11_PATTERN.test(origin.toLowerCase())) {
      return buildVpnDraftPlan(origin, replyScope);
    }
  }

  const scope = classifyOutOfScope(input);
  if (scope.out) {
    return {
      tools: [],
      understanding: `Pedido fora do escopo de TI (${scope.area}).`,
      reply: outOfScopeReply(scope.area),
      confidence: 92,
      rulesOverride: ["OUT_OF_SCOPE"],
    };
  }

  if (userRequestedAnalyst(lower)) {
    return {
      tools: [
        {
          name: "transfer_to_analyst",
          args: { reason: "Funcionário solicitou atendimento humano" },
        },
      ],
      understanding: "Funcionário pede transferência para analista.",
      reply:
        "Vou transferir você para um analista humano. O assistente automático ficará pausado até a devolução.",
      confidence: 88,
    };
  }

  if (VPN_WIN11_PATTERN.test(lower)) {
    const scopeInMessage = /organiza/.test(lower)
      ? "organization"
      : /equipe|\btime\b/.test(lower)
        ? "team"
        : /só eu|somente eu|apenas eu/.test(lower)
          ? "only_me"
          : undefined;
    if (scopeInMessage) return buildVpnDraftPlan(input, scopeInMessage);
    return {
      tools: [],
      understanding:
        "Problema de VPN no Windows 11 com reunião hoje; falta saber quem é afetado antes de abrir o chamado.",
      reply:
        "Entendi: VPN sem conectar no Windows 11 com reunião hoje. Para definir a prioridade, quem é afetado?",
      confidence: 76,
      uiBlocks: () => [
        { type: "confidence", value: 76 },
        { type: "quick_replies", options: SCOPE_QUICK_REPLIES },
      ],
    };
  }

  if (
    /notebook lento|mesmo notebook|lento após|lentidão no notebook/.test(lower) ||
    (TICKET_ID_PATTERN.test(lower) && /adicion|complement|mais info|atualiz|acrescent/.test(lower))
  ) {
    const open = await adapters.ticketClient.listOpen(ctx.userId);
    const recent = await adapters.ticketClient.listRecentResolved(ctx.userId, 7);
    const dedup = resolveDraftOperation(
      "notebook lento após atualização",
      open.map((t) => ({ id: t.id, title: t.title })),
      recent.map((t) => ({ id: t.id, title: t.title })),
    );
    const target = dedup.targetTicketId ?? extractTicketId(input) ?? open[0]?.id;
    return {
      tools: [
        { name: "list_open_tickets", args: {} },
        {
          name: "create_draft",
          args: {
            operation: dedup.operation,
            targetTicketId: target,
            title: "Notebook lento após atualização do Windows",
            type: "INC",
            category: "hardware",
            description: input,
            impact: "only_me",
            urgency: "has_workaround",
            confirmedNew: true,
          },
        },
      ],
      understanding:
        dedup.operation === "update"
          ? "Mesmo problema no chamado aberto — atualizar em vez de criar novo."
          : "Complemento de chamado existente.",
      reply: (data) => {
        const d = asDraft(data[1]);
        return d
          ? `Vou atualizar o chamado ${target} via rascunho ${d.draftId}. Confirme para aplicar as alterações.`
          : `Atualização proposta para ${target}.`;
      },
      confidence: 82,
      uiBlocks: (data) => draftBlocks(asDraft(data[1]), 82),
    };
  }

  if (/^(oi|olá|ola|bom dia|boa tarde)/.test(lower)) {
    return {
      tools: [],
      understanding: "Usuário cumprimenta o assistente.",
      reply:
        "Olá! Sou o assistente do service desk de TI. Posso consultar seus chamados ou a central de ajuda. Como posso ajudar?",
      confidence: 88,
    };
  }

  if (STATUS_LIST_PATTERN.test(lower) && !TICKET_ID_PATTERN.test(lower)) {
    return {
      tools: [{ name: "list_open_tickets", args: {} }],
      understanding: "Usuário quer saber o status dos chamados abertos.",
      reply: (data) => {
        const tickets = data[0] as { id: string; title: string; statusLabel: string; slaBreached: boolean }[];
        const lines = tickets.map(
          (t) =>
            `• ${t.id}: ${t.title} (${t.statusLabel})${t.slaBreached ? " — **prazo vencido**" : ""}`,
        );
        return `Estes são seus chamados abertos:\n${lines.join("\n")}`;
      },
      confidence: 78,
      uiBlocks: (data) => {
        const tickets = data[0] as {
          id: string;
          title: string;
          statusLabel: string;
          slaBreached: boolean;
          openedAt?: string;
        }[];
        const breached = tickets.find((t) => t.slaBreached);
        const blocks: UiBlock[] = [{ type: "confidence", value: 78 }];
        if (tickets.length >= 2) {
          blocks.unshift({
            type: "ticket_selector",
            tickets: tickets.map((t) => ({
              ticketId: t.id,
              title: t.title,
              statusLabel: t.statusLabel,
              openedAt: t.openedAt ?? new Date().toISOString(),
              slaBreached: t.slaBreached,
            })),
          });
        } else if (breached) {
          blocks.unshift({
            type: "ticket_card",
            ticketId: breached.id,
            title: breached.title,
            statusLabel: breached.statusLabel,
            slaBreached: true,
          });
        }
        const focus = breached ?? tickets[0];
        blocks.push({
          type: "quick_replies",
          options: focus ? [`Detalhes do ${focus.id}`] : [],
        });
        return blocks;
      },
    };
  }

  if (/vpn.*809|erro 809|809.*win/.test(lower)) {
    return {
      tools: [{ name: "search_kb", args: { query: "809 vpn windows 10" } }],
      understanding: "Usuário relata erro 809 na VPN no Windows.",
      reply: (data) => {
        const hits = data[0] as { slug: string; title: string; excerpt: string }[];
        const art = hits[0];
        if (!art) return "Não encontrei artigo na KB para erro 809.";
        return `Encontrei o artigo **${art.title}** (${art.slug}). No Windows 10, reinstale o cliente VPN pelo portal corporativo. ${art.excerpt}`;
      },
      confidence: 72,
      uiBlocks: (data) => {
        const hits = data[0] as { slug: string; title: string }[];
        return [
          {
            type: "kb_chips",
            articles: hits.map((h) => ({ slug: h.slug, title: h.title })),
          },
          { type: "confidence", value: 72 },
          { type: "quick_replies", options: ["Ver passo a passo", "Ainda não conecta"] },
        ];
      },
    };
  }

  const mentionedTicket = extractTicketId(input);
  if (
    (mentionedTicket && /vencid|analista/.test(lower)) ||
    /chamado vencido.*analista/.test(lower)
  ) {
    if (mentionedTicket && !(await isTicketVisible(adapters, ctx, mentionedTicket))) {
      return notFoundPlan(mentionedTicket);
    }
    const open = mentionedTicket ? [] : await adapters.ticketClient.listOpen(ctx.userId);
    const ticketId = mentionedTicket ?? open.find((t) => t.slaBreached)?.id;
    return {
      tools: [
        ...(ticketId ? [{ name: "get_ticket" as const, args: { publicId: ticketId } }] : []),
        {
          name: "transfer_to_analyst",
          args: {
            reason: "Chamado com SLA vencido — contexto para analista",
            ...(ticketId ? { ticketId } : {}),
          },
        },
      ],
      understanding: "Chamado vencido; transferência com contexto.",
      reply: `${ticketId ? `O ${ticketId}` : "O chamado"} está com SLA vencido. Vou transferir você para um analista com esse contexto.`,
      confidence: 86,
    };
  }

  if (mentionedTicket) {
    return {
      tools: [{ name: "get_ticket", args: { publicId: mentionedTicket } }],
      understanding: `Usuário consulta andamento do ${mentionedTicket}.`,
      reply: (data) => {
        if (isNotFoundResult(data[0])) return notFoundReply(mentionedTicket);
        const t = data[0] as {
          id: string;
          title: string;
          statusLabel: string;
          slaBreached: boolean;
        };
        const breach = t.slaBreached ? " O prazo de atendimento está **vencido**." : "";
        return `${t.id} — ${t.title}. Status: ${t.statusLabel}.${breach}`;
      },
      confidence: 81,
      uiBlocks: (data) => {
        if (isNotFoundResult(data[0])) return notFoundBlocks(81);
        const t = data[0] as {
          id: string;
          title: string;
          statusLabel: string;
          slaBreached: boolean;
        };
        return [
          {
            type: "ticket_card",
            ticketId: t.id,
            title: t.title,
            statusLabel: t.statusLabel,
            slaBreached: t.slaBreached,
          },
          { type: "confidence", value: 81 },
        ];
      },
    };
  }

  if (/todo (mundo|a empresa|a organização).*sem e-?mail|e-?mail.*(caiu|parou)|outlook.*empresa.*parou/.test(lower)) {
    return {
      tools: [
        {
          name: "create_draft",
          args: {
            operation: "create",
            type: "INC",
            category: "email",
            title: "E-mail corporativo indisponível — impacto organizacional",
            description: input,
            impact: "organization",
            urgency: "blocking_work",
          },
        },
      ],
      understanding: "Incidente crítico de e-mail corporativo em larga escala.",
      reply: (data) => {
        const d = asDraft(data[0]);
        return d
          ? `Abri rascunho crítico ${d.draftId} para indisponibilidade de e-mail. Confirme para abrir o chamado.`
          : "Preparando chamado crítico de e-mail.";
      },
      confidence: 78,
      uiBlocks: (data) => draftBlocks(asDraft(data[0]), 78),
      rulesOverride: ["SLA_CRITICAL", "SCOPE_IT"],
    };
  }

  if (SAP_RESET_PATTERN.test(lower)) {
    const recent = await adapters.ticketClient.listRecentResolved(ctx.userId, 7);
    const dedup = resolveDraftOperation(
      "senha SAP bloqueada",
      [],
      recent.map((t) => ({ id: t.id, title: t.title })),
    );
    const target = dedup.operation === "reopen" ? dedup.targetTicketId : undefined;
    return {
      tools: [
        { name: "list_recent_resolved", args: {} },
        target
          ? {
              name: "reopen_ticket",
              args: {
                targetTicketId: target,
                title: "Senha SAP bloqueada novamente",
                description: input,
              },
            }
          : {
              name: "create_draft",
              args: {
                operation: "create",
                type: "INC",
                category: "acesso",
                title: "Senha SAP bloqueada",
                description: input,
                impact: "only_me",
                urgency: "blocking_work",
                confirmedNew: true,
              },
            },
      ],
      understanding: target
        ? `Reabertura de ${target} (resolvido há poucos dias).`
        : "Nenhum chamado SAP recente; novo chamado de acesso.",
      reply: (data) => {
        const d = asDraft(data[1]);
        if (!d) return "Preparando proposta para o problema de senha SAP.";
        return target
          ? `Vou reabrir ${target} via rascunho ${d.draftId}. Confirme para aplicar.`
          : `Preparei o rascunho ${d.draftId} para desbloquear sua senha SAP. Confirme no card abaixo.`;
      },
      confidence: 81,
      uiBlocks: (data) => draftBlocks(asDraft(data[1]), 81),
    };
  }

  if (/n[ãa]o fa[cç]o ideia|algo estranho (no|com o) (computador|notebook|pc)|sem saber o que (est[aá]|[eé])/.test(lower)) {
    return {
      tools: [],
      understanding: "Pedido vago, sem informação suficiente para agir; confiança muito baixa.",
      reply: "Não tenho informação suficiente para resolver isso com segurança.",
      confidence: 28,
    };
  }

  if (/não sei se é (vpn|rede)|talvez (vpn|rede)|pode ser (vpn|rede)|não tenho certeza/.test(lower)) {
    return {
      tools: [],
      understanding: "Pedido ambíguo — confiança baixa.",
      reply:
        "Não tenho certeza se é VPN ou outro tipo de problema. Posso transferir para um analista ou você pode descrever melhor os sintomas.",
      confidence: 42,
      uiBlocks: () => [
        { type: "confidence", value: 42 },
        { type: "quick_replies", options: ["Falar com analista", "É VPN", "É hardware"] },
      ],
    };
  }

  if (
    /cancel(ar|e) (o )?rascunho|não quero (confirmar|esse) rascunho|cancelar o rascunho d-/i.test(
      lower,
    )
  ) {
    const draftMatch = input.match(/d-\d+/i);
    const draftId = draftMatch?.[0].toUpperCase() ?? "D-001";
    return {
      tools: [{ name: "cancel_draft", args: { draftId } }],
      understanding: "Usuário pede cancelamento de rascunho.",
      reply: "Rascunho cancelado conforme solicitado.",
      confidence: 85,
    };
  }

  if (/horário|horario|desk|atendimento.*hora/.test(lower)) {
    return {
      tools: [{ name: "search_kb", args: { query: "horario-service-desk" } }],
      understanding: "Usuário pergunta horário do service desk.",
      reply: (data) => {
        const hits = data[0] as { title: string; excerpt: string; slug: string }[];
        const art = hits.find((h) => h.slug === "horario-service-desk") ?? hits[0];
        return art
          ? `${art.title}: ${art.excerpt}`
          : "Atendimento seg–sex 8h–18h.";
      },
      confidence: 85,
      uiBlocks: (data) => {
        const hits = data[0] as { slug: string; title: string }[];
        return [
          { type: "kb_chips", articles: hits.map((h) => ({ slug: h.slug, title: h.title })) },
          { type: "confidence", value: 85 },
        ];
      },
    };
  }

  return {
    tools: [],
    understanding: "Consulta genérica de TI.",
    reply:
      "Posso ajudar com chamados abertos ou artigos da central de ajuda. Descreva sua dúvida de TI.",
    confidence: 55,
  };
}

function withQuickReply(blocks: UiBlock[], option: string, confidence: number): UiBlock[] {
  const existing = blocks.find((b) => b.type === "quick_replies");
  if (existing && existing.type === "quick_replies") {
    if (existing.options.includes(option)) return blocks;
    return blocks.map((b) => (b === existing ? { ...existing, options: [...existing.options, option] } : b));
  }
  const confidenceIndex = blocks.findIndex((b) => b.type === "confidence");
  const reply: UiBlock = { type: "quick_replies", options: [option] };
  if (blocks.length === 0) return [reply, { type: "confidence", value: confidence }];
  if (confidenceIndex === -1) return [...blocks, reply];
  return [...blocks.slice(0, confidenceIndex), reply, ...blocks.slice(confidenceIndex)];
}

export async function runFixtureTurn(
  userMessage: string,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  callbacks?: { onToken?: (d: string) => void },
  options?: { emitTokens?: boolean; turnContext?: TurnContext },
): Promise<TurnResult> {
  const turnContext = options?.turnContext ?? EMPTY_TURN_CONTEXT;
  const extras = { focusedTicketId: turnContext.focusedTicketId };
  let legacyUnavailable = false;
  let plan: Plan;
  try {
    plan = await matchPlan(userMessage, ctx, adapters, turnContext);
  } catch (error) {
    if (!isLegacyUnavailable(toToolFailure(error))) throw error;
    legacyUnavailable = true;
    plan = {
      tools: [],
      understanding: "Sistema de chamados indisponível durante a análise.",
      reply: LEGACY_UNAVAILABLE_REPLY,
      confidence: 60,
    };
  }
  const toolResults: unknown[] = [];
  const actions: string[] = [];
  const calls: ToolCallRecord[] = [];

  for (const t of plan.tools) {
    actions.push(t.name);
    const result = await runTool(t.name, t.args, ctx, adapters, extras);
    toolResults.push(result);
    calls.push({ name: t.name, args: t.args, result });
    if (isLegacyUnavailable(result)) {
      legacyUnavailable = true;
      break;
    }
  }

  const baseRules = plan.rulesOverride ?? inferRulesFromContent(userMessage, actions);
  const confidence = normalizeConfidence(plan.confidence);

  const policy = legacyUnavailable
    ? undefined
    : await applyTransferPolicy({
        userMessage,
        ctx,
        adapters,
        extras,
        calls,
        confidence,
        outOfScope: baseRules.includes("OUT_OF_SCOPE"),
        understanding: plan.understanding,
        rulesFired: baseRules,
      });
  if (policy?.call) {
    actions.push(policy.call.name);
    calls.push(policy.call);
  }

  const rulesFired = [
    ...new Set([
      ...baseRules,
      ...(legacyUnavailable ? ["TICKET_LEGACY_UNAVAILABLE"] : []),
      ...(policy?.rules ?? []),
    ]),
  ];
  const evidence = collectEvidence(toolResults);

  let content = legacyUnavailable
    ? LEGACY_UNAVAILABLE_REPLY
    : typeof plan.reply === "function"
      ? plan.reply(toolResults)
      : plan.reply;
  if (policy?.notice) content += `\n\n${policy.notice}`;

  if (options?.emitTokens !== false) {
    for (const word of content.split(/(\s+)/)) {
      callbacks?.onToken?.(word);
    }
  }

  let uiBlocks: UiBlock[] = legacyUnavailable
    ? [
        { type: "confidence", value: plan.confidence },
        { type: "quick_replies", options: LEGACY_UNAVAILABLE_QUICK_REPLIES },
      ]
    : (plan.uiBlocks?.(toolResults) ?? [{ type: "confidence", value: plan.confidence }]);
  if (policy?.offerQuickReply) {
    uiBlocks = withQuickReply(uiBlocks, policy.offerQuickReply, plan.confidence);
  }

  return {
    content,
    uiBlocks,
    trace: {
      understanding: plan.understanding,
      actions,
      confidence,
      rulesFired,
      evidence,
      reasoning:
        actions.length > 0
          ? `Cenário determinístico (CI): ${plan.understanding} Ferramentas: ${actions.join(", ")}.`
          : `Cenário determinístico (CI): ${plan.understanding} Nenhuma ferramenta necessária.`,
      rawToolCalls: calls.map((c) => ({ name: c.name, args: c.args })),
    },
  };
}
