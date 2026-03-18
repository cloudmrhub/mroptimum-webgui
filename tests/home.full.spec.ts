import { test, expect } from "@playwright/test";
import path from "path";
import { ensureAuthenticatedSession } from "./helpers/auth";

test("Home page full workflow", async ({ page }) => {
  // 1. Ensure authenticated session
  await ensureAuthenticatedSession(page);

  // 2. Go to Home page
  await page.goto("/");

  // 3. Check main sections
  await expect(page.getByText("Calculation Counts").first()).toBeVisible();
  await expect(page.getByText("Mode 1 Computing Units")).toBeVisible();
  await expect(page.getByText("Mode 2 Computing Units")).toBeVisible();
  await expect(page.getByText("Uploaded Data")).toBeVisible();

  // 4. Try to upload a .nii file (should fail or not appear)
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  const uploadInput = page.locator('input[type="file"]').first();
  await uploadInput.setInputFiles(path.resolve(__dirname, "../public/hippo.nii"));
  // Wait a moment to see if it appears (should not)
  await page.waitForTimeout(1000);
  const niiRow = page.locator('[role="row"]', { has: page.getByText("hippo.nii") });
  await expect(niiRow).toHaveCount(0);

  // 5. Upload a .dat file (should succeed)
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await uploadInput.setInputFiles(path.resolve(__dirname, "../public/sodium.dat"));
  // Wait up to 10s for sodium.dat to appear anywhere on the page
  await expect(page.getByText("sodium.dat")).toBeVisible({ timeout: 10000 });
  // Successfully uploaded sodium.dat
  const datCell = page.getByText("sodium.dat");
  await expect(datCell).toBeVisible();

  // 6. Check calculation counts and computing unit states
  await expect(page.getByText(/Mode 1/i).first()).toBeVisible();
  await expect(page.getByText(/Mode 2/i).first()).toBeVisible();
});
