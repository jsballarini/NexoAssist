import { expect, test } from "@playwright/test";
import { loginAsRafael, resetAnalystTransferSeeds } from "./auth";

const ANA_EMAIL = "ana.souza@nexo.com.br";

test("E2E-RETURN: devolver → nota sistema", async ({ page }) => {
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
  await expect(page.getByRole("button", { name: "Devolver" })).toBeVisible({
    timeout: 10_000,
  });
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/return-to-agent") && r.status() === 200,
    ),
    page.getByRole("button", { name: "Devolver" }).click(),
  ]);

  const login = await page.request.post("/api/auth/login", {
    data: { email: ANA_EMAIL, password: "qualquer-senha" },
  });
  expect(login.ok(), `login Ana ${login.status()}`).toBeTruthy();
  await page.goto("/atendimento", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-chat-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/devolveu ao Nexo Assist/i)).toBeVisible({
    timeout: 15_000,
  });
});