import type { AgentAdapters, AgentUserContext, TurnResult } from "./adapters";
import { inferRulesFromContent, normalizeConfidence } from "../../src/lib/domain/rules";
import type { UiBlock } from "../../src/lib/conversation/types";
import { runTool, type ToolName } from "./tools";

type Plan = {
  tools: { name: ToolName; args: Record<string, unknown> }[];
  understanding: string;
  reply: string | ((data: unknown[]) => string);
  confidence: number;
  uiBlocks?: (data: unknown[]) => UiBlock[];
};

function matchPlan(input: string): Plan {
  const lower = input.toLowerCase().trim();

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
        const tickets = data[0] as { id: string; title: string; statusLabel: string; slaBreached: boolean }[];
        const breached = tickets.find((t) => t.slaBreached);
        const blocks: UiBlock[] = [{ type: "confidence", value: 78 }];
        if (breached) {
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
): Promise<TurnResult> {
  const plan = matchPlan(userMessage);
  const toolResults: unknown[] = [];
  const actions: string[] = [];

  for (const t of plan.tools) {
    actions.push(t.name);
    toolResults.push(await runTool(t.name, t.args, ctx, adapters));
  }

  const rulesFired = inferRulesFromContent(userMessage, actions);
  const evidence: TurnResult["trace"]["evidence"] = [];

  for (const r of toolResults) {
    if (Array.isArray(r)) {
      for (const item of r as { id?: string; slug?: string; excerpt?: string }[]) {
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
    } else if (r && typeof r === "object" && "id" in r) {
      const t = r as { id: string };
      evidence.push({ type: "ticket", id: t.id });
    }
  }

  const content =
    typeof plan.reply === "function" ? plan.reply(toolResults) : plan.reply;

  for (const word of content.split(/(\s+)/)) {
    callbacks?.onToken?.(word);
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
      rawToolCalls: plan.tools,
    },
  };
}