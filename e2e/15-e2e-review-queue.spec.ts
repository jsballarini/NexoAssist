import { expect, test } from "@playwright/test";
import { loginAsRafael, resetAnalystTransferSeeds } from "./auth";

test("E2E-REVIEW: filtro 'Com o agent' lista conversa do agent sem segurança e o resumo do handoff", async ({
  page,
}) => {
  await resetAnalystTransferSeeds(page);
  await loginAsRafael(page);

  await page.getByRole("button", { name: "Com o agent" }).click();
  const review = page.locator('[data-inbox-kind="review"]').first();
  await expect(review).toBeVisible({ timeout: 15_000 });
  await expect(review.locator("[data-review-badge]")).toContainText("Agent pediu ajuda");

  await page.getByRole("button", { name: "Todas" }).click();
  await page.locator('[data-inbox-kind="handoff"]').filter({ hasText: "Ana Souza" }).first().click();
  await expect(page.locator("[data-handoff-summary]")).toContainText("INC-20311");
});
