import { expect, test } from "@playwright/test";
import { loginAsAna } from "./auth";

test("E2E-KB: VPN 809 sem card draft", async ({ page }) => {
  await loginAsAna(page);

  await page.getByPlaceholder("Escreva para o Nexo…").fill("VPN erro 809 windows 10");
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(
    page.getByText(/809|VPN|vpn-erro-809|artigo/i).first(),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /Confirmar/i })).toHaveCount(0);
});