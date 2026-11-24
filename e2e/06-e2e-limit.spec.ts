import { expect, test } from "@playwright/test";
import { freshChatSession, loginAsAna } from "./auth";

test("E2E-LIMIT: 30 msgs → nova sessão", async ({ page }) => {
  test.setTimeout(600_000);
  await loginAsAna(page);
  await freshChatSession(page);
  await expect(page.locator('[data-conversation-state="with_agent"]')).toBeVisible();
  await expect(page.getByPlaceholder("Digite sua mensagem…")).toBeEnabled();

  for (let i = 0; i < 30; i++) {
    const composer = page.getByPlaceholder("Digite sua mensagem…");
    await expect(composer).toBeEnabled({ timeout: 120_000 });
    await composer.fill(`Olá ${i}`);
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/api/conversations/active/messages") && r.status() === 202,
        { timeout: 90_000 },
      ),
      page.getByRole("button", { name: "Enviar" }).click(),
    ]);
    await expect(page.getByText(new RegExp(`${i + 1}/30 mensagens`))).toBeVisible({
      timeout: 120_000,
    });
  }

  await expect(page.getByText(/Limite de 30 mensagens/i)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Nova sessão" }).first().click();
  await expect(page.getByText(/0\/30/)).toBeVisible({ timeout: 10_000 });
});