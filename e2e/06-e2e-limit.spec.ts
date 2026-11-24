import { expect, test } from "@playwright/test";
import { freshChatSession, loginAsAna } from "./auth";

test("E2E-LIMIT: 30 msgs → nova sessão", async ({ page }) => {
  test.setTimeout(300_000);
  await loginAsAna(page);
  await freshChatSession(page);

  for (let i = 0; i < 30; i++) {
    const composer = page.getByPlaceholder("Digite sua mensagem…");
    await composer.fill(`Olá ${i}`);
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/api/conversations/active/messages") && r.status() === 202,
        { timeout: 90_000 },
      ),
      page.getByRole("button", { name: "Enviar" }).click(),
    ]);
    await expect(composer).toBeEnabled({ timeout: 90_000 });
  }

  await expect(page.getByText(/Limite de 30 mensagens/i)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Nova sessão" }).first().click();
  await expect(page.getByText(/0\/30/)).toBeVisible({ timeout: 10_000 });
});