import { expect, test } from "@playwright/test";

test("E2E-LOGIN: Ana acessa atendimento e perfil", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("E-mail corporativo").fill("ana.souza@nexo.com.br");
  await page.getByLabel("Senha").fill("qualquer-senha");
  await Promise.all([
    page.waitForURL(/\/atendimento/, { timeout: 30_000 }),
    page.getByRole("button", { name: "Entrar" }).click(),
  ]);

  await page.goto("/perfil");
  const main = page.getByRole("main");
  await expect(main.getByText("Ana Souza")).toBeVisible();
  await expect(main.getByText("ana.souza@nexo.com.br")).toBeVisible();
});