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

const TICKET_ID_PATTERN = /\b(?:inc|req)-\d+\b/i;
const SAP_RESET_PATTERN = /sap.*(bloquead|senha)|senha.*sap/;
const SCOPE_REPLIES: { pattern: RegExp; scope: "only_me" | "team" | "organization" }[] = [
  { pattern: /^(só eu|somente eu|apenas eu)/, scope: "only_me" },
  { pattern: /^equipe/, scope: "team" },
  { pattern: /^organiza/, scope: "organization" },
];

function extractTicketId(input: string): string | undefined {
  return input.match(TICKET_ID_PATTERN)?.[0].toUpperCase();
}

function scopeFromReply(lower: string) {
  return SCOPE_REPLIES.find((r) => r.pattern.test(lower))?.scope;
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
  const replyScope = pending ? scopeFromReply(lower) : undefined;
  if (pending && replyScope) {
    return {
      tools: [
        { name: "cancel_draft", args: { draftId: pending.draftId } },
        {
          name: "create_draft",
          args: {
            operation: pending.operation,
            targetTicketId: pending.targetTicketId,
            title: pending.title,
            description: pending.title,
            priority: pending.priority,
            affectedScope: replyScope,
          },
        },
      ],
      understanding: "Funcionário informou quem é afetado; refazendo o rascunho pendente.",
      reply: (data) => {
        const d = data[1] as DraftSummary | undefined;
        return d
          ? `Atualizei o rascunho (${d.draftId}) com a abrangência informada. Confirme no card abaixo.`
          : "Atualizei o rascunho com a abrangência informada.";
      },
      confidence: 80,
      uiBlocks: (data) => {
        const d = data[1] as DraftSummary | undefined;
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
          });
        }
        blocks.push({ type: "confidence", value: 80 });
        return blocks;
      },
    };
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

  if (/preciso falar|falar com (um )?analista|falar com humano|quero um humano/.test(lower)) {
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

  if (/vpn.*(win\s*11|windows\s*11)|win\s*11.*vpn|windows\s*11.*vpn/.test(lower)) {
    return {
      tools: [
        {
          name: "create_draft",
          args: {
            operation: "create",
            type: "INC",
            category: "rede_vpn",
            title: "VPN Windows 11 — reunião 14h",
            description: input,
            priority: "high",
            affectedScope:
              /organiza/.test(lower)
                ? "organization"
                : /equipe|time/.test(lower)
                  ? "team"
                  : /só eu|somente eu|only_me/.test(lower)
                    ? "only_me"
                    : undefined,
          },
        },
      ],
      understanding: "Novo problema VPN Windows 11 com prioridade alta.",
      reply: (data) => {
        const d = data[0] as DraftSummary;
        if (!d) return "Preparando rascunho de chamado VPN.";
        return `Preparei o rascunho ${d.draftId} (prioridade alta). SLA previsto: ${new Date(d.dueAtPreview).toLocaleString("pt-BR")}. Confirme no card abaixo.`;
      },
      confidence: 76,
      uiBlocks: (data) => {
        const d = data[0] as DraftSummary;
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
          });
        }
        if (!/só eu|equipe|organiza/i.test(lower)) {
          blocks.push({
            type: "quick_replies",
            options: ["Só eu", "Equipe (5–20)", "Organização inteira"],
          });
        }
        blocks.push({ type: "confidence", value: 76 });
        return blocks;
      },
    };
  }

  if (
    /notebook lento|mesmo notebook|lento após|lentidão no notebook/.test(lower) ||
    (TICKET_ID_PATTERN.test(lower) && /adicion|complement|mais info|atualiz/.test(lower))
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
            description: input,
            priority: "medium",
          },
        },
      ],
      understanding:
        dedup.operation === "update"
          ? "Mesmo problema no chamado aberto — atualizar em vez de criar novo."
          : "Complemento de chamado existente.",
      reply: (data) => {
        const d = data[1] as DraftSummary;
        return d
          ? `Vou atualizar o chamado ${target} via rascunho ${d.draftId}. Confirme para aplicar as alterações.`
          : `Atualização proposta para ${target}.`;
      },
      confidence: 82,
      uiBlocks: (data) => {
        const d = data[1] as DraftSummary;
        if (!d) return [{ type: "confidence", value: 82 }];
        return [
          {
            type: "draft_card",
            draftId: d.draftId,
            operation: d.operation,
            title: d.title,
            priority: d.priority,
            dueAtPreview: d.dueAtPreview,
          },
          { type: "confidence", value: 82 },
        ];
      },
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

  if (/status.*chamado|meus chamados|chamados abertos/.test(lower)) {
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
          options: [
            ...(focus ? [`Detalhes do ${focus.id}`] : []),
            "Horário do service desk",
          ],
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
    const open = mentionedTicket ? [] : await adapters.ticketClient.listOpen(ctx.userId);
    const ticketId = mentionedTicket ?? open.find((t) => t.slaBreached)?.id;
    return {
      tools: [
        ...(ticketId ? [{ name: "get_ticket" as const, args: { publicId: ticketId } }] : []),
        {
          name: "transfer_to_analyst",
          args: { reason: "Chamado com SLA vencido — contexto para analista" },
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

  if (/todo (mundo|a empresa|a organização).*sem e-mail|e-mail.*(caiu|parou)|outlook.*empresa.*parou/.test(lower)) {
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
            priority: "critical",
            affectedScope: "organization",
          },
        },
      ],
      understanding: "Incidente crítico de e-mail corporativo em larga escala.",
      reply: (data) => {
        const d = data[0] as DraftSummary;
        return d
          ? `Abri rascunho crítico ${d.draftId} para indisponibilidade de e-mail. Confirme para abrir o chamado.`
          : "Preparando chamado crítico de e-mail.";
      },
      confidence: 78,
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
                priority: "high",
              },
            },
      ],
      understanding: target
        ? `Reabertura de ${target} (resolvido há poucos dias).`
        : "Nenhum chamado SAP recente; novo chamado de acesso.",
      reply: (data) => {
        const d = data[1] as DraftSummary | undefined;
        if (!d) return "Preparando proposta para o problema de senha SAP.";
        return target
          ? `Vou reabrir ${target} via rascunho ${d.draftId}. Confirme para aplicar.`
          : `Preparei o rascunho ${d.draftId} para desbloquear sua senha SAP. Confirme no card abaixo.`;
      },
      confidence: 81,
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

