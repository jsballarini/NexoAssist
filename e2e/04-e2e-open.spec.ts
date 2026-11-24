import { expect, test } from "@playwright/test";
import { loginAsAna } from "./auth";

test("E2E-OPEN: VPN Win11 → draft → confirm INC", async ({ page }) => {
  await loginAsAna(page);

  await page.getByPlaceholder("Digite sua mensagem…").fill(
    "VPN não conecta no Windows 11, reunião às 14h",
  );
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(page.getByRole("button", { name: "Confirmar" }).first()).toBeVisible({
    timeout: 120_000,
  });
  await page.getByRole("button", { name: "Confirmar" }).first().click();

  await expect(page.getByText(/INC-\d+/).first()).toBeVisible({ timeout: 15_000 });
});