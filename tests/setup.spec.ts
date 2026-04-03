import { test, expect, Page, type Locator } from "@playwright/test";
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
    // CmrPanel renders its header as a .card-header div with role="button"
    // SNR Analysis is the second panel (index 1) — closed by default until signal+noise are set
    const header = page
      .locator(".card-header")
      .filter({ hasText: /SNR Analysis/i })
      .first();
    await header.click();
    await analyticRadio.waitFor({ state: "visible", timeout: 5000 });
  }
}

/** Select an analysis method and wait for the UI to settle. */
async function selectAnalysisMethod(page: Page, name: string) {
  await expandSNRPanel(page);
  const radio = page.getByRole("radio", { name, exact: true });
  await radio.scrollIntoViewIfNeeded();
  // evaluate → native DOM .click() → sets checked=true + fires change event → React onChange → Redux update
  // Playwright's click({ force:true }) only fires synthetic mouse events and skips the native
  // radio-button behavior, so the change event never fires and React state never updates.
  await radio.evaluate((el: HTMLInputElement) => el.click());
  // toBeChecked() is unreliable because both analysis and reconstruction RadioGroups share the same
  // HTML name="row-radio-buttons-group", causing browser-level conflicts. Use a proxy instead
  // based on which reconstruction options appear for each analysis method (no noise file in tests):
  //   Analytic (0)            → RSS / B1 Weighted / SENSE only  — GRAPPA & ESPIRIT hidden
  //   Multiple Replica (1)    → RSS / ESPIRIT only when noise=null; with noise → same full list as PMR (B1/SENSE/GRAPPA + disabled ESPIRIT)
  //   Pseudo Multi Replica (2) → full set including GRAPPA
  //   Generalized PR (3)      → full set including GRAPPA
  if (name === "Analytic Method") {
    await expect(page.getByRole("radio", { name: "GRAPPA" })).not.toBeVisible({ timeout: 5000 });
  } else if (name === "Multiple Replica") {
    // ESPIRIT appears for Multiple Replica (noise=null) but NOT for Analytic
    await expect(page.getByRole("radio", { name: "ESPIRIT" }).first()).toBeVisible({ timeout: 5000 });
  } else {
    // PMR and GPR always render the full set — GRAPPA is the distinguishing element
    await expect(page.getByRole("radio", { name: "GRAPPA" }).first()).toBeVisible({ timeout: 5000 });
  }
  await page.waitForTimeout(300);
}

