import type { Prisma } from "@prisma/client";

/** Resumo de handoff exibido no cabeçalho do console para a conversa de Ana (demo/E2E). */
export const ANA_HANDOFF_SUMMARY = {
  problem: "Notebook lento após atualização do Windows; chamado INC-20311 está vencido.",
  stepsTried: ["Consulta dos chamados abertos", "Funcionário pediu um analista humano"],
  ticketIds: ["INC-20311"],
  reason: "Solicitação do funcionário: chamado vencido sem atendimento.",
  confidence: 41,
  rulesFired: ["TRANSFER_USER_REQUEST", "TRANSFER_SLA_BREACH"],
} satisfies Prisma.InputJsonObject;

