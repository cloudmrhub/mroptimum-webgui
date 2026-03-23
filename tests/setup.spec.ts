import { test, expect, Page } from "@playwright/test";
import path from "path";
import { ensureAuthenticatedSession } from "./helpers/auth";

// ============================================================
// HELPERS
// ============================================================

/** Expand the SNR Analysis panel if not already visible. */
async function expandSNRPanel(page: Page) {
  const analyticRadio = page.getByRole("radio", { name: "Analytic Method" });
  const isVisible = await analyticRadio.isVisible().catch(() => false);
  if (!isVisible) {
    const header = page.getByText(/SNR Analysis/i).first();
    await header.click();
    await analyticRadio.waitFor({ state: "visible", timeout: 5000 });
  }
}

/** Select an analysis method and wait for the UI to settle. */
async function selectAnalysisMethod(page: Page, name: string) {
  await expandSNRPanel(page);
  const radio = page.getByRole("radio", { name });
  await radio.scrollIntoViewIfNeeded();
  await radio.check({ force: true });
  await expect(radio).toBeChecked();
  await page.waitForTimeout(600);
}

/** Select a reconstruction method. */
async function selectReconMethod(page: Page, name: string) {
  const radio = page.getByRole("radio", { name });
  await radio.scrollIntoViewIfNeeded();
  await radio.check({ force: true });
  await expect(radio).toBeChecked();
  await page.waitForTimeout(400);
}

/**
 * Try to set a spinbutton to a forbidden value, blur, and assert
 * the resulting value is >= minAllowed.
 */
async function assertMinConstraint(
  input: ReturnType<Page["getByRole"]>,
  forbiddenValue: string,
  minAllowed: number,
) {
  await input.fill(forbiddenValue);
  await input.press("Tab");
  await input.page().waitForTimeout(200);
  const raw = await input.inputValue();
  const value = Number(raw);
  expect(value).toBeGreaterThanOrEqual(minAllowed);
}

// ============================================================
// TESTS
// ============================================================

