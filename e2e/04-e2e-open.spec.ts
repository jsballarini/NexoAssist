import { expect, test } from "@playwright/test";
import { loginAsAna } from "./auth";

test("E2E-OPEN: VPN Win11 → draft → confirm INC", async ({ page }) => {
  await loginAsAna(page);

  await page.getByPlaceholder("Escreva para o Nexo…").fill(
    "VPN não conecta no Windows 11, reunião às 14h",
  );
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(page.getByRole("button", { name: "Confirmar" }).first()).toBeVisible({
    timeout: 120_000,
  });
  await page.getByRole("button", { name: "Confirmar" }).first().click();

  const chatMessages = page.locator('[data-chat-ready="true"] .overflow-y-auto');
  await expect(chatMessages.getByText(/INC-\d+/)).toBeVisible({ timeout: 15_000 });
});