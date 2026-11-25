import type { UiBlock } from "@/lib/conversation/types";

export type DraftBlock = Extract<UiBlock, { type: "draft_card" }>;

/** Valores editáveis do rascunho (os mesmos seis campos exibidos no card). */
export type DraftForm = {
  ticketType: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  affectedScope: string;
};

export const TYPE_OPTIONS = ["INC", "REQ"] as const;
export const CATEGORY_OPTIONS = ["acesso", "rede_vpn", "hardware", "software", "email", "outros"] as const;
export const PRIORITY_OPTIONS = ["critical", "high", "medium", "low"] as const;
export const SCOPE_OPTIONS = ["only_me", "team", "organization"] as const;

export function formFromBlock(block: DraftBlock): DraftForm {
  return {
    ticketType: block.ticketType ?? "",
    category: block.category ?? "",
    title: block.title,
    description: block.description ?? "",
    priority: block.priority,
    affectedScope: block.affectedScope ?? "",
  };
}

/**
 * Monta o corpo do PATCH apenas com os campos que mudaram.
 * Campos vazios que já estavam vazios no rascunho não são enviados.
 */
export function buildDraftPatch(block: DraftBlock, form: DraftForm): Record<string, string> {
  const original = formFromBlock(block);
  const apiNames: Record<keyof DraftForm, string> = {
    ticketType: "type",
    category: "category",
    title: "title",
    description: "description",
    priority: "priority",
    affectedScope: "affectedScope",
  };
  const patch: Record<string, string> = {};
  for (const key of Object.keys(apiNames) as (keyof DraftForm)[]) {
    const value = form[key].trim();
    if (value !== original[key].trim() && value !== "") patch[apiNames[key]] = value;
  }
  return patch;
}

/** Aplica o `DraftSummary` devolvido pela API ao bloco exibido. */
export function blockFromSummary(
  block: DraftBlock,
  summary: {
    title: string;
    priority: string;
    dueAtPreview: string;
    affectedScope?: string;
    type?: string;
    category?: string;
    description?: string;
  },
): DraftBlock {
  return {
    ...block,
    title: summary.title,
    priority: summary.priority,
    dueAtPreview: summary.dueAtPreview,
    affectedScope: summary.affectedScope,
    ticketType: summary.type ?? block.ticketType,
    category: summary.category ?? block.category,
    description: summary.description ?? block.description,
  };
}
