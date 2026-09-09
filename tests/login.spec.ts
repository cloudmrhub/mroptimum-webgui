import { expect, test } from "@playwright/test";
import {
  fillLoginForm,
  getInvalidLoginCredentials,
  loginThroughUi,
  openLoginPage,
} from "./helpers/auth";

test.describe("Login flow", () => {
  test.describe.configure({ mode: "serial" });

  // Always start this spec unauthenticated, even when auth state reuse is enabled.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("user can log in successfully", async ({ page }) => {
    await loginThroughUi(page);

    // The Home tab is the default landing area after a successful login.
    await expect(page.getByText("Uploaded Data")).toBeVisible();
  });

  test("shows an error for invalid credentials", async ({ page }) => {
    const invalidCredentials = getInvalidLoginCredentials();

    await openLoginPage(page);
    await fillLoginForm(page, invalidCredentials);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/login(?:\/)?(?:[?#].*)?$/);
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 15000 });
    await expect(alert).toContainText(/user not found|sign in failed|invalid|incorrect|unauthorized|credentials|password|email/i);
  });
});
