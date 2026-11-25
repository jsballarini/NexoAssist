import { expect, test } from "@playwright/test";
import { loginAsRafael, resetAnalystTransferSeeds } from "./auth";

test("E2E-INBOX: fila mostra Ana e Carla", async ({ page }) => {
  await resetAnalystTransferSeeds(page);
  await loginAsRafael(page);
  await page.getByRole("button", { name: "Para você" }).click();
  await expect(
    page.getByRole("button").filter({ hasText: "Ana Souza" }).first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button").filter({ hasText: "Carla Mendes" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Para você" }).click();
  await expect(page.locator('[data-inbox-state="awaiting_analyst"]').first()).toBeVisible();
});