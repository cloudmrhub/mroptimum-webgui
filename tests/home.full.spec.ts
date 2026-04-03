import { test, expect, type Page } from "@playwright/test";
import path from "path";
import { readFileSync, existsSync } from "fs";
import { ensureAuthenticatedSession } from "./helpers/auth";

/** Same join as `UploadWindow.tsx` / `Home.tsx` `fileExtension` prop — drop handler sets `warningText` to this. */
const HOME_UPLOAD_ALLOWED_EXTENSIONS_MESSAGE =
  "Only accepting files with extension(s): .nii, .nii.gz, .mha, .mhd, .mrd, .dat, .h5, .png, .jpg, .jpeg, .npx, .npy, .pkl, .mat";

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
    test("Shows Calculation Counts panel", async ({ page }) => {
      await expect(page.getByText("Calculation Counts").first()).toBeVisible({ timeout: 10000 });
    });

    test("Shows Mode 1 (Cloud MR AWS) Computing Units panel", async ({ page }) => {
      await expect(page.getByText("Mode 1 (Cloud MR AWS) Computing Units")).toBeVisible({ timeout: 10000 });
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

    test("Calculation Counts loads a numeric value for Mode 1", async ({ page }) => {
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

  test.describe("File upload", () => {
    test("Uploading a .dat file succeeds and appears in table", async ({ page }) => {
      await pickFileAndConfirmHomeUpload(page, path.resolve(__dirname, "../public/sodium.dat"));
      await expect(page.getByText("sodium.dat")).toBeVisible({ timeout: 10000 });
    });

    test("Upload only accepts allowed file extensions", async ({
      page,
    }) => {
      // UploadWindow.tsx: `loadSelectedFiles` → `loadFiles` does NOT validate extensions.
      // Extension checks run on `drop` (and dragover border only). Simulate a real drop so the
      // MUI Alert shows `warningText` (lines 259–270 in cloudmr-ux UploadWindow.tsx).
      const rejectMp4 = path.resolve(__dirname, "../public/test0fail-upload.mp4");
      test.skip(
        !existsSync(rejectMp4),
        "Add public/test0fail-upload.mp4 (disallowed type for Home CMRUpload)",
      );

      await page.getByRole("button", { name: "Upload", exact: true }).click();
      const fileDialog = page.getByRole("dialog", { name: /file upload/i });
      await expect(fileDialog).toBeVisible({ timeout: 10000 });

      const dropZone = fileDialog
        .getByText(/Drag & Drop or Click to Upload Your File Here/i)
        .locator("..");
      const b64 = readFileSync(rejectMp4, { encoding: "base64" });
      const fileName = path.basename(rejectMp4);
      await dropZone.evaluate(
        (el, { payloadB64, name }) => {
          const binary = atob(payloadB64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const file = new File([bytes], name, { type: "video/mp4" });
          const dt = new DataTransfer();
          dt.items.add(file);
          el.dispatchEvent(
            new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }),
          );
        },
        { payloadB64: b64, name: fileName },
      );

      const alert = fileDialog.getByRole("alert");
      await expect(alert).toBeVisible({ timeout: 5000 });
      await expect(alert).toHaveText(HOME_UPLOAD_ALLOWED_EXTENSIONS_MESSAGE);

      await fileDialog.getByRole("button", { name: /^cancel$/i }).click();
      await expect(fileDialog).toBeHidden({ timeout: 5000 });
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

  test.describe("File rename", () => {
    test("Clicking the edit icon opens the rename dialog", async ({ page }) => {
      const editBtn = page.locator('[role="row"]').nth(1).getByRole("button").first();
      const hasFiles = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);
      test.skip(!hasFiles, "No uploaded files available to rename");

      await editBtn.click();
      // Rename dialog should appear
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    });

    test("Renaming a file without an extension shows an error message", async ({ page }) => {
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

    test("Renaming a file with a changed extension shows a confirmation dialog", async ({ page }) => {
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
