import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const ANA_EMAIL = "ana.souza@nexo.com.br";

/** Autentica via API (cookie iron-session) e abre o chat. */
export async function loginAsAna(page: Page) {
  const res = await page.request.post("/api/auth/login", {
    data: { email: ANA_EMAIL, password: "qualquer-senha" },
  });
  const raw = await res.text();
  let error: string | undefined;
  try {
    const json = JSON.parse(raw) as { error?: string };
    error = json.error;
  } catch {
    error = raw || res.statusText();
  }
  expect(
    res.ok(),
    `login API ${res.status()}: ${error ?? "erro desconhecido"}`,
  ).toBeTruthy();

  await page.goto("/atendimento", { waitUntil: "domcontentloaded" });
  await page.request.post("/api/conversations/active/new-session");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/atendimento/);
  await expect(page.locator('[data-chat-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });
}

export async function freshChatSession(page: Page) {
  const res = await page.request.post("/api/conversations/active/new-session");
  expect(res.ok()).toBeTruthy();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-chat-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });
}