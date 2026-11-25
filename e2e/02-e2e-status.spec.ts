import { expect, test } from "@playwright/test";
import { loginAsAna } from "./auth";

test("E2E-STATUS: consulta INC-20311 vencido visível", async ({ page }) => {
  await loginAsAna(page);

  await page.getByPlaceholder("Escreva para o Nexo…").fill("Qual o status dos meus chamados?");
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(
    page.getByText("INC-20311", { exact: true }).first(),
  ).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("Vencido", { exact: true }).first()).toBeVisible();
  // G2-UI-03: chamado vencido oferece falar com um analista.
  await expect(page.getByRole("button", { name: "Chamar um analista" })).toBeVisible();
});