import { test as setup } from "@playwright/test";
import {
  AUTH_STATE_PATH,
  ensureAuthStateDirectory,
  loginThroughUi,
} from "./helpers/auth";

setup("authenticate and save storage state", async ({ page }) => {
  // Save a reusable authenticated browser context for later test runs.
  ensureAuthStateDirectory();
  await loginThroughUi(page);
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
