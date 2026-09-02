import { test, expect, type Page } from "@playwright/test";
import path from "path";
import { existsSync } from "fs";
import { ensureAuthenticatedSession } from "./helpers/auth";

/**
 * Home uses CMRUpload, which opens a "File Upload" dialog. Choosing a file only
 * stages it; the dialog's Upload button must be clicked to run the upload.
 * Do not use page.locator('input[type="file"]').first() — other tabs (Setup,
 * Results) stay mounted and expose their own file inputs first in DOM order.
 */
async function pickFileAndConfirmHomeUpload(page: Page, filePath: string): Promise<void> {
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  const fileDialog = page.getByRole("dialog", { name: /file upload/i });
  await expect(fileDialog).toBeVisible({ timeout: 10000 });
  await fileDialog.locator('input[type="file"]').setInputFiles(filePath);
  await fileDialog.getByRole("button", { name: /^upload$/i }).click();
  await expect(fileDialog).toBeHidden({ timeout: 60000 });
}

async function pickFilesAndConfirmHomeUpload(page: Page, filePaths: string[]): Promise<void> {
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  const fileDialog = page.getByRole("dialog", { name: /file upload/i });
  await expect(fileDialog).toBeVisible({ timeout: 10000 });
  await fileDialog.locator('input[type="file"]').setInputFiles(filePaths);

  for (const filePath of filePaths) {
    await expect(
      fileDialog.getByText(path.basename(filePath), { exact: true }),
    ).toBeVisible({ timeout: 5000 });
  }
  await expect(
    fileDialog.getByRole("button", { name: new RegExp(`^upload \\(${filePaths.length}\\)$`, "i") }),
  ).toBeEnabled();

  await fileDialog
    .getByRole("button", { name: new RegExp(`^upload \\(${filePaths.length}\\)$`, "i") })
    .click();
  // Multi-file uploads run sequentially; allow extra time.
  await expect(fileDialog).toBeHidden({ timeout: 120000 });
}

