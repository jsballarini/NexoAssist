import { expect, test } from "@playwright/test";
import { loginAsAna } from "./auth";

test("E2E-STATUS: consulta INC-20311 vencido visível", async ({ page }) => {
  await loginAsAna(page);

  await page.getByPlaceholder("Digite sua mensagem…").fill("Qual o status dos meus chamados?");
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(
    page.getByText("INC-20311", { exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Vencido", { exact: true }).first()).toBeVisible();
});