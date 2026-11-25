import type { TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";

export const ticketStatusLabel: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_analyst: "Aguardando analista",
  approved: "Aprovado",
  resolved: "Resolvido",
  in_service: "Em atendimento",
};

export const ticketCategoryLabel: Record<TicketCategory, string> = {
  acesso: "Acesso",
  rede_vpn: "Rede e VPN",
  hardware: "Hardware",
  software: "Software",
  email: "E-mail",
  outros: "Outros",
};

export const ticketPriorityLabel: Record<TicketPriority, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};
export const ticketTypeLabel: Record<"INC" | "REQ", string> = {
  INC: "Incidente",
  REQ: "Requisição",
};

export const affectedScopeLabel: Record<"only_me" | "team" | "organization", string> = {
  only_me: "Só eu",
  team: "Minha equipe",
  organization: "Toda a organização",
};

/** Rótulo PT-BR de um valor, com fallback para o valor cru (nunca vazio). */
export function labelOr(map: Record<string, string>, value: string | undefined): string {
  if (!value) return "—";
  return map[value] ?? value;
}
