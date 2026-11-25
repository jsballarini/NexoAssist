const ACTION_LABELS: Record<string, string> = {
  list_open_tickets: "consultou seus chamados",
  get_ticket: "consultou o chamado",
  search_kb: "buscou na central de ajuda",
  create_draft: "montou o rascunho",
  update_ticket: "preparou a atualização",
  reopen_ticket: "preparou a reabertura",
  cancel_draft: "cancelou o rascunho",
  transfer_to_analyst: "chamou um atendente",
  list_recent_resolved: "consultou chamados resolvidos",
};

/**
 * Rótulos PT da status line (G-UI-E01), no estilo do protótipo ("✓ consultou
 * seus chamados"). Passos repetidos no mesmo turno aparecem uma única vez.
 */
export function actionLabels(actions: string[]): string[] {
  const labels = actions.map((a) => ACTION_LABELS[a] ?? a.replace(/_/g, " "));
  return [...new Set(labels)];
}