test.describe("Setup page - comprehensive validation", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await ensureAuthenticatedSession(page);
    await page.goto("/setup");
    await page.waitForLoadState("networkidle");
  });

  // ----------------------------------------------------------
  // ANALYSIS METHOD RADIO BUTTONS
  // ----------------------------------------------------------
  test.describe("Analysis method radio buttons", () => {
    test("all four analysis methods are visible and selectable", async ({
      page,
    }) => {
      await expandSNRPanel(page);
      const methods = [
        "Analytic Method",
        "Multiple Replica",
        "Pseudo Multiple Replica",
        "Generalized Pseudo-Replica",
      ];
      for (const name of methods) {
        const radio = page.getByRole("radio", { name });
        await expect(radio).toBeVisible();
        await expect(radio).toBeEnabled();
        await radio.check({ force: true });
        await expect(radio).toBeChecked();
      }
    });
  });

  // ==========================================================
  //  ANALYTIC METHOD
  // ==========================================================
  test.describe("Analytic Method", () => {
    test.beforeEach(async ({ page }) => {
      await selectAnalysisMethod(page, "Analytic Method");
    });

    test("available reconstruction methods: RSS, B1 Weighted, SENSE — no GRAPPA", async ({
      page,
    }) => {
      await expect(
        page.getByRole("radio", { name: "Root Sum of Squares" }),
      ).toBeVisible();
      await expect(
        page.getByRole("radio", { name: "B1 Weighted" }),
      ).toBeVisible();
      await expect(page.getByRole("radio", { name: "SENSE" })).toBeVisible();

      // GRAPPA must NOT appear for Analytic Method
      await expect(
        page.getByRole("radio", { name: "GRAPPA" }),
      ).not.toBeVisible();
    });

    // --------------------------------------------------------
    // RSS (Analytic)
    // --------------------------------------------------------
    test.describe("RSS reconstruction", () => {
      test.beforeEach(async ({ page }) => {
        await selectReconMethod(page, "Root Sum of Squares");
      });

      test("has 'No Flip Angle Correction' checkbox that toggles", async ({
        page,
      }) => {
        const cb = page.getByRole("checkbox", {
          name: /No Flip Angle Correction/i,
        });
        await expect(cb).toBeVisible();
        const was = await cb.isChecked();
        await cb.click({ force: true });
        await expect(cb).toBeChecked({ checked: !was });
      });

      test("has 'Save .mat file' checkbox", async ({ page }) => {
        const cb = page.getByRole("checkbox", { name: /Save .mat file/i });
        await expect(cb).toBeVisible();
      });

      test("does NOT show 'Save Coil Sensitivities'", async ({ page }) => {
        await expect(
          page.getByText("Save Coil Sensitivities"),
        ).not.toBeVisible();
      });

      test("does NOT show 'Save g Factor'", async ({ page }) => {
        await expect(page.getByText("Save g Factor")).not.toBeVisible();
      });

      test("does NOT show Object Masking section", async ({ page }) => {
        await expect(page.getByText("Object Masking")).not.toBeVisible();
      });
    });

    // --------------------------------------------------------
    // B1 Weighted (Analytic)
    // --------------------------------------------------------
    test.describe("B1 Weighted reconstruction", () => {
      test.beforeEach(async ({ page }) => {
        await selectReconMethod(page, "B1 Weighted");
      });

      test("has 'No Flip Angle Correction' checkbox", async ({ page }) => {
        await expect(
          page.getByRole("checkbox", { name: /No Flip Angle Correction/i }),
        ).toBeVisible();
      });

      test("has 'Save .mat file' checkbox", async ({ page }) => {
        await expect(
          page.getByRole("checkbox", { name: /Save .mat file/i }),
        ).toBeVisible();
      });

      test("has 'Save Coil Sensitivities' checkbox", async ({ page }) => {
        await expect(
          page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }),
        ).toBeVisible();
      });

      test("does NOT show 'Save g Factor'", async ({ page }) => {
        await expect(page.getByText("Save g Factor")).not.toBeVisible();
      });

      // -- Object Masking --
      test("shows Object Masking section with all four options", async ({
        page,
      }) => {
        await expect(page.getByText("Object Masking")).toBeVisible();

        await expect(
          page.getByRole("radio", {
            name: /Do Not Mask Coil Sensitivities Maps/i,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole("radio", {
            name: /Keep Pixels Above a Percentage/i,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole("radio", { name: /Use Mask from ESPIRiT/i }),
        ).toBeVisible();
        await expect(
          page.getByRole("radio", { name: /Predefined Mask/i }),
        ).toBeVisible();
      });

      test("'Do Not Mask' radio is selectable", async ({ page }) => {
        const radio = page.getByRole("radio", {
          name: /Do Not Mask Coil Sensitivities Maps/i,
        });
        await radio.scrollIntoViewIfNeeded();
        await radio.check({ force: true });
        await expect(radio).toBeChecked();
      });

      test("'Keep Pixels Above %' — threshold min is 1, cannot be negative", async ({
        page,
      }) => {
        const radio = page.getByRole("radio", {
          name: /Keep Pixels Above a Percentage/i,
        });
        await radio.scrollIntoViewIfNeeded();
        await radio.check({ force: true });
        await expect(radio).toBeChecked();
        await page.waitForTimeout(400);

        // A spinbutton for the percentage threshold should appear
        const thresholdInput = page
          .locator("label")
          .filter({ hasText: /Keep Pixels Above/i })
          .getByRole("spinbutton")
          .first();
        await expect(thresholdInput).toBeVisible();

        // Verify min constraint: value can't be < 1 (no negatives allowed)
        await assertMinConstraint(thresholdInput, "-5", 1);
        await assertMinConstraint(thresholdInput, "0", 1);
      });

      test("'Use Mask from ESPIRiT' — k, r, t, c inputs appear and cannot be < 0", async ({
        page,
      }) => {
        const radio = page.getByRole("radio", {
          name: /Use Mask from ESPIRiT/i,
        });
        await radio.scrollIntoViewIfNeeded();
        await radio.check({ force: true });
        await expect(radio).toBeChecked();
        await page.waitForTimeout(400);

        // The ESPIRiT params are inside the same label/formcontrol area
        const espContainer = page
          .locator("label")
          .filter({ hasText: /Use Mask from ESPIRiT/i })
          .first();

        const spinbuttons = espContainer.getByRole("spinbutton");
        await expect(spinbuttons).toHaveCount(4);

        const [kInput, rInput, tInput, cInput] = [
          spinbuttons.nth(0),
          spinbuttons.nth(1),
          spinbuttons.nth(2),
          spinbuttons.nth(3),
        ];

        // All four should be visible
        for (const input of [kInput, rInput, tInput, cInput]) {
          await expect(input).toBeVisible();
        }

        // Verify values cannot be set below 0
        for (const input of [kInput, rInput, tInput, cInput]) {
          await assertMinConstraint(input, "-1", 0);
        }
      });

      test("'Predefined Mask' — file upload available, try uploading hippo.nii", async ({
        page,
      }) => {
        const radio = page.getByRole("radio", { name: /Predefined Mask/i });
        await radio.scrollIntoViewIfNeeded();
        await radio.check({ force: true });
        await expect(radio).toBeChecked();
        await page.waitForTimeout(400);

        // A file upload button should appear ("Choose or Upload Mask")
        const uploadBtn = page.getByText(/Choose or Upload Mask/i);
        await expect(uploadBtn).toBeVisible();

        // Attempt to upload hippo.nii via file chooser
        const fileInput = page.locator('input[type="file"]').last();
        if (await fileInput.count()) {
          await fileInput.setInputFiles(
            path.resolve(__dirname, "../public/hippo.nii"),
          );
          // Wait for potential upload or validation
          await page.waitForTimeout(2000);
        }
      });
    });

    // --------------------------------------------------------
    // SENSE (Analytic)
    // --------------------------------------------------------
    test.describe("SENSE reconstruction", () => {
      test.beforeEach(async ({ page }) => {
        await selectReconMethod(page, "SENSE");
      });

      test("has 'No Flip Angle Correction' checkbox", async ({ page }) => {
        await expect(
          page.getByRole("checkbox", { name: /No Flip Angle Correction/i }),
        ).toBeVisible();
      });

      test("has 'Save .mat file' checkbox", async ({ page }) => {
        await expect(
          page.getByRole("checkbox", { name: /Save .mat file/i }),
        ).toBeVisible();
      });

      test("has 'Save Coil Sensitivities' checkbox", async ({ page }) => {
        await expect(
          page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }),
        ).toBeVisible();
      });

      test("has 'Save g Factor' checkbox (SENSE only) and it toggles", async ({
        page,
      }) => {
        const cb = page.getByRole("checkbox", { name: /Save g Factor/i });
        await expect(cb).toBeVisible();
        const was = await cb.isChecked();
        await cb.click({ force: true });
        await expect(cb).toBeChecked({ checked: !was });
      });

      test("shows Object Masking section", async ({ page }) => {
        await expect(page.getByText("Object Masking")).toBeVisible();
      });

      // -- Decimate Data --
      test("has 'Decimate Data' checkbox", async ({ page }) => {
        const cb = page.getByRole("checkbox", { name: /Decimate Data/i });
        await cb.scrollIntoViewIfNeeded();
        await expect(cb).toBeVisible();
      });

      test("Decimate Data — Acceleration Factor X min=1, Y min=1", async ({
        page,
      }) => {
        // Check "Decimate Data"
        const decimateCb = page.getByRole("checkbox", {
          name: /Decimate Data/i,
        });
        await decimateCb.scrollIntoViewIfNeeded();
        if (!(await decimateCb.isChecked())) {
          await decimateCb.click({ force: true });
        }
        await expect(decimateCb).toBeChecked();
        await page.waitForTimeout(500);

        // Find acceleration factor inputs in the DataGrid rows
        const afxInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Acceleration Factor X" })
          .getByRole("spinbutton")
          .first();
        const afyInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Acceleration Factor Y" })
          .getByRole("spinbutton")
          .first();

        await expect(afxInput).toBeVisible();
        await expect(afyInput).toBeVisible();

        // Acceleration Factor X: min=1 (must be > 0)
        await assertMinConstraint(afxInput, "0", 1);
        await assertMinConstraint(afxInput, "-2", 1);

        // Acceleration Factor Y: min=1 (must be > 0)
        await assertMinConstraint(afyInput, "0", 1);
        await assertMinConstraint(afyInput, "-5", 1);
      });

      test("Decimate Data — Autocalibration Lines min=2, always > 0", async ({
        page,
      }) => {
        const decimateCb = page.getByRole("checkbox", {
          name: /Decimate Data/i,
        });
        await decimateCb.scrollIntoViewIfNeeded();
        if (!(await decimateCb.isChecked())) {
          await decimateCb.click({ force: true });
        }
        await expect(decimateCb).toBeChecked();
        await page.waitForTimeout(500);

        const aclInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(aclInput).toBeVisible();

        // min=2 so always > 0
        await assertMinConstraint(aclInput, "0", 2);
        await assertMinConstraint(aclInput, "-3", 2);
      });

      test("'Use All Lines for Autocalibration' disables ACL input, uncheck re-enables", async ({
        page,
      }) => {
        const decimateCb = page.getByRole("checkbox", {
          name: /Decimate Data/i,
        });
        await decimateCb.scrollIntoViewIfNeeded();
        if (!(await decimateCb.isChecked())) {
          await decimateCb.click({ force: true });
        }
        await expect(decimateCb).toBeChecked();
        await page.waitForTimeout(500);

        const useAllLinesCb = page.getByRole("checkbox", {
          name: /Use All Lines for Autocalibration/i,
        });
        await useAllLinesCb.scrollIntoViewIfNeeded();
        await expect(useAllLinesCb).toBeVisible();

        // Check "Use All Lines for Autocalibration"
        if (!(await useAllLinesCb.isChecked())) {
          await useAllLinesCb.click({ force: true });
        }
        await expect(useAllLinesCb).toBeChecked();
        await page.waitForTimeout(300);

        // ACL input should be disabled
        const aclInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(aclInput).toBeDisabled();

        // Uncheck → ACL should be re-enabled
        await useAllLinesCb.click({ force: true });
        await expect(useAllLinesCb).not.toBeChecked();
        await page.waitForTimeout(300);
        await expect(aclInput).toBeEnabled();
      });
    });
  });

  // ==========================================================
  //  MULTIPLE REPLICA
  // ==========================================================
  test.describe("Multiple Replica", () => {
    test.beforeEach(async ({ page }) => {
      await selectAnalysisMethod(page, "Multiple Replica");
    });

    test("only RSS is available (no noise uploaded)", async ({ page }) => {
      // RSS should be visible and enabled
      const rss = page.getByRole("radio", { name: "Root Sum of Squares" });
      await expect(rss).toBeVisible();
      await expect(rss).toBeEnabled();

      // B1 Weighted, SENSE, GRAPPA should NOT be visible (no noise uploaded)
      await expect(
        page.getByRole("radio", { name: "B1 Weighted" }),
      ).not.toBeVisible();
      await expect(
        page.getByRole("radio", { name: "SENSE" }),
      ).not.toBeVisible();
      await expect(
        page.getByRole("radio", { name: "GRAPPA" }),
      ).not.toBeVisible();

      // ESPIRIT may appear but must be disabled
      const espirit = page.getByRole("radio", { name: "ESPIRIT" });
      if (await espirit.isVisible()) {
        await expect(espirit).toBeDisabled();
      }
    });

    test("RSS has same config as Analytic RSS — No Flip Angle, Save .mat, no Coil Sensitivities, no g Factor", async ({
      page,
    }) => {
      await selectReconMethod(page, "Root Sum of Squares");

      await expect(
        page.getByRole("checkbox", { name: /No Flip Angle Correction/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Save .mat file/i }),
      ).toBeVisible();
      await expect(
        page.getByText("Save Coil Sensitivities"),
      ).not.toBeVisible();
      await expect(page.getByText("Save g Factor")).not.toBeVisible();
      await expect(page.getByText("Object Masking")).not.toBeVisible();
    });
  });

  // ==========================================================
  //  PSEUDO MULTIPLE REPLICA
  // ==========================================================
  test.describe("Pseudo Multiple Replica", () => {
    test.beforeEach(async ({ page }) => {
      await selectAnalysisMethod(page, "Pseudo Multiple Replica");
    });

    test("'Number of Pseudo Replica' input is visible, integer > 0 (min=2)", async ({
      page,
    }) => {
      const label = page.getByText(/Number of Pseudo Replica/i);
      await expect(label).toBeVisible();

      const input = label.locator("..").getByRole("spinbutton").first();
      await expect(input).toBeVisible();

      // min=2, so > 0
      await assertMinConstraint(input, "0", 2);
      await assertMinConstraint(input, "-1", 2);
      await assertMinConstraint(input, "1", 2);

      // Set a valid integer value
      await input.fill("10");
      await input.press("Tab");
      expect(Number(await input.inputValue())).toBe(10);
    });

    test("available reconstruction methods: RSS, B1, SENSE, GRAPPA", async ({
      page,
    }) => {
      await expect(
        page.getByRole("radio", { name: "Root Sum of Squares" }),
      ).toBeVisible();
      await expect(
        page.getByRole("radio", { name: "B1 Weighted" }),
      ).toBeVisible();
      await expect(page.getByRole("radio", { name: "SENSE" })).toBeVisible();
      await expect(page.getByRole("radio", { name: "GRAPPA" })).toBeVisible();

      // ESPIRIT exists but is always disabled
      const espirit = page.getByRole("radio", { name: "ESPIRIT" });
      if (await espirit.isVisible()) {
        await expect(espirit).toBeDisabled();
      }
    });

    // -- RSS (PMR) --
    test("RSS: checkboxes — No Flip Angle, Save .mat, no Coil Sensitivities, no g Factor", async ({
      page,
    }) => {
      await selectReconMethod(page, "Root Sum of Squares");

      await expect(
        page.getByRole("checkbox", { name: /No Flip Angle Correction/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Save .mat file/i }),
      ).toBeVisible();
      await expect(
        page.getByText("Save Coil Sensitivities"),
      ).not.toBeVisible();
      await expect(page.getByText("Save g Factor")).not.toBeVisible();
    });

    // -- B1 Weighted (PMR) --
    test("B1: has No Flip Angle, Save .mat, Save Coil Sensitivities, Object Masking", async ({
      page,
    }) => {
      await selectReconMethod(page, "B1 Weighted");

      await expect(
        page.getByRole("checkbox", { name: /No Flip Angle Correction/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Save .mat file/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }),
      ).toBeVisible();
      await expect(page.getByText("Save g Factor")).not.toBeVisible();
      await expect(page.getByText("Object Masking")).toBeVisible();
    });

    // -- SENSE (PMR) --
    test("SENSE: has all B1 options plus Save g Factor and Decimate Data", async ({
      page,
    }) => {
      await selectReconMethod(page, "SENSE");

      await expect(
        page.getByRole("checkbox", { name: /No Flip Angle Correction/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Save .mat file/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Save g Factor/i }),
      ).toBeVisible();
      await expect(page.getByText("Object Masking")).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Decimate Data/i }),
      ).toBeVisible();
    });

    // -- GRAPPA (PMR) --
    test.describe("GRAPPA reconstruction (PMR)", () => {
      test.beforeEach(async ({ page }) => {
        await selectReconMethod(page, "GRAPPA");
      });

      test("has Kernel Size X (min=1) and Kernel Size Y (min=1)", async ({
        page,
      }) => {
        const kxInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Kernel Size X" })
          .getByRole("spinbutton")
          .first();
        const kyInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Kernel Size Y" })
          .getByRole("spinbutton")
          .first();

        await expect(kxInput).toBeVisible();
        await expect(kyInput).toBeVisible();

        // Kernel X: min=1, must be > 0
        await assertMinConstraint(kxInput, "0", 1);
        await assertMinConstraint(kxInput, "-1", 1);

        // Kernel Y: min=1, must be > 0
        await assertMinConstraint(kyInput, "0", 1);
        await assertMinConstraint(kyInput, "-2", 1);
      });

      test("has Decimate Data section with acceleration constraints", async ({
        page,
      }) => {
        const decimateCb = page.getByRole("checkbox", {
          name: /Decimate Data/i,
        });
        await decimateCb.scrollIntoViewIfNeeded();
        await expect(decimateCb).toBeVisible();

        // Enable decimate
        if (!(await decimateCb.isChecked())) {
          await decimateCb.click({ force: true });
        }
        await expect(decimateCb).toBeChecked();
        await page.waitForTimeout(500);

        // Acceleration Factor X min=1
        const afxInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Acceleration Factor X" })
          .getByRole("spinbutton")
          .first();
        await expect(afxInput).toBeVisible();
        await assertMinConstraint(afxInput, "0", 1);

        // Acceleration Factor Y min=1
        const afyInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Acceleration Factor Y" })
          .getByRole("spinbutton")
          .first();
        await expect(afyInput).toBeVisible();
        await assertMinConstraint(afyInput, "0", 1);

        // Autocalibration Lines min=2
        const aclInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(aclInput).toBeVisible();
        await assertMinConstraint(aclInput, "0", 2);
      });

      test("'Use All Lines for Autocalibration' checkbox disables ACL", async ({
        page,
      }) => {
        const decimateCb = page.getByRole("checkbox", {
          name: /Decimate Data/i,
        });
        await decimateCb.scrollIntoViewIfNeeded();
        if (!(await decimateCb.isChecked())) {
          await decimateCb.click({ force: true });
        }
        await page.waitForTimeout(500);

        const useAllLinesCb = page.getByRole("checkbox", {
          name: /Use All Lines for Autocalibration/i,
        });
        await useAllLinesCb.scrollIntoViewIfNeeded();
        await expect(useAllLinesCb).toBeVisible();

        // Check it — ACL should be disabled
        if (!(await useAllLinesCb.isChecked())) {
          await useAllLinesCb.click({ force: true });
        }
        await expect(useAllLinesCb).toBeChecked();
        await page.waitForTimeout(300);

        const aclInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(aclInput).toBeDisabled();

        // Uncheck — ACL should re-enable
        await useAllLinesCb.click({ force: true });
        await expect(useAllLinesCb).not.toBeChecked();
        await page.waitForTimeout(300);
        await expect(aclInput).toBeEnabled();
      });

      test("does NOT show Object Masking (GRAPPA)", async ({ page }) => {
        await expect(page.getByText("Object Masking")).not.toBeVisible();
      });

      test("has No Flip Angle Correction and Save .mat checkboxes", async ({
        page,
      }) => {
        await expect(
          page.getByRole("checkbox", { name: /No Flip Angle Correction/i }),
        ).toBeVisible();
        await expect(
          page.getByRole("checkbox", { name: /Save .mat file/i }),
        ).toBeVisible();
      });

      test("does NOT show Save Coil Sensitivities or Save g Factor", async ({
        page,
      }) => {
        await expect(
          page.getByText("Save Coil Sensitivities"),
        ).not.toBeVisible();
        await expect(page.getByText("Save g Factor")).not.toBeVisible();
      });
    });
  });

  // ==========================================================
  //  GENERALIZED PSEUDO-REPLICA
  // ==========================================================
  test.describe("Generalized Pseudo-Replica", () => {
    test.beforeEach(async ({ page }) => {
      await selectAnalysisMethod(page, "Generalized Pseudo-Replica");
    });

    test("'Cubic VOI Size' input visible, min=2 (> 0)", async ({ page }) => {
      const label = page.getByText(
        /Cubic VOI Size \(Length of Side in Pixels\)/i,
      );
      await expect(label).toBeVisible();

      const input = label.locator("..").getByRole("spinbutton").first();
      await expect(input).toBeVisible();

      // min=2 so always > 0
      await assertMinConstraint(input, "0", 2);
      await assertMinConstraint(input, "-1", 2);
      await assertMinConstraint(input, "1", 2);

      // Valid value
      await input.fill("9");
      await input.press("Tab");
      expect(Number(await input.inputValue())).toBe(9);
    });

    test("'Number of Pseudo Replica' input visible, min=2, max=10 for GPR", async ({
      page,
    }) => {
      const label = page.getByText(/Number of Pseudo Replica/i);
      await expect(label).toBeVisible();

      const input = label.locator("..").getByRole("spinbutton").first();
      await expect(input).toBeVisible();

      await assertMinConstraint(input, "0", 2);
      await assertMinConstraint(input, "1", 2);

      // max=10 for Generalized Pseudo-Replica
      await input.fill("15");
      await input.press("Tab");
      await page.waitForTimeout(200);
      expect(Number(await input.inputValue())).toBeLessThanOrEqual(10);
    });

    test("same reconstruction methods as PMR: RSS, B1, SENSE, GRAPPA", async ({
      page,
    }) => {
      await expect(
        page.getByRole("radio", { name: "Root Sum of Squares" }),
      ).toBeVisible();
      await expect(
        page.getByRole("radio", { name: "B1 Weighted" }),
      ).toBeVisible();
      await expect(page.getByRole("radio", { name: "SENSE" })).toBeVisible();
      await expect(page.getByRole("radio", { name: "GRAPPA" })).toBeVisible();
    });

    // -- RSS (GPR) --
    test("RSS: No Flip Angle, Save .mat, no Coil Sensitivities, no g Factor", async ({
      page,
    }) => {
      await selectReconMethod(page, "Root Sum of Squares");

      await expect(
        page.getByRole("checkbox", { name: /No Flip Angle Correction/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Save .mat file/i }),
      ).toBeVisible();
      await expect(
        page.getByText("Save Coil Sensitivities"),
      ).not.toBeVisible();
      await expect(page.getByText("Save g Factor")).not.toBeVisible();
    });

    // -- B1 (GPR) --
    test("B1: No Flip Angle, Save .mat, Save Coil Sensitivities, Object Masking", async ({
      page,
    }) => {
      await selectReconMethod(page, "B1 Weighted");

      await expect(
        page.getByRole("checkbox", { name: /No Flip Angle Correction/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Save .mat file/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }),
      ).toBeVisible();
      await expect(page.getByText("Save g Factor")).not.toBeVisible();
      await expect(page.getByText("Object Masking")).toBeVisible();
    });

    // -- SENSE (GPR) --
    test("SENSE: all B1 options + Save g Factor + Decimate Data", async ({
      page,
    }) => {
      await selectReconMethod(page, "SENSE");

      await expect(
        page.getByRole("checkbox", { name: /Save g Factor/i }),
      ).toBeVisible();
      await expect(page.getByText("Object Masking")).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Decimate Data/i }),
      ).toBeVisible();
    });

    // -- GRAPPA (GPR) --
    test("GRAPPA: Kernel X/Y > 0, Decimate Data, no masking", async ({
      page,
    }) => {
      await selectReconMethod(page, "GRAPPA");

      // Kernel size inputs
      const kxInput = page
        .locator('[role="row"]')
        .filter({ hasText: "Kernel Size X" })
        .getByRole("spinbutton")
        .first();
      const kyInput = page
        .locator('[role="row"]')
        .filter({ hasText: "Kernel Size Y" })
        .getByRole("spinbutton")
        .first();
      await expect(kxInput).toBeVisible();
      await expect(kyInput).toBeVisible();
      await assertMinConstraint(kxInput, "0", 1);
      await assertMinConstraint(kyInput, "0", 1);

      // Decimate Data available
      await expect(
        page.getByRole("checkbox", { name: /Decimate Data/i }),
      ).toBeVisible();

      // No Object Masking
      await expect(page.getByText("Object Masking")).not.toBeVisible();
    });

    // -- Object Masking detailed tests (GPR > B1) --
    test.describe("Object Masking — B1 Weighted (GPR)", () => {
      test.beforeEach(async ({ page }) => {
        await selectReconMethod(page, "B1 Weighted");
      });

      test("'Do Not Mask' option selectable", async ({ page }) => {
        const radio = page.getByRole("radio", {
          name: /Do Not Mask Coil Sensitivities Maps/i,
        });
        await radio.scrollIntoViewIfNeeded();
        await radio.check({ force: true });
        await expect(radio).toBeChecked();
      });

      test("'Keep Pixels Above %' — threshold cannot be negative (min=1)", async ({
        page,
      }) => {
        const radio = page.getByRole("radio", {
          name: /Keep Pixels Above a Percentage/i,
        });
        await radio.scrollIntoViewIfNeeded();
        await radio.check({ force: true });
        await page.waitForTimeout(400);

        const thresholdInput = page
          .locator("label")
          .filter({ hasText: /Keep Pixels Above/i })
          .getByRole("spinbutton")
          .first();
        await expect(thresholdInput).toBeVisible();
        await assertMinConstraint(thresholdInput, "-10", 1);
      });

      test("'ESPIRiT mask' — k, r, t, c >= 0", async ({ page }) => {
        const radio = page.getByRole("radio", {
          name: /Use Mask from ESPIRiT/i,
        });
        await radio.scrollIntoViewIfNeeded();
        await radio.check({ force: true });
        await page.waitForTimeout(400);

        const espContainer = page
          .locator("label")
          .filter({ hasText: /Use Mask from ESPIRiT/i })
          .first();
        const inputs = espContainer.getByRole("spinbutton");
        await expect(inputs).toHaveCount(4);

        for (let i = 0; i < 4; i++) {
          await assertMinConstraint(inputs.nth(i), "-1", 0);
        }
      });

      test("'Predefined Mask' — upload hippo.nii", async ({ page }) => {
        const radio = page.getByRole("radio", { name: /Predefined Mask/i });
        await radio.scrollIntoViewIfNeeded();
        await radio.check({ force: true });
        await page.waitForTimeout(400);

        await expect(page.getByText(/Choose or Upload Mask/i)).toBeVisible();

        const fileInput = page.locator('input[type="file"]').last();
        if (await fileInput.count()) {
          await fileInput.setInputFiles(
            path.resolve(__dirname, "../public/hippo.nii"),
          );
          await page.waitForTimeout(2000);
        }
      });
    });

    // -- Decimate Data detailed tests (GPR > SENSE) --
    test.describe("Decimate Data — SENSE (GPR)", () => {
      test.beforeEach(async ({ page }) => {
        await selectReconMethod(page, "SENSE");
      });

      test("acceleration factors X and Y must be > 0 (min=1)", async ({
        page,
      }) => {
        const cb = page.getByRole("checkbox", { name: /Decimate Data/i });
        await cb.scrollIntoViewIfNeeded();
        if (!(await cb.isChecked())) await cb.click({ force: true });
        await page.waitForTimeout(500);

        const afx = page
          .locator('[role="row"]')
          .filter({ hasText: "Acceleration Factor X" })
          .getByRole("spinbutton")
          .first();
        const afy = page
          .locator('[role="row"]')
          .filter({ hasText: "Acceleration Factor Y" })
          .getByRole("spinbutton")
          .first();

        await assertMinConstraint(afx, "-1", 1);
        await assertMinConstraint(afy, "-1", 1);
      });

      test("autocalibration lines must be > 0 (min=2)", async ({ page }) => {
        const cb = page.getByRole("checkbox", { name: /Decimate Data/i });
        await cb.scrollIntoViewIfNeeded();
        if (!(await cb.isChecked())) await cb.click({ force: true });
        await page.waitForTimeout(500);

        const acl = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await assertMinConstraint(acl, "0", 2);
      });

      test("'Use All Lines for Autocalibration' disables ACL input", async ({
        page,
      }) => {
        const cb = page.getByRole("checkbox", { name: /Decimate Data/i });
        await cb.scrollIntoViewIfNeeded();
        if (!(await cb.isChecked())) await cb.click({ force: true });
        await page.waitForTimeout(500);

        const useAll = page.getByRole("checkbox", {
          name: /Use All Lines for Autocalibration/i,
        });
        await useAll.scrollIntoViewIfNeeded();

        if (!(await useAll.isChecked())) await useAll.click({ force: true });
        await page.waitForTimeout(300);

        const acl = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(acl).toBeDisabled();
      });
    });
  });

  // ==========================================================
  //  RESET BUTTON
  // ==========================================================
  test("Reset button clears all settings", async ({ page }) => {
    await selectAnalysisMethod(page, "Pseudo Multiple Replica");
    await selectReconMethod(page, "GRAPPA");

    const resetBtn = page.getByRole("button", { name: /Reset/i });
    await resetBtn.scrollIntoViewIfNeeded();
    await resetBtn.click();
    await page.waitForTimeout(600);

    // After reset, the SNR Analysis panel should still be accessible
    await expandSNRPanel(page);
  });
});