/** Select a reconstruction method radio. */
async function selectReconMethod(page: Page, name: string) {
  const radio = page.getByRole("radio", { name }).first();
  await radio.scrollIntoViewIfNeeded();
  await radio.evaluate((el: HTMLInputElement) => el.click());
  // Cannot reliably use toBeChecked() here: both the analysis-method and reconstruction-method
  // RadioGroups share name="row-radio-buttons-group", so the browser treats them as one group
  // and the native checked-state conflicts with React's controlled re-render.
  // Instead, wait for the reconstruction options panel to appear — "No Flip Angle Correction"
  // is rendered for every reconstruction method once reconstructionMethod !== undefined.
  await expect(page.getByText("No Flip Angle Correction").first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(300);
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

/** Close react-select menu so dialog footer buttons are clickable (menu portal intercepts clicks). */
async function closeSelectMenuIfOpen(page: Page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
}

/** Canonical library `.dat` names for Queue Job preflight tests (must appear in Select or Upload dropdown). */
const BRAIN_SINGLE_SLICE_SIGNAL = /BrainSingleSliceSignal/i;
const BRAIN_SINGLE_SLICE_NOISE = /BrainSingleSliceNoise/i;

/** Multiple Replica + RSS (signal-only / embedded replicas) — must be in **Uploaded Data**. */
const PHANTOM_100_REPLICAS = /Phantom100Replicas/i;

/** Multiple Replica + RSS with separate brain multi-slice noise — must be in **Uploaded Data**. */
const BRAIN_MULTI_SLICE_SIGNAL = /BrainMultiSliceSignal/i;
const BRAIN_MULTI_SLICE_NOISE = /BrainMultiSliceNoise/i;

/** Predefined mask for Analytic B1 E2E (must appear in **Choose or Upload Mask** library dropdown). */
const B1_WEIGHTED_PREDEFINED_MASK_NII = /b1-weighted-predefined-mask\.nii/i;

let e2eBrainSingleSliceJobAliasSeq = 0;

function nextE2eBrainSingleSliceJobAliasSuffix() {
  e2eBrainSingleSliceJobAliasSeq += 1;
  return e2eBrainSingleSliceJobAliasSeq;
}

/**
 * Distinct **Set Job Name** values for BrainSingleSlice E2E queue tests (`SetupPreviewer` disallows ` ,:%><`).
 * Short numeric suffix `1`, `2`, `3`, … increments for each queued E2E job in the process so aliases stay unique on reruns.
 */
function e2eAnalyticRssBrainSingleSliceJobAlias() {
  return `E2E-Analytic-RSS-BrainSingleSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2eAnalyticB1DoNotMaskBrainSingleSliceJobAlias() {
  return `E2E-Analytic-B1Weighted-DoNotMask-BrainSingleSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2eAnalyticB1KeepPixelsBrainSingleSliceJobAlias() {
  return `E2E-Analytic-B1Weighted-KeepPixels10pct-BrainSingleSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2eAnalyticB1ESPIRiTMaskDefaultsBrainSingleSliceJobAlias() {
  return `E2E-Analytic-B1Weighted-ESPIRiTmask-defaults-BrainSingleSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2eAnalyticB1PredefinedMaskBrainSingleSliceJobAlias() {
  return `E2E-Analytic-B1Weighted-PredefinedMask-BrainSingleSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2eAnalyticSenseDecimateUseAllAclBrainSingleSliceJobAlias() {
  return `E2E-Analytic-SENSE-Decimate-UseAllACL-BrainSingleSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2eAnalyticSenseDecimateAcl24BrainSingleSliceJobAlias() {
  return `E2E-Analytic-SENSE-Decimate-ACL24-BrainSingleSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2eMultipleReplicaRssPhantom100ReplicasJobAlias() {
  return `E2E-MultipleReplica-RSS-Phantom100Replicas-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2eMultipleReplicaRssBrainMultiSliceJobAlias() {
  return `E2E-MultipleReplica-RSS-BrainMultiSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2eMultipleReplicaB1DoNotMaskBrainMultiSliceJobAlias() {
  return `E2E-MultipleReplica-B1Weighted-DoNotMask-BrainMultiSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2ePmrRssBrainSingleSliceJobAlias() {
  return `E2E-PMR-RSS-BrainSingleSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2ePmrB1DoNotMaskBrainSingleSliceJobAlias() {
  return `E2E-PMR-B1Weighted-DoNotMask-BrainSingleSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2ePmrSenseDecimateUseAllAclBrainSingleSliceJobAlias() {
  return `E2E-PMR-SENSE-Decimate-UseAllACL-BrainSingleSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2ePmrGrappaDecimateUseAllAclBrainSingleSliceJobAlias() {
  return `E2E-PMR-GRAPPA-Decimate-UseAllACL-BrainSingleSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2eGprRssBrainMultiSliceJobAlias() {
  return `E2E-GPR-RSS-BrainMultiSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2eGprB1KeepPixels10pctBrainMultiSliceJobAlias() {
  return `E2E-GPR-B1Weighted-KeepPixels10pct-BrainMultiSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

function e2eGprSenseEspiritMaskDecimateUseAllAclBrainMultiSliceJobAlias() {
  return `E2E-GPR-SENSE-ESPIRiTmask-Decimate-UseAllACL-BrainMultiSlice-${nextE2eBrainSingleSliceJobAliasSuffix()}`;
}

async function trySelectPhantom100ReplicasSignalForPreflight(page: Page): Promise<boolean> {
  return trySelectLibraryDatByChooseIndexAndOptionName(page, 0, PHANTOM_100_REPLICAS);
}

async function trySelectBrainMultiSliceNoiseAfterSignalForPreflight(page: Page): Promise<boolean> {
  await page.getByRole("button", { name: "Choose" }).first().click();
  return completeSelectOrUploadWithNamedOption(page, BRAIN_MULTI_SLICE_NOISE);
}

async function trySelectBrainMultiSlicePairForPreflight(page: Page): Promise<boolean> {
  const okSignal = await trySelectLibraryDatByChooseIndexAndOptionName(
    page,
    0,
    BRAIN_MULTI_SLICE_SIGNAL,
  );
  if (!okSignal) return false;
  return trySelectBrainMultiSliceNoiseAfterSignalForPreflight(page);
}

/** **Choose or Upload Mask** → same Select/Upload dialog as signal/noise; pick library row matching `optionName`. */
async function trySelectPredefinedMaskFromLibrary(
  page: Page,
  optionName: RegExp,
): Promise<boolean> {
  await page.getByRole("button", { name: /choose or upload mask/i }).click();
  return completeSelectOrUploadWithNamedOption(page, optionName);
}

/** After a “Choose” click: finish Select or Upload and pick an option matching `optionName`. */
async function completeSelectOrUploadWithNamedOption(
  page: Page,
  optionName: RegExp,
): Promise<boolean> {
  const dialog = page.getByRole("dialog", { name: /select or upload/i });
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await dialog.locator(".cmr-select__control").first().click();
  try {
    await page.getByRole("option").first().waitFor({ state: "visible", timeout: 10000 });
  } catch {
    await closeSelectMenuIfOpen(page);
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 }).catch(() => {});
    return false;
  }
  const named = page.getByRole("option", { name: optionName });
  if ((await named.count()) === 0) {
    await closeSelectMenuIfOpen(page);
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 }).catch(() => {});
    return false;
  }
  await named.first().click();
  await dialog.getByRole("button", { name: /^OK$/ }).click();
  await expect(dialog).toBeHidden({ timeout: 10000 });
  return true;
}

/**
 * Nth global “Choose”: 0 = signal, 1 = noise when **both** rows still show Choose (signal-empty + noise-empty).
 */
async function trySelectLibraryDatByChooseIndexAndOptionName(
  page: Page,
  chooseIndex: number,
  optionName: RegExp,
): Promise<boolean> {
  await page.getByRole("button", { name: "Choose" }).nth(chooseIndex).click();
  return completeSelectOrUploadWithNamedOption(page, optionName);
}

/**
 * After signal is chosen, the signal row often has no “Choose” — only one button remains (noise).
 * `nth(1)` then matches nothing and hangs; use the single remaining **Choose** via `.first()`.
 */
async function trySelectBrainSingleSliceNoiseAfterSignalForPreflight(page: Page): Promise<boolean> {
  await page.getByRole("button", { name: "Choose" }).first().click();
  return completeSelectOrUploadWithNamedOption(page, BRAIN_SINGLE_SLICE_NOISE);
}

async function trySelectBrainSingleSliceSignalForPreflight(page: Page): Promise<boolean> {
  return trySelectLibraryDatByChooseIndexAndOptionName(page, 0, BRAIN_SINGLE_SLICE_SIGNAL);
}

async function trySelectBrainSingleSliceNoiseForPreflight(page: Page): Promise<boolean> {
  return trySelectLibraryDatByChooseIndexAndOptionName(page, 1, BRAIN_SINGLE_SLICE_NOISE);
}

/**
 * Library pair **`BrainSingleSliceSignal.dat`** + **`BrainSingleSliceNoise.dat`**
 * (same as Analytic RSS queue / B1 Setup Preview tests).
 */
async function trySelectBrainSingleSlicePairForPreflight(page: Page): Promise<boolean> {
  const okSignal = await trySelectBrainSingleSliceSignalForPreflight(page);
  if (!okSignal) return false;
  return trySelectBrainSingleSliceNoiseAfterSignalForPreflight(page);
}

/** Results tab → Job Results panel expanded (matches `results.spec.ts` / `goToResults`). */
async function goToResultsTabAndExpandJobResults(page: Page) {
  await page.getByRole("tab", { name: /results/i }).click();
  const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
  await expect(resultsPanel).toBeVisible({ timeout: 10000 });
  const header = page
    .locator('.card-header[role="button"]')
    .filter({ hasText: /job results/i })
    .first();
  await header.waitFor({ state: "attached", timeout: 10000 });
  if ((await header.getAttribute("aria-expanded")) !== "true") {
    await header.click();
    await expect(header).toHaveAttribute("aria-expanded", "true", { timeout: 5000 });
  }
}

/**
 * Waits for a **Job Results** row matching `jobAlias` to reach **completed**, up to `timeoutMs`.
 * If the row shows **failed**, throws immediately — do not return `"failed"` from `expect.poll`, or Playwright
 * retries until `timeoutMs` because `.toBe("completed")` never matches.
 */
async function expectResultsJobCompletedOrFailFast(
  resultsPanel: Locator,
  jobAlias: string,
  timeoutMs = 300_000,
) {
  await expect
    .poll(
      async () => {
        const row = resultsPanel
          .locator('[role="row"]')
          .filter({ hasText: jobAlias })
          .first();
        if (!(await row.isVisible().catch(() => false))) {
          return "waiting" as const;
        }
        const text = ((await row.textContent()) || "").toLowerCase();
        if (text.includes("failed")) {
          throw new Error(
            `Job results row for "${jobAlias}" shows a failed status; stopping wait (fail-fast).`,
          );
        }
        if (text.includes("completed")) {
          return "completed" as const;
        }
        return "waiting" as const;
      },
      { timeout: timeoutMs },
    )
    .toBe("completed");
}

// ============================================================
// TESTS
// ============================================================

test.describe("Setup page - comprehensive validation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticatedSession(page);
    // There is no /setup route — Setup is a tab inside /main
    await page.getByRole("tab", { name: /^set up$/i }).click();
    await page.waitForLoadState("domcontentloaded");
  });

  // ----------------------------------------------------------
  // QUEUE JOB — PREFLIGHT VALIDATION (signal / noise)
  // ----------------------------------------------------------
  test.describe("Queue Job preflight validation", () => {
    test("Set Up Validation Failed when signal and noise are both missing (Analytic)", async ({ page }) => {
      await expandSNRPanel(page);
      await selectAnalysisMethod(page, "Analytic Method");
      await selectReconMethod(page, "Root Sum of Squares");

      await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "Queue Job" }).first().click();

      const dialog = page.getByRole("dialog", { name: /set up validation failed/i });
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await expect(dialog.getByText("Please select or upload signal and noise files.")).toBeVisible();
      await dialog.getByRole("button", { name: /^OK$/i }).click();
      await expect(dialog).toBeHidden({ timeout: 5000 });
    });

    test("Set Up Validation Failed when signal is missing but noise is present (Analytic)", async ({ page }) => {
      await expect(page.getByText("Noise File:", { exact: true }).first()).toBeVisible({ timeout: 10000 });
      const hasNoise = await trySelectBrainSingleSliceNoiseForPreflight(page);
      test.skip(
        !hasNoise,
        "BrainSingleSliceNoise.dat must be in the library — upload on Home so Noise can be selected while Signal stays empty",
      );

      await expandSNRPanel(page);
      await selectAnalysisMethod(page, "Analytic Method");
      await selectReconMethod(page, "Root Sum of Squares");

      await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "Queue Job" }).first().click();

      const dialog = page.getByRole("dialog", { name: /set up validation failed/i });
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await expect(dialog.getByText("Please select or upload signal file.")).toBeVisible();
      await dialog.getByRole("button", { name: /^OK$/i }).click();
      await expect(dialog).toBeHidden({ timeout: 5000 });
    });

    test("Set Up Validation Failed when noise is missing but signal is present, non-multi-raid (Analytic)", async ({
      page,
    }) => {
      await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({ timeout: 10000 });
      const hasSignal = await trySelectBrainSingleSliceSignalForPreflight(page);
      test.skip(
        !hasSignal,
        "BrainSingleSliceSignal.dat must be in the library — upload on Home so Signal can be selected while Noise stays empty",
      );

      await expandSNRPanel(page);
      await selectAnalysisMethod(page, "Analytic Method");
      await selectReconMethod(page, "Root Sum of Squares");

      await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "Queue Job" }).first().click();

      const dialog = page.getByRole("dialog", { name: /set up validation failed/i });
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await expect(
        dialog.getByText(
          "The signal file is not multi-raid: please select or upload a separate noise file.",
        ),
      ).toBeVisible();
      await dialog.getByRole("button", { name: /^OK$/i }).click();
      await expect(dialog).toBeHidden({ timeout: 5000 });
    });

    test("Set Up Validation Failed when flip angle correction is on but no FA map is provided", async ({
      page,
    }) => {
      // Multiple Replica: preflight does not require a separate noise file (analysisMethod === 1).
      // We only set signal; noise and FA map stay unset — Queue Job should fail on missing FA only.
      await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({ timeout: 10000 });
      const hasSignal = await trySelectBrainSingleSliceSignalForPreflight(page);
      test.skip(
        !hasSignal,
        "BrainSingleSliceSignal.dat must be in the library — upload on Home so Signal can be selected",
      );

      await expandSNRPanel(page);
      await selectAnalysisMethod(page, "Multiple Replica");
      await selectReconMethod(page, "Root Sum of Squares");

      const noFaCheckbox = page.getByRole("checkbox", { name: /no flip angle correction/i });
      await expect(noFaCheckbox).toBeChecked();
      await noFaCheckbox.uncheck();
      await expect(page.getByRole("button", { name: "Choose FA Map" })).toBeVisible({ timeout: 5000 });

      await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "Queue Job" }).first().click();

      const dialog = page.getByRole("dialog", { name: /set up validation failed/i });
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await expect(
        dialog.getByText(
          "A flip angle map must be provided if the flip angle correction option is checked.",
        ),
      ).toBeVisible();
      await dialog.getByRole("button", { name: /^OK$/i }).click();
      await expect(dialog).toBeHidden({ timeout: 5000 });
    });

    test("Set Up Validation Failed when Predefined Mask is selected but no mask file is provided", async ({
      page,
    }) => {
      // Same file picks as other preflights: signal nth(0), then noise via the only remaining Choose (.first()).
      // Object Masking (Predefined Mask) is shown for B1 / SENSE only — not RSS.
      await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({ timeout: 10000 });
      const hasSignal = await trySelectBrainSingleSliceSignalForPreflight(page);
      test.skip(
        !hasSignal,
        "BrainSingleSliceSignal.dat must be in the library — upload on Home if missing",
      );
      const hasNoise = await trySelectBrainSingleSliceNoiseAfterSignalForPreflight(page);
      test.skip(
        !hasNoise,
        "BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
      );

      await expandSNRPanel(page);
      await selectAnalysisMethod(page, "Analytic Method");
      await selectReconMethod(page, "B1 Weighted");

      await expect(page.getByText("Object Masking", { exact: true }).first()).toBeVisible({
        timeout: 10000,
      });
      const predefinedMaskRadio = page
        .getByRole("radiogroup", { name: /object masking/i })
        .getByRole("radio", { name: /predefined mask/i });
      await predefinedMaskRadio.scrollIntoViewIfNeeded();
      await predefinedMaskRadio.evaluate((el: HTMLInputElement) => el.click());
      await expect(page.getByRole("button", { name: "Choose or Upload Mask" })).toBeVisible({
        timeout: 5000,
      });

      await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "Queue Job" }).first().click();

      const dialog = page.getByRole("dialog", { name: /set up validation failed/i });
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await expect(
        dialog.getByText(/A mask must be provided if the predefined mask option is checked\.\s*/),
      ).toBeVisible();
      await dialog.getByRole("button", { name: /^OK$/i }).click();
      await expect(dialog).toBeHidden({ timeout: 5000 });
    });
  });

  // ----------------------------------------------------------
  // QUEUE JOB — SENSE / GRAPPA decimation (prospective undersampling warning)
  // ----------------------------------------------------------
  test.describe("Queue Job — SENSE decimation warning", () => {
    test("Warning when SENSE is selected and Decimate Data is unchecked", async ({ page }) => {
      await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({ timeout: 10000 });
      const hasSignal = await trySelectBrainSingleSliceSignalForPreflight(page);
      test.skip(
        !hasSignal,
        "BrainSingleSliceSignal.dat must be in the library — upload on Home if missing",
      );
      const hasNoise = await trySelectBrainSingleSliceNoiseAfterSignalForPreflight(page);
      test.skip(
        !hasNoise,
        "BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
      );

      await expandSNRPanel(page);
      await selectAnalysisMethod(page, "Analytic Method");
      await selectReconMethod(page, "SENSE");

      const decimateCb = page.getByRole("checkbox", { name: /Decimate Data/i });
      await decimateCb.scrollIntoViewIfNeeded();
      if (await decimateCb.isChecked()) {
        await decimateCb.uncheck();
      }
      await expect(decimateCb).not.toBeChecked();

      await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "Queue Job" }).first().click();

      const warnDialog = page.getByRole("dialog").filter({
        hasText: /prospectively undersampled/i,
      });
      await expect(warnDialog).toBeVisible({ timeout: 10000 });
      await expect(
        warnDialog.getByText(
          "The current setup assumes that the signal data was prospectively undersampled. If the data is instead fully sampled, either choose B1 reconstruction or keep editing to retrospectively decimate the data.",
        ),
      ).toBeVisible();
      await warnDialog.getByRole("button", { name: /keep editing/i }).click();
      await expect(warnDialog).toBeHidden({ timeout: 5000 });
    });
  });

  // ----------------------------------------------------------
  // ANALYSIS METHOD RADIO BUTTONS
  // ----------------------------------------------------------
  test.describe("Analysis method radio buttons", () => {
    test("all four analysis method labels are present", async ({ page }) => {
      await expandSNRPanel(page);
      // FormControlLabel renders label text as a visible <span>
      await expect(page.getByText("Analytic Method", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Multiple Replica", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Pseudo Multiple Replica", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Generalized Pseudo-Replica", { exact: true }).first()).toBeVisible();
    });
  });

  // ==========================================================
  //  ANALYTIC METHOD
  // ==========================================================
  test.describe("Analytic Method", () => {
    test.beforeEach(async ({ page }) => {
      await selectAnalysisMethod(page, "Analytic Method");
    });

    // topToSecondaryMaps[0] = [0,1,2] → only RSS, B1 Weighted, SENSE shown
    test("shows RSS, B1 Weighted, SENSE - GRAPPA and ESPIRIT are not rendered", async ({
      page,
    }) => {
      // These panels are open after selectAnalysisMethod, so getByRole("radio") is safe here
      // (no visibility:collapse issue — unlike the analysis method radios which need getByText)
      // "SENSE" text also appears in the MathJax description panel, so we use the radio role
      // to avoid strict-mode "2 elements matched" errors
      await expect(page.getByRole("radio", { name: "Root Sum of Squares" }).first()).toBeVisible();
      await expect(page.getByRole("radio", { name: "B1 Weighted" }).first()).toBeVisible();
      await expect(page.getByRole("radio", { name: "SENSE" }).first()).toBeVisible();
      await expect(page.getByRole("radio", { name: "GRAPPA" })).not.toBeVisible();
      await expect(page.getByRole("radio", { name: "ESPIRIT" })).not.toBeVisible();
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
        const cb = page.getByRole("checkbox", { name: /No Flip Angle Correction/i });
        await expect(cb).toBeVisible();
        const was = await cb.isChecked();
        await cb.click({ force: true });
        await expect(cb).toBeChecked({ checked: !was });
      });

      test("has 'Save .mat file' checkbox", async ({ page }) => {
        await expect(page.getByText("Save .mat file").first()).toBeVisible();
      });

      // secondaryToCoilMethodMaps[0] = [] → no Object Masking for RSS
      test("does NOT show Object Masking section", async ({ page }) => {
        await expect(page.getByText("Object Masking").first()).not.toBeVisible();
      });

      // reconstructionMethod 0 → Save Coil Sensitivities only for [1,2]
      test("does NOT show 'Save Coil Sensitivities'", async ({ page }) => {
        await expect(page.getByText("Save Coil Sensitivities").first()).not.toBeVisible();
      });

      // reconstructionMethod 0 → Save g Factor only for [2]
      test("does NOT show 'Save g Factor'", async ({ page }) => {
        await expect(page.getByText("Save g Factor").first()).not.toBeVisible();
      });
    });

    // --------------------------------------------------------
    // B1 Weighted (Analytic)   reconstructionMethod index = 1
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
        await expect(page.getByText("Save .mat file").first()).toBeVisible();
      });

      // secondaryToCoilMethodMaps[1] = ["inner"] → Save Coil Sensitivities shown
      test("has 'Save Coil Sensitivities' text", async ({ page }) => {
        await expect(page.getByText("Save Coil Sensitivities").first()).toBeVisible();
      });

      // reconstructionMethod 1 → Save g Factor only for [2]
      test("does NOT show 'Save g Factor'", async ({ page }) => {
        await expect(page.getByText("Save g Factor").first()).not.toBeVisible();
      });

      // -- Object Masking (values 0, 1, 3, 4 — value 2 is commented out in code) --
      test("Object Masking — shows section with all four options", async ({ page }) => {
        await expect(page.getByText("Object Masking").first()).toBeVisible();
        // Check label text — not the hidden MUI radio inputs
        await expect(page.getByText("Do Not Mask Coil Sensitivities Maps", { exact: true }).first()).toBeVisible();
        await expect(page.getByText(/Keep Pixels Above a Percentage of Max Value/i).first()).toBeVisible();
        await expect(page.getByText(/Use Mask from ESPIRiT/i).first()).toBeVisible();
        await expect(page.getByText("Predefined Mask", { exact: true }).first()).toBeVisible();
      });

      test("Object Masking — Do Not Mask Coil Sensitivities Maps is selectable", async ({ page }) => {
        const radio = page.getByRole("radio", { name: /Do Not Mask Coil Sensitivities Maps/i }).first();
        await radio.evaluate((el: HTMLInputElement) => el.click());
        await expect(radio).toBeChecked();
      });

      test("Object Masking — Keep Pixels Above % reveals threshold input with min=1", async ({
        page,
      }) => {
        const radio = page.getByRole("radio", { name: /Keep Pixels Above/i }).first();
        await radio.evaluate((el: HTMLInputElement) => el.click());
        await page.waitForTimeout(400);

        // CmrInputNumber (min=1) appears inline inside the FormControlLabel's label Box
        const thresholdInput = page
          .locator("label")
          .filter({ hasText: /Keep Pixels Above/i })
          .getByRole("spinbutton")
          .first();
        await expect(thresholdInput).toBeVisible();
        await assertMinConstraint(thresholdInput, "-5", 1);
        await assertMinConstraint(thresholdInput, "0", 1);
      });

      test("Object Masking — Use Mask from ESPIRiT reveals k, r, t, c inputs", async ({
        page,
      }) => {
        const radio = page.getByRole("radio", { name: /Use Mask from ESPIRiT/i }).first();
        await radio.evaluate((el: HTMLInputElement) => el.click());
        await page.waitForTimeout(400);

        // k, r, t, c CmrInputNumber fields render inside the label Box when maskMethod===3
        const espLabel = page
          .locator("label")
          .filter({ hasText: /Use Mask from ESPIRiT/i })
          .first();
        const spinbuttons = espLabel.getByRole("spinbutton");
        await expect(spinbuttons).toHaveCount(4);
        for (const input of [spinbuttons.nth(0), spinbuttons.nth(1), spinbuttons.nth(2), spinbuttons.nth(3)]) {
          await expect(input).toBeVisible();
        }
        // Note: k/r/t/c inputs have min={0} in Setup.tsx — verified in the GPR ESPIRiT mask test
      });

      test("Object Masking — Predefined Mask reveals file upload button", async ({
        page,
      }) => {
        const radio = page.getByRole("radio", { name: /Predefined Mask/i }).first();
        await radio.evaluate((el: HTMLInputElement) => el.click());
        await page.waitForTimeout(400);
        await expect(page.getByText(/Choose or Upload Mask/i).first()).toBeVisible();
      });
    });

    // Long-running backend jobs: run one after another (same worker order) to avoid overlapping queues.
    test.describe("BrainSingleSlice job queue → Results (serial)", () => {
      test.describe.configure({ mode: "serial" });

      test("queues Analytic RSS job with BrainSingleSlice signal+noise and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "Root Sum of Squares");

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainSingleSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainSingleSliceSignal.dat and BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2eAnalyticRssBrainSingleSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
      });

      test("queues Analytic B1 Weighted job with BrainSingleSlice signal+noise (Do Not Mask Coil Sensitivities Maps, Save Coil Sensitivities) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "B1 Weighted");

        const doNotMask = page
          .getByRole("radio", { name: /Do Not Mask Coil Sensitivities Maps/i })
          .first();
        await doNotMask.scrollIntoViewIfNeeded();
        await doNotMask.evaluate((el: HTMLInputElement) => el.click());
        await expect(doNotMask).toBeChecked();

        const saveCoil = page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }).first();
        await saveCoil.scrollIntoViewIfNeeded();
        if (!(await saveCoil.isChecked())) {
          await saveCoil.click({ force: true });
        }
        await expect(saveCoil).toBeChecked();

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainSingleSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainSingleSliceSignal.dat and BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2eAnalyticB1DoNotMaskBrainSingleSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
      });

      test("queues Analytic B1 Weighted job with BrainSingleSlice signal+noise (Keep Pixels Above 10% default, Save Coil Sensitivities) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "B1 Weighted");

        const keepPixelsRadio = page.getByRole("radio", { name: /Keep Pixels Above/i }).first();
        await keepPixelsRadio.scrollIntoViewIfNeeded();
        await keepPixelsRadio.evaluate((el: HTMLInputElement) => el.click());
        await expect(keepPixelsRadio).toBeChecked();
        await page.waitForTimeout(400);

        const thresholdInput = page
          .locator("label")
          .filter({ hasText: /Keep Pixels Above/i })
          .getByRole("spinbutton")
          .first();
        await expect(thresholdInput).toBeVisible();
        expect(await thresholdInput.inputValue()).toBe("10");

        const saveCoil = page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }).first();
        await saveCoil.scrollIntoViewIfNeeded();
        if (!(await saveCoil.isChecked())) {
          await saveCoil.click({ force: true });
        }
        await expect(saveCoil).toBeChecked();

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainSingleSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainSingleSliceSignal.dat and BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2eAnalyticB1KeepPixelsBrainSingleSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
      });

      test("queues Analytic B1 Weighted job with BrainSingleSlice signal+noise (Use Mask from ESPIRiT default k/r/t/c, Save Coil Sensitivities) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "B1 Weighted");

        const espiritRadio = page.getByRole("radio", { name: /Use Mask from ESPIRiT/i }).first();
        await espiritRadio.scrollIntoViewIfNeeded();
        await espiritRadio.evaluate((el: HTMLInputElement) => el.click());
        await expect(espiritRadio).toBeChecked();
        await page.waitForTimeout(400);

        const espLabel = page
          .locator("label")
          .filter({ hasText: /Use Mask from ESPIRiT/i })
          .first();
        const espInputs = espLabel.getByRole("spinbutton");
        await expect(espInputs).toHaveCount(4);
        const espNumeric = [];
        for (let i = 0; i < 4; i++) {
          await expect(espInputs.nth(i)).toBeVisible();
          espNumeric.push(Number(await espInputs.nth(i).inputValue()));
        }
        expect(espNumeric).toEqual([8, 24, 0.01, 0.995]);

        const saveCoil = page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }).first();
        await saveCoil.scrollIntoViewIfNeeded();
        if (!(await saveCoil.isChecked())) {
          await saveCoil.click({ force: true });
        }
        await expect(saveCoil).toBeChecked();

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainSingleSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainSingleSliceSignal.dat and BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2eAnalyticB1ESPIRiTMaskDefaultsBrainSingleSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
      });

      test("queues Analytic B1 Weighted job with BrainSingleSlice signal+noise (Predefined Mask b1-weighted-predefined-mask.nii from library, Save Coil Sensitivities) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "B1 Weighted");

        const predefinedMaskRadio = page
          .getByRole("radiogroup", { name: /object masking/i })
          .getByRole("radio", { name: /predefined mask/i });
        await predefinedMaskRadio.scrollIntoViewIfNeeded();
        await predefinedMaskRadio.evaluate((el: HTMLInputElement) => el.click());
        await expect(predefinedMaskRadio).toBeChecked();
        await expect(page.getByRole("button", { name: /choose or upload mask/i })).toBeVisible({
          timeout: 5000,
        });

        const okMask = await trySelectPredefinedMaskFromLibrary(page, B1_WEIGHTED_PREDEFINED_MASK_NII);
        test.skip(
          !okMask,
          "b1-weighted-predefined-mask.nii must be in the library — upload on Home if missing",
        );

        const saveCoil = page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }).first();
        await saveCoil.scrollIntoViewIfNeeded();
        if (!(await saveCoil.isChecked())) {
          await saveCoil.click({ force: true });
        }
        await expect(saveCoil).toBeChecked();

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainSingleSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainSingleSliceSignal.dat and BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2eAnalyticB1PredefinedMaskBrainSingleSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
      });

      test("queues Analytic SENSE job with BrainSingleSlice signal+noise (Decimate Data on, Use All Lines for Autocalibration) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "SENSE");

        const decimateCb = page.getByRole("checkbox", { name: /Decimate Data/i });
        await decimateCb.scrollIntoViewIfNeeded();
        if (!(await decimateCb.isChecked())) {
          await decimateCb.click({ force: true });
        }
        await expect(decimateCb).toBeChecked();
        await page.waitForTimeout(500);

        const useAllAclCb = page.getByRole("checkbox", {
          name: /Use All Lines for Autocalibration/i,
        });
        await useAllAclCb.scrollIntoViewIfNeeded();
        if (!(await useAllAclCb.isChecked())) {
          await useAllAclCb.click({ force: true });
        }
        await expect(useAllAclCb).toBeChecked();

        const aclInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(aclInput).toBeDisabled();

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainSingleSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainSingleSliceSignal.dat and BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2eAnalyticSenseDecimateUseAllAclBrainSingleSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
      });

      test("queues Analytic SENSE job with BrainSingleSlice signal+noise (Decimate Data on, Autocalibration Lines 24 — Use All Lines unchecked) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "SENSE");

        const decimateCb = page.getByRole("checkbox", { name: /Decimate Data/i });
        await decimateCb.scrollIntoViewIfNeeded();
        if (!(await decimateCb.isChecked())) {
          await decimateCb.click({ force: true });
        }
        await expect(decimateCb).toBeChecked();
        await page.waitForTimeout(500);

        const useAllAclCb = page.getByRole("checkbox", {
          name: /Use All Lines for Autocalibration/i,
        });
        await useAllAclCb.scrollIntoViewIfNeeded();
        if (await useAllAclCb.isChecked()) {
          await useAllAclCb.click({ force: true });
        }
        await expect(useAllAclCb).not.toBeChecked();

        const aclInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(aclInput).toBeEnabled();
        expect(await aclInput.inputValue()).toBe("24");

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainSingleSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainSingleSliceSignal.dat and BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2eAnalyticSenseDecimateAcl24BrainSingleSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
      });
    });

    // --------------------------------------------------------
    // SENSE (Analytic)   reconstructionMethod index = 2
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
        await expect(page.getByText("Save .mat file").first()).toBeVisible();
      });

      // secondaryToCoilMethodMaps[2] = ["inner","innerACL"] → Save Coil Sensitivities shown
      test("has 'Save Coil Sensitivities' text", async ({ page }) => {
        await expect(page.getByText("Save Coil Sensitivities").first()).toBeVisible();
      });

      // reconstructionMethod 2 → Save g Factor shown (only for [2])
      test("has 'Save g Factor' checkbox that toggles", async ({ page }) => {
        const cb = page.getByRole("checkbox", { name: /Save g Factor/i });
        await expect(cb).toBeVisible();
        const was = await cb.isChecked();
        await cb.click({ force: true });
        await expect(cb).toBeChecked({ checked: !was });
      });

      test("shows Object Masking section", async ({ page }) => {
        await expect(page.getByText("Object Masking").first()).toBeVisible();
      });

      // decimateMapping[2] = true → Decimate Data shown
      test("has 'Decimate Data' checkbox", async ({ page }) => {
        const cb = page.getByText("Decimate Data", { exact: true });
        await cb.scrollIntoViewIfNeeded();
        await expect(cb).toBeVisible();
      });

      test("Decimate Data — Acceleration Factor X and Y inputs have min=1", async ({
        page,
      }) => {
        const decimateCb = page.getByRole("checkbox", { name: /Decimate Data/i });
        await decimateCb.scrollIntoViewIfNeeded();
        if (!(await decimateCb.isChecked())) {
          await decimateCb.click({ force: true });
        }
        await expect(decimateCb).toBeChecked();
        await page.waitForTimeout(500);

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
        // min={1} on both CmrInputNumber in Setup.tsx
        await assertMinConstraint(afxInput, "0", 1);
        await assertMinConstraint(afxInput, "-2", 1);
        await assertMinConstraint(afyInput, "0", 1);
        await assertMinConstraint(afyInput, "-5", 1);
      });

      test("Autocalibration Lines input is disabled by default, min=2 when enabled", async ({
        page,
      }) => {
        const decimateCb = page.getByRole("checkbox", { name: /Decimate Data/i });
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

        // ACL starts disabled: "Use All Lines for Autocalibration" is checked by default
        // (decimateACL === null in initial Redux state)
        await expect(aclInput).toBeDisabled();

        // Uncheck "Use All Lines for Autocalibration" to enable the ACL input
        const useAllCb = page.getByRole("checkbox", {
          name: /Use All Lines for Autocalibration/i,
        });
        await useAllCb.scrollIntoViewIfNeeded();
        if (await useAllCb.isChecked()) {
          await useAllCb.click({ force: true });
        }
        await page.waitForTimeout(300);
        await expect(aclInput).toBeEnabled();

        // min={2} on the CmrInputNumber for ACL
        await assertMinConstraint(aclInput, "0", 2);
        await assertMinConstraint(aclInput, "-3", 2);
      });

      test("'Use All Lines for Autocalibration' toggles ACL input disabled state", async ({
        page,
      }) => {
        const decimateCb = page.getByRole("checkbox", { name: /Decimate Data/i });
        await decimateCb.scrollIntoViewIfNeeded();
        if (!(await decimateCb.isChecked())) {
          await decimateCb.click({ force: true });
        }
        await expect(decimateCb).toBeChecked();
        await page.waitForTimeout(500);

        const useAllCb = page.getByRole("checkbox", {
          name: /Use All Lines for Autocalibration/i,
        });
        await useAllCb.scrollIntoViewIfNeeded();
        await expect(useAllCb).toBeVisible();

        // Ensure it's checked first (disabled ACL)
        if (!(await useAllCb.isChecked())) {
          await useAllCb.click({ force: true });
        }
        await page.waitForTimeout(300);

        const aclInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(aclInput).toBeDisabled();

        // Uncheck → ACL input becomes enabled
        await useAllCb.click({ force: true });
        await expect(useAllCb).not.toBeChecked();
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
      await expect(page.getByText("Save g Factor").first()).not.toBeVisible();
      await expect(page.getByText("Object Masking").first()).not.toBeVisible();
    });

    test("queues Multiple Replica RSS job with Phantom100Replicas.dat signal only and sees completion on Results", async ({
      page,
    }) => {
      test.setTimeout(330_000);
      await selectReconMethod(page, "Root Sum of Squares");

      await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
        timeout: 10000,
      });
      const okSignal = await trySelectPhantom100ReplicasSignalForPreflight(page);
      test.skip(
        !okSignal,
        "Phantom100Replicas.dat must be in the library — upload on Home if missing",
      );

      await expandSNRPanel(page);

      await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "Queue Job" }).first().click();

      const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
      await expect(previewDialog).toBeVisible({ timeout: 20000 });

      const jobAlias = e2eMultipleReplicaRssPhantom100ReplicasJobAlias();
      const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
      await jobNameInput.fill(jobAlias);

      await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
      await expect(previewDialog).toBeHidden({ timeout: 15000 });

      await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
        timeout: 5000,
      });

      await goToResultsTabAndExpandJobResults(page);

      const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
      await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
    });

    test("queues Multiple Replica RSS job with BrainMultiSliceSignal.dat and BrainMultiSliceNoise.dat and sees completion on Results", async ({
      page,
    }) => {
      test.setTimeout(330_000);
      await selectReconMethod(page, "Root Sum of Squares");

      await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
        timeout: 10000,
      });
      const okPair = await trySelectBrainMultiSlicePairForPreflight(page);
      test.skip(
        !okPair,
        "BrainMultiSliceSignal.dat and BrainMultiSliceNoise.dat must be in the library — upload on Home if missing",
      );

      await expandSNRPanel(page);

      await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "Queue Job" }).first().click();

      const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
      await expect(previewDialog).toBeVisible({ timeout: 20000 });

      const jobAlias = e2eMultipleReplicaRssBrainMultiSliceJobAlias();
      const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
      await jobNameInput.fill(jobAlias);

      await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
      await expect(previewDialog).toBeHidden({ timeout: 15000 });

      await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
        timeout: 5000,
      });

      await goToResultsTabAndExpandJobResults(page);

      const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
      await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
    });

    test("queues Multiple Replica B1 Weighted job with BrainMultiSlice signal+noise (Do Not Mask Coil Sensitivities Maps, Save Coil Sensitivities) and sees completion on Results", async ({
      page,
    }) => {
      test.setTimeout(330_000);

      await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
        timeout: 10000,
      });
      const okPair = await trySelectBrainMultiSlicePairForPreflight(page);
      test.skip(
        !okPair,
        "BrainMultiSliceSignal.dat and BrainMultiSliceNoise.dat must be in the library — upload on Home if missing",
      );

      // With noise set, Multiple Replica exposes B1 / SENSE / GRAPPA (Setup.tsx); select after files.
      await selectReconMethod(page, "B1 Weighted");

      const doNotMask = page
        .getByRole("radio", { name: /Do Not Mask Coil Sensitivities Maps/i })
        .first();
      await doNotMask.scrollIntoViewIfNeeded();
      await doNotMask.evaluate((el: HTMLInputElement) => el.click());
      await expect(doNotMask).toBeChecked();

      const saveCoil = page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }).first();
      await saveCoil.scrollIntoViewIfNeeded();
      if (!(await saveCoil.isChecked())) {
        await saveCoil.click({ force: true });
      }
      await expect(saveCoil).toBeChecked();

      await expandSNRPanel(page);

      await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
      await page.getByRole("button", { name: "Queue Job" }).first().click();

      const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
      await expect(previewDialog).toBeVisible({ timeout: 20000 });

      const jobAlias = e2eMultipleReplicaB1DoNotMaskBrainMultiSliceJobAlias();
      const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
      await jobNameInput.fill(jobAlias);

      await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
      await expect(previewDialog).toBeHidden({ timeout: 15000 });

      await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
        timeout: 5000,
      });

      await goToResultsTabAndExpandJobResults(page);

      const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
      await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
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
      await expect(label).toBeVisible({ timeout: 10000 });

      const input = label.locator("..").getByRole("spinbutton").first();
      await expect(input).toBeVisible({ timeout: 10000 });

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
      await expect(page.getByText("Save g Factor").first()).not.toBeVisible();
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
      await expect(page.getByText("Save g Factor").first()).not.toBeVisible();
      await expect(page.getByText("Object Masking").first()).toBeVisible();
    });

    // -- SENSE (PMR) --
    test("SENSE: has all B1 options plus Save g Factor and Decimate Data", async ({
      page,
    }) => {
      await selectReconMethod(page, "SENSE");

      await expect(
        page.getByRole("checkbox", { name: /No Flip Angle Correction/i }),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByRole("checkbox", { name: /Save .mat file/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("checkbox", { name: /Save g Factor/i }),
      ).toBeVisible();
      await expect(page.getByText("Object Masking").first()).toBeVisible();
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

        // Defaults: Kernel X = 3, Y = 4 (see applyReconstructionMethodIndex + MUI Radio string values)
        expect(await kxInput.inputValue()).toBe("3");
        expect(await kyInput.inputValue()).toBe("4");

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

        // Autocalibration Lines min=2 — must uncheck "Use All Lines" first (it's checked by default)
        const aclInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(aclInput).toBeVisible();
        const useAllCb = page.getByRole("checkbox", {
          name: /Use All Lines for Autocalibration/i,
        });
        await useAllCb.scrollIntoViewIfNeeded();
        if (await useAllCb.isChecked()) {
          await useAllCb.click({ force: true });
        }
        await page.waitForTimeout(300);
        await expect(aclInput).toBeEnabled();
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
        await expect(page.getByText("Object Masking").first()).not.toBeVisible({ timeout: 10000 });
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
        await expect(page.getByText("Save g Factor").first()).not.toBeVisible();
      });
    });

    // Long-running backend jobs: serial to avoid overlapping queues with other PMR queue tests.
    test.describe("BrainSingleSlice job queue → Results (serial)", () => {
      test.describe.configure({ mode: "serial" });

      test("queues Pseudo Multiple Replica RSS job with BrainSingleSlice signal+noise (all defaults) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "Root Sum of Squares");

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainSingleSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainSingleSliceSignal.dat and BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2ePmrRssBrainSingleSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
      });

      test("queues Pseudo Multiple Replica B1 Weighted job with BrainSingleSlice signal+noise (Do Not Mask Coil Sensitivities Maps, Save Coil Sensitivities) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "B1 Weighted");

        const doNotMask = page
          .getByRole("radio", { name: /Do Not Mask Coil Sensitivities Maps/i })
          .first();
        await doNotMask.scrollIntoViewIfNeeded();
        await doNotMask.evaluate((el: HTMLInputElement) => el.click());
        await expect(doNotMask).toBeChecked();

        const saveCoil = page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }).first();
        await saveCoil.scrollIntoViewIfNeeded();
        if (!(await saveCoil.isChecked())) {
          await saveCoil.click({ force: true });
        }
        await expect(saveCoil).toBeChecked();

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainSingleSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainSingleSliceSignal.dat and BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2ePmrB1DoNotMaskBrainSingleSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
      });

      test("queues Pseudo Multiple Replica SENSE job with BrainSingleSlice signal+noise (Decimate Data on, Use All Lines for Autocalibration, other defaults) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "SENSE");

        const decimateCb = page.getByRole("checkbox", { name: /Decimate Data/i });
        await decimateCb.scrollIntoViewIfNeeded();
        if (!(await decimateCb.isChecked())) {
          await decimateCb.click({ force: true });
        }
        await expect(decimateCb).toBeChecked();
        await page.waitForTimeout(500);

        const useAllAclCb = page.getByRole("checkbox", {
          name: /Use All Lines for Autocalibration/i,
        });
        await useAllAclCb.scrollIntoViewIfNeeded();
        if (!(await useAllAclCb.isChecked())) {
          await useAllAclCb.click({ force: true });
        }
        await expect(useAllAclCb).toBeChecked();

        const aclInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(aclInput).toBeDisabled();

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainSingleSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainSingleSliceSignal.dat and BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2ePmrSenseDecimateUseAllAclBrainSingleSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
      });

      test("queues Pseudo Multiple Replica GRAPPA job with BrainSingleSlice signal+noise (Decimate Data on, Use All Lines for Autocalibration, default kernel X/Y, other defaults) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "GRAPPA");

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
        expect(await kxInput.inputValue()).toBe("3");
        expect(await kyInput.inputValue()).toBe("4");

        const decimateCb = page.getByRole("checkbox", { name: /Decimate Data/i });
        await decimateCb.scrollIntoViewIfNeeded();
        if (!(await decimateCb.isChecked())) {
          await decimateCb.click({ force: true });
        }
        await expect(decimateCb).toBeChecked();
        await page.waitForTimeout(500);

        const useAllAclCb = page.getByRole("checkbox", {
          name: /Use All Lines for Autocalibration/i,
        });
        await useAllAclCb.scrollIntoViewIfNeeded();
        if (!(await useAllAclCb.isChecked())) {
          await useAllAclCb.click({ force: true });
        }
        await expect(useAllAclCb).toBeChecked();

        const aclInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(aclInput).toBeDisabled();

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainSingleSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainSingleSliceSignal.dat and BrainSingleSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2ePmrGrappaDecimateUseAllAclBrainSingleSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
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
      await expect(label).toBeVisible({ timeout: 10000 });

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
      await expect(page.getByText("Save g Factor").first()).not.toBeVisible();
    });

    test.describe("BrainMultiSlice job queue → Results (serial)", () => {
      test.describe.configure({ mode: "serial" });

      test("queues Generalized Pseudo-Replica RSS job with BrainMultiSlice signal+noise (all defaults) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "Root Sum of Squares");

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainMultiSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainMultiSliceSignal.dat and BrainMultiSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2eGprRssBrainMultiSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
      });

      test("queues Generalized Pseudo-Replica B1 Weighted job with BrainMultiSlice signal+noise (Keep Pixels Above 10% default, Save Coil Sensitivities) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(330_000);
        await selectReconMethod(page, "B1 Weighted");

        const keepPixelsRadio = page.getByRole("radio", { name: /Keep Pixels Above/i }).first();
        await keepPixelsRadio.scrollIntoViewIfNeeded();
        await keepPixelsRadio.evaluate((el: HTMLInputElement) => el.click());
        await expect(keepPixelsRadio).toBeChecked();
        await page.waitForTimeout(400);

        const thresholdInput = page
          .locator("label")
          .filter({ hasText: /Keep Pixels Above/i })
          .getByRole("spinbutton")
          .first();
        await expect(thresholdInput).toBeVisible();
        expect(await thresholdInput.inputValue()).toBe("10");

        const saveCoil = page.getByRole("checkbox", { name: /Save Coil Sensitivities/i }).first();
        await saveCoil.scrollIntoViewIfNeeded();
        if (!(await saveCoil.isChecked())) {
          await saveCoil.click({ force: true });
        }
        await expect(saveCoil).toBeChecked();

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainMultiSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainMultiSliceSignal.dat and BrainMultiSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2eGprB1KeepPixels10pctBrainMultiSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias);
      });

      test("queues Generalized Pseudo-Replica SENSE job with BrainMultiSlice signal+noise (Use Mask from ESPIRiT default k/r/t/c, Decimate Data on, Use All Lines for Autocalibration) and sees completion on Results", async ({
        page,
      }) => {
        test.setTimeout(450_000); // 7.5 min — job completion poll 7 min + setup/queue margin
        await selectReconMethod(page, "SENSE");

        const espiritRadio = page.getByRole("radio", { name: /Use Mask from ESPIRiT/i }).first();
        await espiritRadio.scrollIntoViewIfNeeded();
        await espiritRadio.evaluate((el: HTMLInputElement) => el.click());
        await expect(espiritRadio).toBeChecked();
        await page.waitForTimeout(400);

        const espLabel = page
          .locator("label")
          .filter({ hasText: /Use Mask from ESPIRiT/i })
          .first();
        const espInputs = espLabel.getByRole("spinbutton");
        await expect(espInputs).toHaveCount(4);
        const espNumeric = [];
        for (let i = 0; i < 4; i++) {
          await expect(espInputs.nth(i)).toBeVisible();
          espNumeric.push(Number(await espInputs.nth(i).inputValue()));
        }
        expect(espNumeric).toEqual([8, 24, 0.01, 0.995]);

        const decimateCb = page.getByRole("checkbox", { name: /Decimate Data/i });
        await decimateCb.scrollIntoViewIfNeeded();
        if (!(await decimateCb.isChecked())) {
          await decimateCb.click({ force: true });
        }
        await expect(decimateCb).toBeChecked();
        await page.waitForTimeout(500);

        const useAllAclCb = page.getByRole("checkbox", {
          name: /Use All Lines for Autocalibration/i,
        });
        await useAllAclCb.scrollIntoViewIfNeeded();
        if (!(await useAllAclCb.isChecked())) {
          await useAllAclCb.click({ force: true });
        }
        await expect(useAllAclCb).toBeChecked();

        const aclInput = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(aclInput).toBeDisabled();

        await expect(page.getByText("Signal File:", { exact: true }).first()).toBeVisible({
          timeout: 10000,
        });
        const okPair = await trySelectBrainMultiSlicePairForPreflight(page);
        test.skip(
          !okPair,
          "BrainMultiSliceSignal.dat and BrainMultiSliceNoise.dat must be in the library — upload on Home if missing",
        );

        await expandSNRPanel(page);

        await page.getByRole("button", { name: "Queue Job" }).first().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "Queue Job" }).first().click();

        const previewDialog = page.getByRole("dialog", { name: /setup preview/i });
        await expect(previewDialog).toBeVisible({ timeout: 20000 });

        const jobAlias = e2eGprSenseEspiritMaskDecimateUseAllAclBrainMultiSliceJobAlias();
        const jobNameInput = previewDialog.getByRole("textbox", { name: /set job name/i });
        await jobNameInput.fill(jobAlias);

        await previewDialog.getByRole("button", { name: /^queue job$/i }).click();
        await expect(previewDialog).toBeHidden({ timeout: 15000 });

        await expect(page.getByText("Job successfully queued!", { exact: true })).toBeVisible({
          timeout: 5000,
        });

        await goToResultsTabAndExpandJobResults(page);

        const resultsPanel = page.getByRole("tabpanel", { name: /results/i });
        await expectResultsJobCompletedOrFailFast(resultsPanel, jobAlias, 420_000);
      });
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
      await expect(page.getByText("Save g Factor").first()).not.toBeVisible();
      await expect(page.getByText("Object Masking").first()).toBeVisible();
    });

    // -- SENSE (GPR) --
    test("SENSE: all B1 options + Save g Factor + Decimate Data", async ({
      page,
    }) => {
      await selectReconMethod(page, "SENSE");

      await expect(
        page.getByRole("checkbox", { name: /Save g Factor/i }),
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Object Masking").first()).toBeVisible();
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
      expect(await kxInput.inputValue()).toBe("3");
      expect(await kyInput.inputValue()).toBe("4");
      await assertMinConstraint(kxInput, "0", 1);
      await assertMinConstraint(kyInput, "0", 1);

      // Decimate Data available
      await expect(
        page.getByRole("checkbox", { name: /Decimate Data/i }),
      ).toBeVisible();

      // No Object Masking
      await expect(page.getByText("Object Masking").first()).not.toBeVisible();
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

        await expect(page.getByText(/Choose or Upload Mask/i).first()).toBeVisible();

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

        // ACL is disabled by default ("Use All Lines" is checked) — uncheck it first
        const useAllCb = page.getByRole("checkbox", {
          name: /Use All Lines for Autocalibration/i,
        });
        await useAllCb.scrollIntoViewIfNeeded();
        if (await useAllCb.isChecked()) await useAllCb.click({ force: true });
        await page.waitForTimeout(300);

        const acl = page
          .locator('[role="row"]')
          .filter({ hasText: "Autocalibration Lines" })
          .getByRole("spinbutton")
          .first();
        await expect(acl).toBeEnabled();
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
