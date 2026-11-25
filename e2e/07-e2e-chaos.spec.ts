import { expect, test } from "@playwright/test";
import { loginAsAna } from "./auth";

test("E2E-CHAOS: outage 503 → UI mensagem", async ({ page }) => {
  await loginAsAna(page);

  await page.getByPlaceholder("Escreva para o Nexo…").fill(
    "VPN não conecta no Windows 11, reunião às 14h",
  );
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByRole("button", { name: "Confirmar" }).first()).toBeVisible({
    timeout: 30_000,
  });

  await page.route("**/api/tickets/drafts/*/confirm", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Sistema de chamados temporariamente indisponível",
        code: "TICKET_LEGACY_UNAVAILABLE",
        retryAfterMs: 3000,
      }),
    });
  });

  await page.getByRole("button", { name: "Confirmar" }).first().click();

  await expect(
    page.getByText(/temporariamente indisponível/i),
  ).toBeVisible({ timeout: 10_000 });
});