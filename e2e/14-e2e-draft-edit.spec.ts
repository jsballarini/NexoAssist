import { expect, test } from "@playwright/test";
import { deleteTicketsByTitlePrefix } from "../tests/support/cleanup";
import { loginAsAna } from "./auth";

const EDITED_TITLE = "VPN Windows 11 - editado no card";

test("E2E-DRAFT-EDIT: card mostra os 6 campos em PT-BR, edita via PATCH e confirma", async ({ page }) => {
  await deleteTicketsByTitlePrefix("ana.souza@nexo.com.br", "VPN Windows 11");
  await loginAsAna(page);

  await page.getByPlaceholder("Escreva para o Nexo…").fill(
    "VPN não conecta no Windows 11, reunião às 14h",
  );
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByRole("button", { name: "Só eu" }).first()).toBeVisible({ timeout: 120_000 });
  await page.getByRole("button", { name: "Só eu" }).first().click();

  const card = page.locator("[data-draft-card]").first();
  await expect(card.getByRole("button", { name: "Confirmar" })).toBeVisible({ timeout: 120_000 });

  for (const label of ["Tipo", "Categoria", "Descrição", "Prioridade", "Afetados", "SLA previsto"]) {
    await expect(card.locator(`[data-draft-field="${label}"]`)).toBeVisible();
  }
  await expect(card.locator('[data-draft-field="Afetados"]')).toContainText("Só eu");
  await expect(card).not.toContainText(/only_me|\bmedium\b|\bhigh\b/);

  await card.getByRole("button", { name: "Editar" }).click();
  await expect(card).toHaveAttribute("data-draft-editing", "true");
  await card.getByLabel("Título").fill(EDITED_TITLE);
  await card.getByLabel("Prioridade").selectOption("high");
  await card.getByRole("button", { name: "Salvar" }).click();

  await expect(card).toHaveAttribute("data-draft-editing", "false");
  await expect(card).toContainText(EDITED_TITLE);
  await expect(card.locator('[data-draft-field="Prioridade"]')).toContainText("Alta");

  await card.getByRole("button", { name: "Confirmar" }).click();
  const chatMessages = page.locator('[data-chat-ready="true"] .overflow-y-auto');
  await expect(chatMessages.getByText(/INC-\d+/).first()).toBeVisible({ timeout: 15_000 });

  await deleteTicketsByTitlePrefix("ana.souza@nexo.com.br", "VPN Windows 11");
});
