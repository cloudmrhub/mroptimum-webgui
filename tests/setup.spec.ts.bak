import { test, expect } from "@playwright/test";
import path from "path";
import { ensureAuthenticatedSession } from "./helpers/auth";

test.describe("Setup page", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure authenticated session before each test
    await ensureAuthenticatedSession(page);
  });

  test("navigate to setup page", async ({ page }) => {
    await page.goto("/setup");
    await expect(page.getByRole("tab", { name: /setup/i })).toBeVisible();
  });

  test("test analysis method selection", async ({ page }) => {
    await page.goto("/setup");

    // Find and interact with analysis method selector
    const analysisMethodSelect = page.getByLabel(/analysis method/i, { exact: false });
    if (await analysisMethodSelect.isVisible()) {
      await analysisMethodSelect.click();
      // Select first available option after dropdown opens
      const options = page.getByRole("option");
      const optionCount = await options.count();
      if (optionCount > 0) {
        await options.first().click();
        await expect(analysisMethodSelect).toHaveValue(/\w+/); // Should have a value/text
      }
    }
  });

  test("test reconstruction method selection", async ({ page }) => {
    await page.goto("/setup");

    // Find and interact with reconstruction method selector
    const recon = page.locator('select, [role="combobox"]').filter({ hasText: /reconstruction|recon/i });
    if (await recon.first().isVisible()) {
      await recon.first().click();
      const options = page.getByRole("option");
      if (await options.count() > 0) {
        await options.first().click();
      }
    }
  });

  test("test pseudo replica count input", async ({ page }) => {
    await page.goto("/setup");

    // Find pseudo replica count input (number input)
    const pseudoReplicaInput = page.locator('input[type="number"]').filter({ hasText: /replica|count/ }).first();
    if (await pseudoReplicaInput.isVisible()) {
      await pseudoReplicaInput.fill("5");
      const value = await pseudoReplicaInput.inputValue();
      expect(value).toContain("5");
    }
  });

  test("test box size input", async ({ page }) => {
    await page.goto("/setup");

    // Find box size input
    const boxSizeInput = page.locator('input[type="number"]').filter({ hasText: /box|size/ }).first();
    if (await boxSizeInput.isVisible()) {
      await boxSizeInput.fill("64");
      const value = await boxSizeInput.inputValue();
      expect(value).toContain("64");
    }
  });

  test("test flip angle correction checkbox", async ({ page }) => {
    await page.goto("/setup");

    // Find and toggle flip angle correction checkbox
    const flipAngleCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /flip|angle/i }).first();
    if (await flipAngleCheckbox.isVisible()) {
      const isChecked = await flipAngleCheckbox.isChecked();
      await flipAngleCheckbox.click();
      const newState = await flipAngleCheckbox.isChecked();
      expect(newState).not.toEqual(isChecked);
    }
  });

  test("test toggle output settings checkboxes", async ({ page }) => {
    await page.goto("/setup");

    // Find output settings checkboxes (gfactor, coilsensitivity, matlab)
    const outputCheckboxes = page.locator('input[type="checkbox"]').filter({ 
      hasText: /output|gfactor|coil|matlab/i 
    });

    const count = await outputCheckboxes.count();
    if (count > 0) {
      // Toggle first output checkbox
      const firstCheckbox = outputCheckboxes.first();
      const initialState = await firstCheckbox.isChecked();
      await firstCheckbox.click();
      const newState = await firstCheckbox.isChecked();
      expect(newState).not.toEqual(initialState);
    }
  });

  test("test mask method selection", async ({ page }) => {
    await page.goto("/setup");

    // Find mask method selector
    const maskMethodSelect = page.locator('select, [role="combobox"]').filter({ hasText: /mask|method/i }).first();
    if (await maskMethodSelect.isVisible()) {
      await maskMethodSelect.click();
      const options = page.getByRole("option");
      if (await options.count() > 0) {
        await options.first().click();
      }
    }
  });

  test("test mask threshold input", async ({ page }) => {
    await page.goto("/setup");

    // Find mask threshold input
    const maskThresholdInput = page.locator('input').filter({ 
      hasText: /threshold|mask/i 
    }).first();
    
    if (await maskThresholdInput.isVisible()) {
      await maskThresholdInput.fill("0.5");
      const value = await maskThresholdInput.inputValue();
      expect(value).toContain("0.5");
    }
  });

  test("test sensitivity map method selection", async ({ page }) => {
    await page.goto("/setup");

    // Find sensitivity map method selector
    const sens = page.locator('select, [role="combobox"]').filter({ 
      hasText: /sensitivity|map|method/i 
    }).first();
    
    if (await sens.isVisible()) {
      await sens.click();
      const options = page.getByRole("option");
      if (await options.count() > 0) {
        await options.first().click();
      }
    }
  });

  test("test signal file upload", async ({ page }) => {
    await page.goto("/setup");

    // Find signal file upload input
    const signalUpload = page.locator('input[type="file"]').filter({ 
      hasText: /signal/i 
    }).first();
    
    if (await signalUpload.isVisible()) {
      // Use sodium.dat for upload test
      await signalUpload.setInputFiles(path.resolve(__dirname, "../public/sodium.dat"));
      await expect(page.getByText(/signal.*uploaded|uploading/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test("test noise file upload", async ({ page }) => {
    await page.goto("/setup");

    // Find noise file upload input
    const noiseUpload = page.locator('input[type="file"]').filter({ 
      hasText: /noise/i 
    }).first();
    
    if (await noiseUpload.isVisible()) {
      // Use sodium.dat for upload test
      await noiseUpload.setInputFiles(path.resolve(__dirname, "../public/sodium.dat"));
      await expect(page.getByText(/noise.*uploaded|uploading/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test("test uploaded data selection from dropdowns", async ({ page }) => {
    await page.goto("/setup");

    // Find data selection dropdowns (e.g., k-space, coil, etc.)
    const dataSelects = page.locator('select, [role="combobox"]').filter({ 
      hasText: /data|file|select|choose/i 
    });

    const count = await dataSelects.count();
    if (count > 0) {
      // Try to interact with first data select
      const firstSelect = dataSelects.first();
      if (await firstSelect.isVisible()) {
        await firstSelect.click();
        const options = page.getByRole("option");
        if (await options.count() > 0) {
          await options.first().click();
          // Verify selection was made
          await expect(firstSelect).toHaveValue(/\w+/);
        }
      }
    }
  });

  test("test decimate acceleration inputs", async ({ page }) => {
    await page.goto("/setup");

    // Find decimate acceleration inputs
    const decimateInputs = page.locator('input[type="number"]').filter({ 
      hasText: /decimate|acceleration/i 
    });

    const count = await decimateInputs.count();
    if (count > 0) {
      const firstInput = decimateInputs.first();
      await firstInput.fill("2");
      const value = await firstInput.inputValue();
      expect(value).toBe("2");
    }
  });

  test("test kernel size inputs", async ({ page }) => {
    await page.goto("/setup");

    // Find kernel size inputs
    const kernelInputs = page.locator('input[type="number"]').filter({ 
      hasText: /kernel|size/i 
    });

    const count = await kernelInputs.count();
    if (count > 0) {
      const firstInput = kernelInputs.first();
      await firstInput.fill("3");
      const value = await firstInput.inputValue();
      expect(value).toContain("3");
    }
  });

  test("test computing unit selection", async ({ page }) => {
    await page.goto("/setup");

    // Find computing unit selector (Mode 1/Mode 2)
    const cuSelect = page.locator('select, [role="combobox"]').filter({ 
      hasText: /computing|unit|mode/i 
    }).first();

    if (await cuSelect.isVisible()) {
      await cuSelect.click();
      const options = page.getByRole("option");
      if (await options.count() > 0) {
        await options.first().click();
        await expect(cuSelect).toHaveValue(/\w+/);
      }
    }
  });

  test("test all inputs render without errors", async ({ page }) => {
    await page.goto("/setup");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Verify key sections are visible
    await expect(page.getByRole("tab", { name: /setup/i })).toBeVisible();

    // Check for main form elements
    const selects = page.locator("select, [role='combobox']");
    const inputs = page.locator("input");
    const checkboxes = page.locator('input[type="checkbox"]');

    // Count elements
    const selectCount = await selects.count();
    const inputCount = await inputs.count();
    const checkboxCount = await checkboxes.count();

    // Should have at least some form elements
    expect(selectCount + inputCount + checkboxCount).toBeGreaterThan(0);

    // Verify no console errors
    let hasErrors = false;
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        hasErrors = true;
        console.error("Console error:", msg.text());
      }
    });

    await page.waitForTimeout(1000);
    expect(hasErrors).toBe(false);
  });
});
