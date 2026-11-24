import { expect, test } from "@playwright/test";
import { loginAsRafael, resetAnalystTransferSeeds } from "./auth";

test("E2E-CLOSE: encerrar conversa", async ({ page }) => {
  await resetAnalystTransferSeeds(page);
  await loginAsRafael(page);
  await page.getByRole("button", { name: "Precisam de você" }).click();
  await page.getByRole("button").filter({ hasText: "Carla Mendes" }).first().click();
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/assume") && r.status() === 200,
    ),
    page.getByRole("button", { name: "Assumir" }).click(),
  ]);
  await page.getByRole("button", { name: "Encerrar" }).click();
  await expect(page.getByText("Selecione uma conversa")).toBeVisible({
    timeout: 10_000,
  });
});