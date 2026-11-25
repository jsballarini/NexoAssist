import type { AgentAdapters, AgentUserContext, TurnResult } from "./adapters";
import { resolveDraftOperation } from "../../src/lib/domain/dedup";
import {
  detectOutOfScope,
  inferRulesFromContent,
  normalizeConfidence,
} from "../../src/lib/domain/rules";
import type { UiBlock } from "../../src/lib/conversation/types";
import type { DraftSummary } from "./draft-types";
import { runTool, type ToolName } from "./tools";

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
): Promise<Plan> {
  const lower = input.toLowerCase().trim();

  if (detectOutOfScope(input)) {
    return {
      tools: [],
      understanding: "Pedido fora do escopo de TI (RH/benefícios).",
      reply:
        "Esse assunto é tratado pelo RH, não pelo service desk de TI. Posso ajudar com acesso, VPN, hardware ou software.",
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
    (/inc-20311/.test(lower) && /adicion|complement|mais info|atualiz/.test(lower))
  ) {
    const open = await adapters.ticketClient.listOpen(ctx.userId);
    const recent = await adapters.ticketClient.listRecentResolved(ctx.userId, 7);
    const dedup = resolveDraftOperation(
      "notebook lento após atualização",
      open.map((t) => ({ id: t.id, title: t.title })),
      recent.map((t) => ({ id: t.id, title: t.title })),
    );
    const target = dedup.targetTicketId ?? "INC-20311";
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
        blocks.push({
          type: "quick_replies",
          options: ["Detalhes do INC-20311", "Horário do service desk"],
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

  if (/inc-20311.*(vencid|analista)|vencid.*inc-20311|chamado vencido.*analista/.test(lower)) {
    return {
      tools: [
        { name: "get_ticket", args: { publicId: "INC-20311" } },
        {
          name: "transfer_to_analyst",
          args: { reason: "Chamado com SLA vencido — contexto para analista" },
        },
      ],
      understanding: "Chamado vencido; transferência com contexto.",
      reply:
        "O INC-20311 está com SLA vencido. Vou transferir você para um analista com esse contexto.",
      confidence: 86,
    };
  }

  if (/inc-20311|20311/.test(lower)) {
    return {
      tools: [{ name: "get_ticket", args: { publicId: "INC-20311" } }],
      understanding: "Usuário consulta andamento do INC-20311.",
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

  if (
    /sap.*(bloquead|senha)|senha.*sap/.test(lower) &&
    ctx.userName.toLowerCase().includes("diego")
  ) {
    const recent = await adapters.ticketClient.listRecentResolved(ctx.userId, 7);
    const target = recent.find((t) => t.id === "INC-20150")?.id ?? "INC-20150";
    return {
      tools: [
        { name: "list_recent_resolved", args: {} },
        {
          name: "reopen_ticket",
          args: {
            targetTicketId: target,
            title: "Senha SAP bloqueada novamente",
            description: input,
          },
        },
      ],
      understanding: "Reabertura de INC-20150 (resolvido há poucos dias).",
      reply: (data) => {
        const d = data[1] as DraftSummary;
        return d
          ? `Vou reabrir ${target} via rascunho ${d.draftId}. Confirme para aplicar.`
          : `Reabertura proposta para ${target}.`;
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
  options?: { emitTokens?: boolean },
): Promise<TurnResult> {
  const plan = await matchPlan(userMessage, ctx, adapters);
  const toolResults: unknown[] = [];
  const actions: string[] = [];

  for (const t of plan.tools) {
    actions.push(t.name);
    toolResults.push(await runTool(t.name, t.args, ctx, adapters));
  }

  const rulesFired = plan.rulesOverride ?? inferRulesFromContent(userMessage, actions);
  const evidence: TurnResult["trace"]["evidence"] = [];

  for (const r of toolResults) {
    if (Array.isArray(r)) {
      for (const item of r as { id?: string; slug?: string; excerpt?: string; draftId?: string }[]) {
        if ("draftId" in item && item.draftId) {
          evidence.push({ type: "draft", id: item.draftId });
        }
        if ("id" in item && item.id) {
          evidence.push({ type: "ticket", id: item.id });
        }
        if ("slug" in item && item.slug) {
          evidence.push({
            type: "article",
            id: item.slug,
            excerpt: item.excerpt,
          });
        }
      }
    } else if (r && typeof r === "object") {
      const o = r as { id?: string; draftId?: string; slug?: string };
      if (o.draftId) evidence.push({ type: "draft", id: o.draftId });
      if (o.id) evidence.push({ type: "ticket", id: o.id });
    }
  }

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