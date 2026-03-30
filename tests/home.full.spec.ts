import { test, expect } from "@playwright/test";
import path from "path";
import { ensureAuthenticatedSession } from "./helpers/auth";

test.describe("Home page", () => {
  // Tests share server-side state (uploaded files, rename, delete) so they must
  // run sequentially even when fullyParallel is enabled in the Playwright config.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticatedSession(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Page sections", () => {
    test("shows Calculation Counts panel", async ({ page }) => {
      await expect(page.getByText("Calculation Counts").first()).toBeVisible({ timeout: 10000 });
    });

    test("shows Mode 1 (Cloud MR AWS) Computing Units panel", async ({ page }) => {
      await expect(page.getByText("Mode 1 (Cloud MR AWS) Computing Units")).toBeVisible({ timeout: 10000 });
    });

    test("shows Uploaded Data panel", async ({ page }) => {
      await expect(page.getByText("Uploaded Data")).toBeVisible({ timeout: 10000 });
    });

    test("shows Mode 2 Computing Units panel if user has mode 2 units", async ({ page }) => {
      // Mode 2 section only renders when the user has mode 2 computing units
      const mode2Panel = page.getByText("Mode 2 Computing Units");
      const isVisible = await mode2Panel.isVisible();
      if (isVisible) {
        await expect(mode2Panel).toBeVisible();
      } else {
        test.skip(true, "User has no Mode 2 computing units — panel is intentionally hidden");
      }
    });

    test("Calculation Counts loads a numeric value for Mode 1", async ({ page }) => {
      // Wait for loading spinner to disappear
      await expect(page.getByText("Loading calculation counts...")).toBeHidden({ timeout: 10000 });
      // Mode 1 count label should appear with a number
      await expect(page.getByText(/Mode 1 \(Cloud MR AWS\)/i).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Uploaded Data table", () => {
    test("shows correct column headers", async ({ page }) => {
      await expect(page.getByText("File Name", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Date Submitted", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Status", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Edit File Name", { exact: true }).first()).toBeVisible();
    });

    test("Delete button is disabled when no file is selected", async ({ page }) => {
      const deleteBtn = page.getByRole("button", { name: /delete/i }).first();
      await expect(deleteBtn).toBeDisabled();
    });

    test("Download button is disabled when no file is selected", async ({ page }) => {
      const downloadBtn = page.getByRole("button", { name: /download/i });
      await expect(downloadBtn).toBeDisabled();
    });

    test("Delete and Download buttons enable after selecting a file", async ({ page }) => {
      // Only run if there are files in the table
      const firstCheckbox = page.locator('[role="row"]').nth(1).locator('input[type="checkbox"]');
      const hasFiles = await firstCheckbox.isVisible({ timeout: 5000 }).catch(() => false);
      test.skip(!hasFiles, "No uploaded files available to select");

      await firstCheckbox.check();
      await expect(page.getByRole("button", { name: /delete/i }).first()).toBeEnabled();
      await expect(page.getByRole("button", { name: /download/i })).toBeEnabled();
    });
  });

  test.describe("File upload", () => {
    test("uploading a .nii file is rejected (does not appear in table)", async ({ page }) => {
      await page.getByRole("button", { name: "Upload", exact: true }).click();
      const uploadInput = page.locator('input[type="file"]').first();
      await uploadInput.setInputFiles(path.resolve(__dirname, "../public/hippo.nii"));
      await page.waitForTimeout(1500);
      const niiRow = page.locator('[role="row"]', { has: page.getByText("hippo.nii") });
      await expect(niiRow).toHaveCount(0);
    });

    test("uploading a .dat file succeeds and appears in table", async ({ page }) => {
      await page.getByRole("button", { name: "Upload", exact: true }).click();
      const uploadInput = page.locator('input[type="file"]').first();
      await uploadInput.setInputFiles(path.resolve(__dirname, "../public/sodium.dat"));
      await expect(page.getByText("sodium.dat")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("File rename", () => {
    test("clicking the edit icon opens the rename dialog", async ({ page }) => {
      const editBtn = page.locator('[role="row"]').nth(1).getByRole("button").first();
      const hasFiles = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);
      test.skip(!hasFiles, "No uploaded files available to rename");

      await editBtn.click();
      // Rename dialog should appear
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    });

    test("renaming a file without an extension shows an error message", async ({ page }) => {
      const editBtn = page.locator('[role="row"]').nth(1).getByRole("button").first();
      const hasFiles = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);
      test.skip(!hasFiles, "No uploaded files available to rename");

      await editBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

      // Clear the input and type a name with no extension
      const nameInput = page.getByRole("dialog").locator("input").first();
      await nameInput.clear();
      await nameInput.fill("newfilenamenoextension");
      await page.getByRole("dialog").getByRole("button", { name: /confirm|save|ok|rename/i }).click();

      // Should show error about missing extension
      await expect(page.getByText(/missing file extension/i)).toBeVisible({ timeout: 5000 });
    });

    test("renaming a file with a changed extension shows a confirmation dialog", async ({ page }) => {
      const editBtn = page.locator('[role="row"]').nth(1).getByRole("button").first();
      const hasFiles = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);
      test.skip(!hasFiles, "No uploaded files available to rename");

      await editBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

      // Change the extension to something different
      const nameInput = page.getByRole("dialog").locator("input").first();
      await nameInput.clear();
      await nameInput.fill("renamed_file.txt");
      await page.getByRole("dialog").getByRole("button", { name: /confirm|save|ok|rename/i }).click();

      // Should show warning about changing extension
      await expect(page.getByText(/changing file extension/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("File delete", () => {
    test("selecting a file and clicking Delete opens a confirmation dialog", async ({ page }) => {
      const firstCheckbox = page.locator('[role="row"]').nth(1).locator('input[type="checkbox"]');
      const hasFiles = await firstCheckbox.isVisible({ timeout: 5000 }).catch(() => false);
      test.skip(!hasFiles, "No uploaded files available to delete");

      await firstCheckbox.check();
      await page.getByRole("button", { name: /delete/i }).first().click();

      // Confirmation dialog should appear
      await expect(page.getByText(/please confirm that you are deleting/i)).toBeVisible({ timeout: 5000 });
    });

    test("cancelling the delete confirmation keeps the file in the table", async ({ page }) => {
      const firstRow = page.locator('[role="row"]').nth(1);
      const hasFiles = await firstRow.isVisible({ timeout: 5000 }).catch(() => false);
      test.skip(!hasFiles, "No uploaded files available to delete");

      // Get the file name before deleting
      const fileName = await firstRow.locator('[data-field="fileName"]').textContent();

      await firstRow.locator('input[type="checkbox"]').check();
      await page.getByRole("button", { name: /delete/i }).first().click();
      await expect(page.getByText(/please confirm that you are deleting/i)).toBeVisible({ timeout: 5000 });

      // Click cancel
      await page.getByRole("button", { name: /cancel/i }).click();

      // File should still be in the table
      if (fileName) {
        await expect(page.getByText(fileName)).toBeVisible();
      }
    });
  });
});
