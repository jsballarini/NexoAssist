const ACTION_LABELS: Record<string, string> = {
  list_open_tickets: "Consultou seus chamados",
  get_ticket: "Consultou chamado",
  search_kb: "Pesquisou na central de ajuda",
  create_draft: "Preparou rascunho de chamado",
  update_ticket: "Atualizou chamado",
  reopen_ticket: "Preparou reabertura",
  cancel_draft: "Cancelou rascunho",
  transfer_to_analyst: "Encaminhou ao analista",
  list_recent_resolved: "Listou chamados resolvidos",
};

/** Rótulos PT para chips da status line (G-UI-E01). */
export function actionLabels(actions: string[]): string[] {
  return actions.map((a) => ACTION_LABELS[a] ?? a.replace(/_/g, " "));
}