import { expect, test } from "@playwright/test";
import { loginAsRafael, resetAnalystTransferSeeds } from "./auth";

test("E2E-ASSUME: Rafael assume e envia mensagem", async ({ page }) => {
  await resetAnalystTransferSeeds(page);
  await loginAsRafael(page);
  await page.getByRole("button", { name: "Para você" }).click();
  await page.getByRole("button").filter({ hasText: "Ana Souza" }).first().click();
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/assume") && r.status() === 200,
    ),
    page.getByRole("button", { name: "Assumir" }).click(),
  ]);
  await expect(
    page.locator('[data-takeover-bar][data-thread-state="with_analyst"]'),
  ).toBeVisible({ timeout: 10_000 });
  const composer = page.getByPlaceholder("Mensagem ao funcionário…");
  await expect(composer).toBeEnabled();
  await composer.fill("Olá Ana, sou o Rafael do suporte.");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Rafael do suporte")).toBeVisible({ timeout: 10_000 });
});