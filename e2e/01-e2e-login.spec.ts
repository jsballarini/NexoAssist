import { expect, test } from "@playwright/test";
import { loginAsAna } from "./auth";

test("E2E-LOGIN: Ana acessa atendimento e perfil", async ({ page }) => {
  await loginAsAna(page);

  await page.goto("/perfil");
  const main = page.getByRole("main");
  await expect(main.getByText("Ana Souza")).toBeVisible();
  await expect(main.getByText("ana.souza@nexo.com.br")).toBeVisible();
});