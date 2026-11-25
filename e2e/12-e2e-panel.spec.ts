import { expect, test } from "@playwright/test";
import { loginAsRafael, resetAnalystTransferSeeds } from "./auth";

test("E2E-PANEL: painel INC-20311", async ({ page }) => {
  await resetAnalystTransferSeeds(page);
  await loginAsRafael(page);
  await page.getByRole("button", { name: "Para você" }).click();
  await page.getByRole("button").filter({ hasText: "Ana Souza" }).first().click();
  await expect(page.locator("[data-ticket-panel]")).toContainText("INC-20311", {
    timeout: 15_000,
  });
  await expect(page.locator("[data-ticket-panel]")).toContainText(/\d+ abertos · \d+ encerrados/);
});