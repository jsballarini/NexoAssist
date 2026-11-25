import { expect, test, type Browser } from "@playwright/test";
import { loginAsRafael, resetAnalystTransferSeeds } from "./auth";

const CARLA_EMAIL = "carla.mendes@nexo.com.br";
const SYNC_TEXT = "Mensagem do Rafael — sincronização handoff E2E";
const CARLA_REPLY = "Oi Rafael, recebi sua mensagem — Carla";

async function loginAsCarla(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const res = await page.request.post("/api/auth/login", {
    data: { email: CARLA_EMAIL, password: "qualquer-senha" },
  });
  expect(res.ok(), `login Carla ${res.status()}`).toBeTruthy();
  await page.goto("/atendimento", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-chat-ready="true"]')).toBeVisible({ timeout: 30_000 });
  return { context, page };
}

test("E2E-HANDOFF-SYNC: mensagem do analista aparece no chat da funcionária sem recarregar", async ({
  browser,
  page,
}) => {
  await resetAnalystTransferSeeds(page);
  const carla = await loginAsCarla(browser);

  try {
    await loginAsRafael(page);
    await page.getByRole("button", { name: "Para você" }).click();
    await page.getByRole("button").filter({ hasText: "Carla Mendes" }).first().click();
    await page.getByRole("button", { name: "Assumir" }).click();
    await expect(page.locator('[data-thread-state="with_analyst"]')).toBeVisible({ timeout: 10_000 });

    const composer = page.getByPlaceholder("Mensagem ao funcionário…");
    await composer.fill(SYNC_TEXT);
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText(SYNC_TEXT)).toBeVisible();

    await expect(carla.page.getByText(SYNC_TEXT)).toBeVisible({ timeout: 12_000 });
    const bubble = carla.page.locator('[data-message-role="analyst"]').filter({ hasText: SYNC_TEXT });
    await expect(bubble).toBeVisible();
    await expect(bubble.locator("[data-analyst-label]")).toContainText("Rafael Lima");

    const employeeComposer = carla.page.getByPlaceholder("Mensagem para o analista…");
    await expect(employeeComposer).toBeEnabled();
    await employeeComposer.fill(CARLA_REPLY);
    await carla.page.getByRole("button", { name: "Enviar" }).click();
    await expect(carla.page.getByText(CARLA_REPLY)).toBeVisible();
    await expect(
      page.locator('[data-thread-role="user"]').filter({ hasText: CARLA_REPLY }),
    ).toBeVisible({ timeout: 12_000 });
  } finally {
    await carla.context.close();
  }
});