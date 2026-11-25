import type { runAgentTurn } from "../../lib/agent";

type AgentTurnResult = Awaited<ReturnType<typeof runAgentTurn>>;

/**
 * Matriz de intenções × variações de frase (G2-QA-01).
 * Cada intenção é validada pelo **comportamento** (ações, regras, blocos de UI),
 * nunca pelo texto da resposta, para não depender da frase exata nem de regex.
 */
export type IntentVariation = {
  intent: string;
  /** Frases equivalentes; `{foreign}` é trocado por um chamado de outro usuário. */
  phrases: string[];
  /** Devolve `null` quando o comportamento está correto; senão, o motivo da falha. */
  check: (result: AgentTurnResult, ctx: { foreignTitle: string }) => string | null;
};

type Block = AgentTurnResult["uiBlocks"][number];

function actions(r: AgentTurnResult): string[] {
  return r.trace.actions;
}

function draftOperation(r: AgentTurnResult): string | undefined {
  const draft = r.uiBlocks.find((b: Block) => b.type === "draft_card");
  return draft && draft.type === "draft_card" ? draft.operation : undefined;
}

function fail(condition: boolean, reason: string): string | null {
  return condition ? reason : null;
}

export const INTENT_VARIATIONS: IntentVariation[] = [
  {
    intent: "kb",
    phrases: [
      "erro 809 na VPN do Windows 10",
      "como resolvo o erro 809 da VPN?",
      "a VPN mostra 809 no meu Windows, o que faço?",
      "minha VPN falha com o código 809",
    ],
    check: (r) =>
      fail(!actions(r).includes("search_kb"), "deveria consultar a KB") ??
      fail(actions(r).includes("create_draft"), "não deveria criar rascunho para dúvida de KB"),
  },
  {
    intent: "status",
    phrases: [
      "Qual o status dos meus chamados?",
      "quais são meus chamados abertos?",
      "como estão meus chamados?",
      "tenho algum chamado aberto?",
      "me mostra o andamento dos meus tickets",
    ],
    check: (r) =>
      fail(!actions(r).includes("list_open_tickets"), "deveria listar chamados abertos") ??
      fail(actions(r).includes("create_draft"), "consulta de status não cria rascunho"),
  },
  {
    intent: "open",
    phrases: [
      "minha senha do SAP foi bloqueada",
      "bloqueou minha senha no SAP",
      "não consigo entrar no SAP, acho que a senha travou",
      "SAP bloqueado, preciso de acesso",
    ],
    check: (r) =>
      fail(!actions(r).some((a) => a === "create_draft" || a === "reopen_ticket"), "deveria preparar rascunho") ??
      fail(!draftOperation(r), "o rascunho deveria aparecer como card para confirmação"),
  },
  {
    intent: "open-critical",
    phrases: [
      "o e-mail caiu para todo mundo, ninguém recebe",
      "todo mundo está sem e-mail aqui",
      "o email parou de funcionar na empresa toda",
    ],
    check: (r) =>
      fail(!actions(r).includes("create_draft"), "incidente crítico deveria gerar rascunho") ??
      fail(!actions(r).includes("transfer_to_analyst"), "incidente crítico deveria transferir ao analista"),
  },
  {
    intent: "update",
    phrases: [
      "adicionar informação ao INC-20311: só ficou lento depois da atualização",
      "quero complementar o INC-20311 com mais detalhes",
      "atualiza o INC-20311, o notebook continua lento",
      "acrescenta no INC-20311 que o problema piorou",
      "o mesmo notebook lento de novo, quero atualizar o chamado",
    ],
    check: (r) => fail(draftOperation(r) !== "update", `esperava rascunho de atualização, veio ${draftOperation(r)}`),
  },
  {
    intent: "transfer",
    phrases: [
      "quero falar com um analista",
      "preciso falar com alguém da equipe de suporte",
      "pode chamar um analista pra mim?",
      "me passa para um humano",
      "transfere para um atendente humano",
    ],
    check: (r) =>
      fail(!actions(r).includes("transfer_to_analyst"), "deveria transferir") ??
      fail(!r.trace.rulesFired.includes("TRANSFER_USER_REQUEST"), "deveria registrar TRANSFER_USER_REQUEST"),
  },
  {
    intent: "scope",
    phrases: [
      "quando sai o reembolso da minha viagem?",
      "quero tirar férias mês que vem, como faço?",
      "o ar-condicionado da sala está quebrado",
      "meu holerite não chegou",
      "o elevador do prédio parou",
    ],
    check: (r) =>
      fail(!r.trace.rulesFired.includes("OUT_OF_SCOPE"), "deveria registrar OUT_OF_SCOPE") ??
      fail(actions(r).length > 0, "fora do escopo não aciona ferramentas") ??
      fail(r.uiBlocks.some((b: Block) => b.type === "draft_card"), "fora do escopo não cria rascunho"),
  },
  {
    intent: "privacy",
    phrases: [
      "Qual o status do {foreign}?",
      "me fala do chamado {foreign}",
      "detalhes do {foreign} por favor",
      "o {foreign} já foi resolvido?",
    ],
    check: (r, ctx) =>
      fail(r.content.includes(ctx.foreignTitle), "vazou o título de chamado de outro usuário") ??
      fail(r.uiBlocks.some((b: Block) => b.type === "ticket_card"), "não deveria mostrar card de chamado alheio") ??
      fail(!/não encontr/i.test(r.content), "deveria responder como chamado não encontrado"),
  },
];

/** Total de frases da matriz (para relatórios). */
export function countPhrases(matrix: IntentVariation[] = INTENT_VARIATIONS): number {
  return matrix.reduce((sum, m) => sum + m.phrases.length, 0);
}
