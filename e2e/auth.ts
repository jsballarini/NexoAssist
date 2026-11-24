import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function loginAsAna(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail corporativo").fill("ana.souza@nexo.com.br");
  await page.getByLabel("Senha").fill("qualquer-senha");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/atendimento/, { timeout: 60_000 });
  await expect(page.locator('[data-chat-ready="true"]')).toBeVisible({
    timeout: 60_000,
  });
}