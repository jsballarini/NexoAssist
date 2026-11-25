import { expect, test } from "@playwright/test";
import { loginAsRafael, resetAnalystTransferSeeds } from "./auth";

test("E2E-TRACE: expandir trace do agent", async ({ page }) => {
  await resetAnalystTransferSeeds(page);
  await loginAsRafael(page);
  await page.getByRole("button", { name: "Para você" }).click();
  await page.getByRole("button").filter({ hasText: "Ana Souza" }).first().click();
  await page.locator("[data-ticket-panel]").getByRole("tab", { name: "Trace" }).click();
  await page.locator("[data-trace-toggle]").first().click();
  await expect(page.locator("[data-trace-understanding]").first()).toBeVisible({
    timeout: 10_000,
  });
});