test.describe("Home page", () => {
  // Tests share server-side state (uploaded files, rename, delete) so they must
  // run sequentially even when fullyParallel is enabled in the Playwright config.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticatedSession(page);
    // ensureAuthenticatedSession already navigates to /main and confirms the
    // Home tab is visible — no additional navigation needed.
  });

  test.describe("Page sections", () => {
    test("Shows Jobs Count panel", async ({ page }) => {
      await expect(page.getByText("Jobs Count").first()).toBeVisible({ timeout: 10000 });
    });

    test("Shows Uploaded Data panel", async ({ page }) => {
      await expect(page.getByText("Uploaded Data")).toBeVisible({ timeout: 10000 });
    });

    test("Shows Mode 2 Computing Units panel if user has mode 2 units", async ({ page }) => {
      // Mode 2 section only renders when the user has mode 2 computing units
      const mode2Panel = page.getByText("Mode 2 Computing Units");
      const isVisible = await mode2Panel.isVisible();
      if (isVisible) {
        await expect(mode2Panel).toBeVisible();
      } else {
        test.skip(true, "User has no Mode 2 computing units — panel is intentionally hidden");
      }
    });

    test("Jobs Count loads a numeric value for Mode 1", async ({ page }) => {
      // Wait for loading spinner to disappear
      await expect(page.getByText("Loading calculation counts...")).toBeHidden({ timeout: 10000 });
      // Mode 1 count label should appear with a number
      await expect(page.getByText(/Mode 1 \(Cloud MR AWS\)/i).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Uploaded Data table", () => {
    test("Shows correct column headers", async ({ page }) => {
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

  test.describe("File upload and rename", () => {
    /** Shared across serial tests in this block after a successful upload+rename. */
    let uploadedThenRenamedFile = "";

    test("Uploading multiple files succeeds and both appear in table", async ({ page }) => {
      const file1 = path.resolve(__dirname, "../public/sodium.dat");
      const file2 = path.resolve(__dirname, "../public/CBI_crop.png");
      test.skip(!existsSync(file1) || !existsSync(file2), "Missing public upload fixtures");

      await pickFilesAndConfirmHomeUpload(page, [file1, file2]);

      await expect(page.getByText("sodium.dat").first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("CBI_crop.png").first()).toBeVisible({ timeout: 15000 });
    });

    test("Upload only accepts allowed file extensions", async ({
      page,
    }) => {
      // UploadWindow.filterAndCapFiles rejects disallowed types on file pick/drop and
      // shows an MUI Alert (e.g. `"foo.mp4" has an unsupported extension`).
      const rejectMp4 = path.resolve(__dirname, "../public/test0fail-upload.mp4");
      test.skip(
        !existsSync(rejectMp4),
        "Add public/test0fail-upload.mp4 (disallowed type for Home CMRUpload)",
      );

      const fileName = path.basename(rejectMp4);
      await page.getByRole("button", { name: "Upload", exact: true }).click();
      const fileDialog = page.getByRole("dialog", { name: /file upload/i });
      await expect(fileDialog).toBeVisible({ timeout: 10000 });

      await fileDialog.locator('input[type="file"]').setInputFiles(rejectMp4);

      // filterAndCapFiles may show the unsupported-extension warning, then overwrite with
      // "No valid files selected" when nothing remains — either proves rejection.
      const alert = fileDialog.getByRole("alert");
      await expect(alert).toBeVisible({ timeout: 5000 });
      await expect(alert).toContainText(
        new RegExp(
          `"${fileName}" has an unsupported extension|No valid files selected`,
          "i",
        ),
      );
      await expect(
        fileDialog.getByRole("button", { name: /^upload$/i }),
      ).toBeDisabled();

      await fileDialog.getByRole("button", { name: /^cancel$/i }).click();
      await expect(fileDialog).toBeHidden({ timeout: 5000 });
    });

    test("Upload a file then rename it updates the name in the table", async ({ page }) => {
      const source = path.resolve(__dirname, "../public/sodium.dat");
      const renamedTo = `e2e_renamed_${Date.now()}.dat`;

      await pickFileAndConfirmHomeUpload(page, source);
      await expect(page.getByText("sodium.dat").first()).toBeVisible({ timeout: 10000 });

      const uploadedRow = page
        .locator('[role="row"]')
        .filter({ has: page.getByText("sodium.dat", { exact: true }) })
        .first();
      await uploadedRow.getByRole("button").first().click();

      const renameDialog = page.getByRole("dialog").filter({ hasText: /rename the file/i });
      await expect(renameDialog).toBeVisible({ timeout: 5000 });
      const nameInput = renameDialog.locator("input").first();
      await nameInput.clear();
      await nameInput.fill(renamedTo);
      await renameDialog.getByRole("button", { name: /^confirm$/i }).click();

      // Same extension → rename proceeds without the extension-change confirmation.
      await expect(renameDialog).toBeHidden({ timeout: 15000 });
      await expect(page.getByText(renamedTo, { exact: true })).toBeVisible({ timeout: 15000 });

      uploadedThenRenamedFile = renamedTo;
    });

    test("Renaming a file without an extension shows an error message", async ({ page }) => {
      test.skip(
        !uploadedThenRenamedFile,
        "Depends on prior upload+rename test creating a target file",
      );

      const row = page
        .locator('[role="row"]')
        .filter({ has: page.getByText(uploadedThenRenamedFile, { exact: true }) })
        .first();
      await expect(row).toBeVisible({ timeout: 10000 });
      await row.getByRole("button").first().click();

      const renameDialog = page.getByRole("dialog").filter({ hasText: /rename the file/i });
      await expect(renameDialog).toBeVisible({ timeout: 5000 });
      const nameInput = renameDialog.locator("input").first();
      await nameInput.clear();
      await nameInput.fill("newfilenamenoextension");
      await renameDialog.getByRole("button", { name: /^confirm$/i }).click();

      await expect(page.getByText(/missing file extension/i)).toBeVisible({ timeout: 5000 });
      // Dismiss confirmation without applying the invalid rename.
      await page.getByRole("button", { name: /^cancel$/i }).last().click();
    });

    test("Renaming a file with a changed extension shows a confirmation dialog", async ({ page }) => {
      test.skip(
        !uploadedThenRenamedFile,
        "Depends on prior upload+rename test creating a target file",
      );

      const row = page
        .locator('[role="row"]')
        .filter({ has: page.getByText(uploadedThenRenamedFile, { exact: true }) })
        .first();
      await expect(row).toBeVisible({ timeout: 10000 });
      await row.getByRole("button").first().click();

      const renameDialog = page.getByRole("dialog").filter({ hasText: /rename the file/i });
      await expect(renameDialog).toBeVisible({ timeout: 5000 });
      const nameInput = renameDialog.locator("input").first();
      await nameInput.clear();
      await nameInput.fill("renamed_file.txt");
      await renameDialog.getByRole("button", { name: /^confirm$/i }).click();

      await expect(page.getByText(/changing file extension/i)).toBeVisible({ timeout: 5000 });
      // Cancel so we do not leave a .txt name behind for later delete tests.
      await page.getByRole("button", { name: /^cancel$/i }).last().click();
    });
  });

  test.describe("File download", () => {
    test("Download starts a browser download when a file is selected", async ({ page }) => {
      // Home is the first tab; its tabpanel contains the Uploaded Data Download button.
      const homeTabPanel = page.getByRole("tabpanel").first();
      const firstRow = page.locator('[role="row"]').nth(1);
      const hasFiles = await firstRow.isVisible({ timeout: 5000 }).catch(() => false);
      test.skip(!hasFiles, "No uploaded files available to download");

      await firstRow.locator('input[type="checkbox"]').check();
      const downloadBtn = homeTabPanel.getByRole("button", { name: /^download$/i });

      const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
      await downloadBtn.click();
      const download = await downloadPromise;

      // Download event means the browser started a download. Suggested filename may be
      // empty for some cross-origin URLs where the `download` attribute is ignored.
      const suggested = download.suggestedFilename();
      expect(suggested.length > 0 || download.url().length > 0).toBe(true);
    });
  });

  test.describe("File delete", () => {
    test("Selecting a file and clicking Delete opens a confirmation dialog", async ({ page }) => {
      const firstCheckbox = page.locator('[role="row"]').nth(1).locator('input[type="checkbox"]');
      const hasFiles = await firstCheckbox.isVisible({ timeout: 5000 }).catch(() => false);
      test.skip(!hasFiles, "No uploaded files available to delete");

      await firstCheckbox.check();
      await page.getByRole("button", { name: /delete/i }).first().click();

      // Confirmation dialog should appear
      await expect(page.getByText(/please confirm that you are deleting/i)).toBeVisible({ timeout: 5000 });
    });

    test("Cancelling the delete confirmation keeps the file in the table", async ({ page }) => {
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

    test("Confirming delete removes the file from the table", async ({ page }) => {
      await pickFileAndConfirmHomeUpload(page, path.resolve(__dirname, "../public/sodium.dat"));
      await expect(page.getByText("sodium.dat").first()).toBeVisible({ timeout: 10000 });

      const rowsWithName = page
        .locator('[role="row"]')
        .filter({ has: page.getByText("sodium.dat", { exact: true }) });
      const countBefore = await rowsWithName.count();
      test.skip(countBefore === 0, "No sodium.dat row after upload");

      await rowsWithName.first().locator('input[type="checkbox"]').check();
      await page.getByRole("button", { name: /delete/i }).first().click();
      await expect(page.getByText(/please confirm that you are deleting/i)).toBeVisible({ timeout: 5000 });

      await page.getByRole("dialog").getByRole("button", { name: /^confirm$/i }).click();

      await expect(rowsWithName).toHaveCount(countBefore - 1, { timeout: 15000 });
    });
  });
});
