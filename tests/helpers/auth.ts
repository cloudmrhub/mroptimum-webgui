import { expect, Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

export type LoginCredentials = {
  email: string;
  password: string;
};

export const AUTH_STATE_PATH = path.join(
  process.cwd(),
  "playwright",
  ".auth",
  "auth.json",
);

export function getLoginCredentials(): LoginCredentials {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing E2E_EMAIL or E2E_PASSWORD. Export both variables before running Playwright login tests.",
    );
  }

  return { email, password };
}

export function getInvalidLoginCredentials(): LoginCredentials | undefined {
  const email = process.env.E2E_INVALID_EMAIL;
  const password = process.env.E2E_INVALID_PASSWORD;

  if (!email || !password) {
    return undefined;
  }

  return { email, password };
}

export function ensureAuthStateDirectory(): void {
  mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
}

export async function openLoginPage(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^sign in$/i })).toBeVisible();
}

export async function fillLoginForm(
  page: Page,
  credentials: LoginCredentials,
): Promise<void> {
  await page.getByLabel(/email address/i).fill(credentials.email);
  // The shared MUI password field exposes a stable name/id, but getByLabel()
  // is flaky here because the rendered label is not always resolved the same way.
  const passwordField = page.locator('input[name="password"]');
  await expect(passwordField).toBeVisible();
  await passwordField.fill(credentials.password);
}

export async function waitForAuthenticatedApp(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/main(?:\/)?(?:[?#].*)?$/, { timeout: 15000 });
  // React may take a while to mount on cold loads — 15s covers slow CI environments.
  await expect(page.getByRole("tab", { name: /^home$/i })).toBeVisible({ timeout: 15000 });
}

export async function ensureAuthenticatedSession(page: Page): Promise<void> {
  await page.goto("/main");

  if (/\/login(?:\/)?(?:[?#].*)?$/.test(page.url())) {
    await loginThroughUi(page);
    return;
  }

  await waitForAuthenticatedApp(page);
}

export async function loginThroughUi(
  page: Page,
  credentials: LoginCredentials = getLoginCredentials(),
): Promise<void> {
  await openLoginPage(page);
  await fillLoginForm(page, credentials);

  await Promise.all([
    page.waitForURL(/\/main(?:\/)?(?:[?#].*)?$/),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);

  await waitForAuthenticatedApp(page);
}