export async function runFixtureTurn(
  userMessage: string,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  callbacks?: { onToken?: (d: string) => void },
  options?: { emitTokens?: boolean; turnContext?: TurnContext },
): Promise<TurnResult> {
  const plan = await matchPlan(
    userMessage,
    ctx,
    adapters,
    options?.turnContext ?? EMPTY_TURN_CONTEXT,
  );
  const toolResults: unknown[] = [];
  const actions: string[] = [];

  for (const t of plan.tools) {
    actions.push(t.name);
    toolResults.push(await runTool(t.name, t.args, ctx, adapters));
  }

  const rulesFired = plan.rulesOverride ?? inferRulesFromContent(userMessage, actions);
  const evidence = collectEvidence(toolResults);

  const content =
    typeof plan.reply === "function" ? plan.reply(toolResults) : plan.reply;

  if (options?.emitTokens !== false) {
    for (const word of content.split(/(\s+)/)) {
      callbacks?.onToken?.(word);
    }
  }

  const uiBlocks = plan.uiBlocks?.(toolResults) ?? [{ type: "confidence", value: plan.confidence }];

  return {
    content,
    uiBlocks,
    trace: {
      understanding: plan.understanding,
      actions,
      confidence: normalizeConfidence(plan.confidence),
      rulesFired,
      evidence,
      reasoning:
        actions.length > 0
          ? `Cenário determinístico (CI): ${plan.understanding} Ferramentas: ${actions.join(", ")}.`
          : `Cenário determinístico (CI): ${plan.understanding} Nenhuma ferramenta necessária.`,
      rawToolCalls: plan.tools,
    },
  };
}