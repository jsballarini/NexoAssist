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