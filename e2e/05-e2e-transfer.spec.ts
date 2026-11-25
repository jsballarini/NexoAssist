import { expect, test } from "@playwright/test";
import { loginAsAna } from "./auth";

test("E2E-TRANSFER: falar analista → awaiting", async ({ page }) => {
  await loginAsAna(page);

  await page.getByPlaceholder("Escreva para o Nexo…").fill("Preciso falar com um analista humano");
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(page.getByText(/transferir|analista humano/i).first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText(/Aguardando analista/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("[data-conversation-state='awaiting_analyst']")).toBeVisible();
  await expect(page.getByPlaceholder("Escreva para o Nexo…")).toBeDisabled();
});