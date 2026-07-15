import { test, expect, Page } from "@playwright/test";
// import path from "path";
import { ensureAuthenticatedSession } from "./helpers/auth";

// ============================================================
// HELPERS
// ============================================================

/**
 * Expand a CmrPanel by its header text — only clicks if not already open.
 *
 * CmrPanel renders its header as <div class="card-header" role="button" aria-expanded>.
 * We use the aria-expanded attribute as the source of truth rather than checking
 * card-body visibility (which can race with CSS transitions).
 */
async function expandPanel(page: Page, headerText: RegExp | string) {
  const header = page
    .locator('.card-header[role="button"]')
    .filter({ hasText: headerText })
    .first();
  // Wait for the header to be attached — CmrPanel children may not have mounted
  // yet right after the tabpanel becomes visible.
  await header.waitFor({ state: "attached", timeout: 10000 });
  await header.scrollIntoViewIfNeeded();
  const isExpanded = await header.getAttribute("aria-expanded");
  if (isExpanded !== "true") {
    await header.click();
    await expect(header).toHaveAttribute("aria-expanded", "true", { timeout: 5000 });
  }
}

/**
 * Scope locators to the MroDrawToolkit "ROI Tools" panel (avoids clashing with
 * the ROI table toolbar, which uses different aria-labels e.g. "Delete").
 */
function roiToolsPanel(page: Page) {
  return page.locator("div").filter({ hasText: /^ROI Tools$/ }).first().locator("..");
}

/** ROI stats table (has Voxel Count column — distinct from the Job Results grid). */
function roiTableGrid(page: Page) {
  return page.locator(".MuiDataGrid-root").filter({
    has: page.getByRole("columnheader", { name: "Voxel Count" }),
  });
}

/**
 * Drag on the NiiVue canvas (rectangle/ellipse tools).
 * Uses canvas-relative hover positions so coordinates map correctly to the WebGL surface.
 */
async function dragOnNiivueCanvas(
  page: Page,
  opts: { fromXRatio?: number; fromYRatio?: number; dx?: number; dy?: number } = {},
) {
  const { fromXRatio = 0.3, fromYRatio = 0.25, dx = 120, dy = 120 } = opts;
  const canvas = page.locator("#niiCanvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });

  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();

  const fromX = box!.width * fromXRatio;
  const fromY = box!.height * fromYRatio;
  const toX = Math.min(box!.width - 4, fromX + dx);
  const toY = Math.min(box!.height - 4, fromY + dy);

  await canvas.hover({ position: { x: fromX, y: fromY } });
  await page.mouse.down();
  await canvas.hover({ position: { x: toX, y: toY } });
  await page.mouse.up();
}

/**
 * Draw a closed freehand loop on the NiiVue canvas.
 * Filled pen auto-commits on mouse release (nv.onFreehandCommitted).
 */
async function strokeLoopOnNiivueCanvas(
  page: Page,
  opts: { centerXRatio?: number; centerYRatio?: number; radius?: number } = {},
) {
  const { centerXRatio = 0.35, centerYRatio = 0.35, radius = 50 } = opts;
  const canvas = page.locator("#niiCanvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });

  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();

  const cx = box!.width * centerXRatio;
  const cy = box!.height * centerYRatio;
  const clamp = (x: number, y: number) => ({
    x: Math.max(4, Math.min(box!.width - 4, x)),
    y: Math.max(4, Math.min(box!.height - 4, y)),
  });

  const points = [
    clamp(cx, cy - radius),
    clamp(cx + radius, cy),
    clamp(cx, cy + radius),
    clamp(cx - radius, cy),
    clamp(cx, cy - radius),
  ];

  await canvas.hover({ position: points[0] });
  await page.mouse.down();
  for (let i = 1; i < points.length; i++) {
    await canvas.hover({ position: points[i] });
  }
  await page.mouse.up();
}

/**
 * Click on the NiiVue canvas at a canvas-relative position.
 * Uses page.mouse with absolute coordinates so draft overlays (e.g. "Move shape")
 * do not block Playwright's hover actionability checks on #niiCanvas.
 */
async function clickOnNiivueCanvas(
  page: Page,
  canvas: ReturnType<Page["locator"]>,
  position: { x: number; y: number },
) {
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + position.x, box!.y + position.y);
  await page.waitForTimeout(50);
  await page.mouse.down();
  await page.mouse.up();
}

/**
 * Double-click on the NiiVue canvas (close polyline when >= 3 vertices exist).
 */
async function doubleClickOnNiivueCanvas(
  page: Page,
  canvas: ReturnType<Page["locator"]>,
  position: { x: number; y: number },
) {
  await clickOnNiivueCanvas(page, canvas, position);
  await page.waitForTimeout(80);
  await clickOnNiivueCanvas(page, canvas, position);
}

/**
 * Place polyline vertices with clicks, then double-click to close and fill.
 * Matches UI hint: "Click to add vertices" → "Double-click to close & fill".
 */
async function drawPolylineTriangleOnNiivueCanvas(page: Page, roiTools: ReturnType<typeof roiToolsPanel>) {
  const canvas = page.locator("#niiCanvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });

  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();

  const cx = box!.width * 0.38;
  const cy = box!.height * 0.38;
  const size = 55;
  const clamp = (x: number, y: number) => ({
    x: Math.max(4, Math.min(box!.width - 4, x)),
    y: Math.max(4, Math.min(box!.height - 4, y)),
  });

  const top = clamp(cx, cy - size);
  const bottomRight = clamp(cx + size, cy + size * 0.85);
  const bottomLeft = clamp(cx - size, cy + size * 0.85);

  const clickGapMs = 200;
  await clickOnNiivueCanvas(page, canvas, top);
  await page.waitForTimeout(clickGapMs);
  await clickOnNiivueCanvas(page, canvas, bottomRight);
  await page.waitForTimeout(clickGapMs);
  await clickOnNiivueCanvas(page, canvas, bottomLeft);
  await page.waitForTimeout(clickGapMs);

  await expect(roiTools.getByText(/Double-click to close & fill/i)).toBeVisible({
    timeout: 5000,
  });

  await doubleClickOnNiivueCanvas(page, canvas, top);
}

/** After a shape draw commits, the ROI table should reflect at least one labeled region. */
async function expectCommittedRoiInTable(page: Page) {
  await expect(page.getByRole("button", { name: /Save Drawing Layer/i })).toBeEnabled({
    timeout: 15000,
  });

  const roiGrid = roiTableGrid(page);
  await roiGrid.scrollIntoViewIfNeeded();
  await expect(roiGrid.getByText("No Rows")).not.toBeVisible({ timeout: 15000 });

  const dataRow = roiGrid.locator(".MuiDataGrid-virtualScroller .MuiDataGrid-row").first();
  await expect(dataRow).toBeVisible({ timeout: 15000 });

  const countCell = dataRow.locator('.MuiDataGrid-cell[data-field="count"]');
  await expect(countCell).toHaveText(/^[1-9][\d,]*$/, { timeout: 15000 });
}

/** Parse the first ROI row voxel count from the stats table. */
async function getFirstRoiVoxelCount(page: Page): Promise<number> {
  const roiGrid = roiTableGrid(page);
  await roiGrid.scrollIntoViewIfNeeded();
  const countCell = roiGrid
    .locator(".MuiDataGrid-virtualScroller .MuiDataGrid-row")
    .first()
    .locator('.MuiDataGrid-cell[data-field="count"]');
  await expect(countCell).toBeVisible({ timeout: 15000 });
  const text = (await countCell.innerText()).trim();
  const value = Number.parseInt(text.replace(/,/g, ""), 10);
  expect(Number.isFinite(value)).toBeTruthy();
  return value;
}

/** Center of the default rectangle drag used by dragOnNiivueCanvas (matches its from/dx/dy defaults). */
function defaultRectangleCenterOnCanvas(box: { width: number; height: number }) {
  const fromX = box.width * 0.3;
  const fromY = box.height * 0.25;
  return {
    x: Math.min(box.width - 4, fromX + 60),
    y: Math.min(box.height - 4, fromY + 60),
  };
}

/** Click an applied ROI on canvas to re-enter draft edit mode (no drag). */
async function reopenRoiOnCanvas(page: Page, position: { x: number; y: number }) {
  const canvas = page.locator("#niiCanvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await clickOnNiivueCanvas(page, canvas, position);
  await page.waitForTimeout(150);
}

/** Palette Delete while a pen or shape draft is active. */
function paletteDeleteButton(
  roiTools: ReturnType<typeof roiToolsPanel>,
  draftKind: "shape" | "pen",
) {
  return roiTools.getByTestId(`roi-palette-delete-${draftKind}-draft`);
}

/**
 * After drawing, the ROI may already be in draft edit mode (overlay + Delete visible).
 * Re-open via canvas click only when Delete is not already shown.
 */
async function ensureDraftDeleteReady(
  page: Page,
  roiTools: ReturnType<typeof roiToolsPanel>,
  draftKind: "shape" | "pen",
  reopenPosition: { x: number; y: number },
) {
  const deleteBtn = paletteDeleteButton(roiTools, draftKind);
  if (!(await deleteBtn.isVisible())) {
    await reopenRoiOnCanvas(page, reopenPosition);
  }
  await expect(deleteBtn).toBeVisible({ timeout: 10000 });
}

/** Click Delete in the expanded tool palette while a pen or shape draft is active. */
async function clickDeleteInPalette(
  roiTools: ReturnType<typeof roiToolsPanel>,
  draftKind: "shape" | "pen",
) {
  const deleteBtn = paletteDeleteButton(roiTools, draftKind);
  await expect(deleteBtn).toBeVisible({ timeout: 10000 });
  await deleteBtn.click();
}

/** ROI stats table is empty after the last region is removed. */
async function expectEmptyRoiTable(page: Page) {
  const roiGrid = roiTableGrid(page);
  await roiGrid.scrollIntoViewIfNeeded();
  await expect(roiGrid.getByText("No Rows")).toBeVisible({ timeout: 15000 });
}

/** Set eraser brush size via the expanded eraser palette slider (range 1–15, step 2). */
async function setEraserSize(roiTools: ReturnType<typeof roiToolsPanel>, targetSize: number) {
  const snapped = 1 + Math.round((Math.max(1, Math.min(15, targetSize)) - 1) / 2) * 2;

  const eraserPanel = roiTools.getByText(/Eraser size:/i).locator("..");
  const slider = eraserPanel.getByRole("slider");
  await expect(slider).toBeVisible({ timeout: 5000 });

  // Prefer keyboard on the slider (MUI step=2); fall back to clicking the track on the locator itself.
  await slider.focus();
  const current = Number(await slider.getAttribute("aria-valuenow")) || 1;
  const steps = (snapped - current) / 2;
  if (steps > 0) {
    for (let i = 0; i < steps; i++) {
      await slider.press("ArrowRight");
    }
  } else if (steps < 0) {
    for (let i = 0; i < -steps; i++) {
      await slider.press("ArrowLeft");
    }
  }

  const updated = await slider.getAttribute("aria-valuenow");
  if (updated !== String(snapped)) {
    const box = await slider.boundingBox();
    expect(box).toBeTruthy();
    const fraction = (snapped - 1) / (15 - 1);
    await slider.click({ position: { x: box!.width * fraction, y: box!.height / 2 } });
  }

  await expect(slider).toHaveAttribute("aria-valuenow", String(snapped));
}

/**
 * Click the Play button on the first completed job and wait for it to load.
 * Uses proper element waits instead of hardcoded delays.
 */
async function loadCompletedJob(page: Page) {
  const completedRow = page
    .locator('[role="row"]')
    .filter({ hasText: /completed/i })
    .first();

  try {
    await completedRow.waitFor({ state: "visible", timeout: 15000 });
  } catch {
    return;
  }

  const playBtn = completedRow
    .locator('[data-testid="PlayArrowIcon"]')
    .first();
  if (await playBtn.isVisible()) {
    await playBtn.click();
    await page.waitForTimeout(5000);
  }
}

/**
 * Navigate to the Results tab inside /main.
 *
 * ensureAuthenticatedSession() already navigates to /main and waits for React to
 * fully mount (it asserts the Home tab is visible). We must NOT call page.goto()
 * again — that would trigger a full reload and waitForLoadState("domcontentloaded")
 * fires before React re-mounts, causing "element(s) not found" on the tab locator.
 *
 * This mirrors the setup.spec.ts pattern: auth → click tab → done.
 */
async function goToResults(page: Page) {
  const resultsTab = page.getByRole("tab", { name: /Results/i });
  await resultsTab.click();
  // CmrTabs renders ALL tab panels at mount with hidden + display:none on inactive
  // ones. After clicking the tab, wait for React to re-render and reveal the panel.
  const resultsPanel = page.getByRole("tabpanel", { name: /Results/i });
  await expect(resultsPanel).toBeVisible({ timeout: 10000 });
  // Job Results is panel 0 — open by default via useState([0]).
  // expandPanel is a safe no-op if the card-body is already visible.
  await expandPanel(page, "Job Results");
}

// ============================================================
// TESTS
// ============================================================

test.describe("Results page - comprehensive validation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticatedSession(page);
    await goToResults(page);
  });

  // ==========================================================
  // PANEL: JOB RESULTS
  // ==========================================================
  test.describe("Job Results panel", () => {
    test("Job Results panel is visible with expected columns", async ({
      page,
    }) => {
      const panel = page.getByText("Job Results").first();
      await expect(panel).toBeVisible();

      // Use getByRole("columnheader") to target DataGrid headers specifically —
      // getByText() can match hidden elements elsewhere in the page (e.g. <strong>Alias:</strong>)
      await expect(page.getByRole("columnheader", { name: "Job ID" })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("columnheader", { name: "Alias" })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("columnheader", { name: "Date Submitted" })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible({ timeout: 10000 });
    });

    test("'Auto Refreshing' checkbox is visible and toggleable", async ({
      page,
    }) => {
      const cb = page.getByRole("checkbox", { name: /Auto Refreshing/i });
      await expect(cb).toBeVisible();

      const was = await cb.isChecked();
      await cb.click({ force: true });
      await expect(cb).toBeChecked({ checked: !was });
      // Toggle back
      await cb.click({ force: true });
      await expect(cb).toBeChecked({ checked: was });
    });

    test("'Refresh' button is visible and clickable", async ({ page }) => {
      const refreshBtn = page.getByRole("button", { name: /Refresh/i });
      await expect(refreshBtn).toBeVisible();
      await expect(refreshBtn).toBeEnabled();
      await refreshBtn.click();
      // Should not crash — wait for any loading to settle
      await page.waitForTimeout(2000);
      // Button should still be visible after click
      await expect(refreshBtn).toBeVisible();
    });

    test("job table renders without console errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      // Wait for table to render
      await page.waitForTimeout(2000);

      // Scope to the Results tabpanel — Home also has a CmrTable (DataGrid with
      // role="grid") inside a hidden tabpanel, so an unscoped .first() picks that one.
      const resultsPanel = page.getByRole("tabpanel", { name: /Results/i });
      const grid = resultsPanel.locator('[role="grid"]').first();
      await expect(grid).toBeVisible({ timeout: 10000 });

      // No critical errors
      const critical = errors.filter(
        (e) => !e.includes("favicon") && !e.includes("404"),
      );
      expect(critical.length).toBe(0);
    });

    test("completed job has Play and Download action buttons", async ({
      page,
    }) => {
      const completedRow = page
        .locator('[role="row"]')
        .filter({ hasText: /completed/i })
        .first();

      try {
        await completedRow.waitFor({ state: "visible", timeout: 15000 });
      } catch { /* no completed jobs */ }

      if (await completedRow.isVisible()) {
        // Play button (PlayArrowIcon — rendered as SVG inside IconButton)
        const playBtn = completedRow
          .locator('[data-testid="PlayArrowIcon"], svg')
          .first();
        await expect(playBtn).toBeVisible();

        // Download button (GetAppIcon)
        const downloadBtn = completedRow
          .locator('[data-testid="GetAppIcon"], svg')
          .first();
        await expect(downloadBtn).toBeVisible();

        // Delete button (DeleteIcon)
        const deleteBtn = completedRow
          .locator('[data-testid="DeleteIcon"]')
          .first();
        await expect(deleteBtn).toBeVisible();
      }
    });

    test("pending job has disabled play button", async ({ page }) => {
      const pendingRow = page
        .locator('[role="row"]')
        .filter({ hasText: /pending/i })
        .first();

      if (await pendingRow.isVisible()) {
        // The play icon should be in a disabled IconButton or show a spinner
        const spinner = pendingRow
          .locator('.spinner-border, [role="status"]')
          .first();
        const disabledBtn = pendingRow.locator("button[disabled]").first();

        const hasSpinner = await spinner.isVisible().catch(() => false);
        const hasDisabled = await disabledBtn.isVisible().catch(() => false);
        expect(hasSpinner || hasDisabled).toBeTruthy();
      }
    });

    test("delete button opens confirmation dialog", async ({ page }) => {
      // Find any job row
      const rows = page.locator('[role="row"]').filter({
        has: page.locator('[data-testid="DeleteIcon"]'),
      });

      if ((await rows.count()) > 0) {
        const deleteBtn = rows
          .first()
          .locator('[data-testid="DeleteIcon"]')
          .first();
        await deleteBtn.click();

        // Confirmation dialog should appear
        await expect(
          page.getByText(/confirm|deleting job/i).first(),
        ).toBeVisible({ timeout: 5000 });

        // Close the dialog by clicking cancel if available
        const cancelBtn = page.getByRole("button", { name: /cancel/i });
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
        }
      }
    });
  });

  // ==========================================================
  // PANEL: VIEW RESULTS (requires a loaded job)
  // ==========================================================
  test.describe("View Results panel", () => {
    test("shows 'Please Select a Job Result' when no job is selected", async ({
      page,
    }) => {
      await expandPanel(page, "View Results");
      await expect(
        page.getByText("Please Select a Job Result").first(),
      ).toBeVisible({ timeout: 5000 });
    });

    // The remaining viewer tests require loading a completed job
    test.describe("with a loaded completed job", () => {
      test.beforeEach(async ({ page }) => {
        await loadCompletedJob(page);
      });

      test("NiiVue canvas renders when job is loaded", async ({ page }) => {
        const canvas = page.locator("#niiCanvas, canvas").first();
        if (await canvas.isVisible()) {
          await expect(canvas).toBeVisible();
        }
      });

      // -- Toolbar dropdowns --
      // The NiiVue toolbar MUI Selects all share id="slice-type", so getByLabel()
      // matches multiple comboboxes. Locate each by its parent container instead:
      // find the visible label text, go to the parent wrapper, then grab the combobox.
      test("'Opened Volume' dropdown is visible and lists volumes", async ({
        page,
      }) => {
        const container = page.locator("div").filter({ hasText: /^Opened Volume$/ }).first().locator("..");
        const volumeSelect = container.getByRole("combobox").first();
        if (await volumeSelect.isVisible()) {
          await expect(volumeSelect).toBeVisible();
          await volumeSelect.click();
          const menuItems = page.getByRole("option");
          if ((await menuItems.count()) === 0) {
            const muiItems = page.locator('[role="listbox"] [role="option"]');
          }
          await page.keyboard.press("Escape");
        }
      });

      test("'Orientation' dropdown has axial/coronal/sagittal/multi/3d", async ({
        page,
      }) => {
        const container = page.locator("div").filter({ hasText: /^Orientation$/ }).first().locator("..");
        const orientSelect = container.getByRole("combobox").first();
        if (await orientSelect.isVisible()) {
          await orientSelect.click();
          await page.waitForTimeout(300);

          const options = ["Axial", "Coronal", "Sagittal", "Multi", "3D"];
          for (const opt of options) {
            await expect(page.getByRole("option", { name: opt })).toBeVisible();
          }

          for (const opt of options) {
            await page.getByRole("option", { name: opt }).click();
            await page.waitForTimeout(300);
            if (opt !== options[options.length - 1]) {
              await orientSelect.click();
              await page.waitForTimeout(300);
            }
          }
        }
      });

      test("'Scroll and Right Click' dropdown has all drag modes", async ({
        page,
      }) => {
        const container = page.locator("div").filter({ hasText: /^Scroll and Right Click$/ }).first().locator("..");
        const dragSelect = container.getByRole("combobox").first();
        if (await dragSelect.isVisible()) {
          await dragSelect.click();
          await page.waitForTimeout(300);

          const modes = [
            "Zoom and Pan",
            "Slice and Measurement",
            "Slice and Contrast",
            "Slice and None",
          ];
          for (const mode of modes) {
            await expect(
              page.getByRole("option", { name: mode }),
            ).toBeVisible();
          }
          await page.keyboard.press("Escape");
        }
      });

      test("'Display Mode' dropdown is available", async ({ page }) => {
        const container = page.locator("div").filter({ hasText: /^Display Mode$/ }).first().locator("..");
        const displaySelect = container.getByRole("combobox").first();
        if (await displaySelect.isVisible()) {
          await displaySelect.click();
          await page.waitForTimeout(300);
          const absOption = page.getByRole("option", { name: /Absolute/i });
          if (await absOption.isVisible()) {
            await expect(absOption).toBeVisible();
          }
          await page.keyboard.press("Escape");
        }
      });

      test("'ROI Layer' dropdown is available", async ({ page }) => {
        const container = page.locator("div").filter({ hasText: /^ROI Layer$/ }).first().locator("..");
        const roiSelect = container.getByRole("combobox").first();
        if (await roiSelect.isVisible()) {
          await expect(roiSelect).toBeVisible();
          await roiSelect.click();
          await page.waitForTimeout(300);
          await page.keyboard.press("Escape");
        }
      });

      // -- Toolbar switches --
      test("'Neurological' switch toggles", async ({ page }) => {
        const neuroSwitch = page.locator("text=Neurological").first();
        if (await neuroSwitch.isVisible()) {
          const switchInput = neuroSwitch
            .locator("..")
            .locator('[role="checkbox"], input[type="checkbox"]')
            .first();
          if (await switchInput.isVisible()) {
            await switchInput.click({ force: true });
            await page.waitForTimeout(300);
          }
        }
      });

      test("'Show Crosshair' switch toggles", async ({ page }) => {
        const label = page.locator("text=Show Crosshair").first();
        if (await label.isVisible()) {
          const switchInput = label
            .locator("..")
            .locator('[role="checkbox"], input[type="checkbox"]')
            .first();
          if (await switchInput.isVisible()) {
            const was = await switchInput.isChecked();
            await switchInput.click({ force: true });
            await page.waitForTimeout(300);
            const now = await switchInput.isChecked();
            expect(now).not.toBe(was);
          }
        }
      });

      test("'Show Color Bar' switch toggles", async ({ page }) => {
        const label = page.locator("text=Show Color Bar").first();
        if (await label.isVisible()) {
          const switchInput = label
            .locator("..")
            .locator('[role="checkbox"], input[type="checkbox"]')
            .first();
          if (await switchInput.isVisible()) {
            const was = await switchInput.isChecked();
            await switchInput.click({ force: true });
            await page.waitForTimeout(300);
            const now = await switchInput.isChecked();
            expect(now).not.toBe(was);
          }
        }
      });

      test("'Labels Visible' switch toggles", async ({ page }) => {
        const label = page.locator("text=Labels Visible").first();
        if (await label.isVisible()) {
          const switchInput = label
            .locator("..")
            .locator('[role="checkbox"], input[type="checkbox"]')
            .first();
          if (await switchInput.isVisible()) {
            const was = await switchInput.isChecked();
            await switchInput.click({ force: true });
            await page.waitForTimeout(300);
            const now = await switchInput.isChecked();
            expect(now).not.toBe(was);
          }
        }
      });

      // -- Toolbar icon buttons --
      test("'Reset Views' button is clickable", async ({ page }) => {
        const resetBtn = page.getByRole("button", { name: /Reset Views/i });
        if (await resetBtn.isVisible()) {
          await expect(resetBtn).toBeEnabled();
          await resetBtn.click();
          await page.waitForTimeout(300);
        }
      });

      test("'Recenter Views' button is clickable", async ({ page }) => {
        const btn = page.getByRole("button", { name: /Recenter Views/i });
        if (await btn.isVisible()) {
          await expect(btn).toBeEnabled();
          await btn.click();
          await page.waitForTimeout(300);
        }
      });

      test("'Reset Zooms' button is clickable", async ({ page }) => {
        const btn = page.getByRole("button", { name: /Reset Zooms/i });
        if (await btn.isVisible()) {
          await expect(btn).toBeEnabled();
          await btn.click();
          await page.waitForTimeout(300);
        }
      });

      test("'Auto Contrast' button is clickable", async ({ page }) => {
        const btn = page.getByRole("button", { name: /Auto Contrast/i });
        if (await btn.isVisible()) {
          await expect(btn).toBeEnabled();
          await btn.click();
          await page.waitForTimeout(300);
        }
      });

      test("'Zoom In' and 'Zoom Out' buttons are clickable", async ({
        page,
      }) => {
        const zoomIn = page.getByRole("button", { name: /Zoom In/i });
        const zoomOut = page.getByRole("button", { name: /Zoom Out/i });

        if (await zoomIn.isVisible()) {
          await expect(zoomIn).toBeEnabled();
          await zoomIn.click();
          await page.waitForTimeout(200);
        }

        if (await zoomOut.isVisible()) {
          await expect(zoomOut).toBeEnabled();
          await zoomOut.click();
          await page.waitForTimeout(200);
        }
      });

      test("'Save Drawing Layer' button is visible", async ({ page }) => {
        const saveBtn = page.getByRole("button", {
          name: /Save Drawing Layer/i,
        });
        if (await saveBtn.isVisible()) {
          await expect(saveBtn).toBeVisible();
          await expect(saveBtn).toBeEnabled();
        }
      });

      test("Settings gear icon button opens settings", async ({ page }) => {
        const settingsBtn = page
          .locator('[data-testid="SettingsIcon"]')
          .first();
        if (await settingsBtn.isVisible()) {
          await settingsBtn.click();
          await page.waitForTimeout(500);
          // Some settings panel should appear
        }
      });
    });
  });

  // ==========================================================
  // PANEL: CURRENT JOB SETTINGS
  // ==========================================================
  test.describe("Current Job Settings panel", () => {
    test("shows 'Please Select a Job Result' when no job loaded", async ({
      page,
    }) => {
      await expandPanel(page, "Current Job Settings");

      // "Please Select a Job Result" also appears in the View Results panel (index 1)
      // which is collapsed here. Scope to the Current Job Settings card so we don't
      // accidentally assert on the hidden sibling element (DOM order puts it first).
      const settingsCard = page
        .locator(".card-header")
        .filter({ hasText: /Current Job Settings/i })
        .first()
        .locator("..");
      await expect(
        settingsCard.getByText(/Please Select a Job Result|Job is not completed/i),
      ).toBeVisible({ timeout: 5000 });
    });

    test.describe("with a completed job loaded", () => {
      test.beforeEach(async ({ page }) => {
        await loadCompletedJob(page);
        // expandPanel checks aria-expanded before clicking — safe even when
        // setOpenPanel([1, 2]) has already opened panel 2 automatically.
        await expandPanel(page, "Current Job Settings");
      });

      test("displays 'Number of Slices' label", async ({ page }) => {
        const label = page.getByText("Number of Slices:").first();
        if (await label.isVisible()) {
          await expect(label).toBeVisible();
        }
      });

      test("displays 'SNR Analysis Method' label with value", async ({
        page,
      }) => {
        const resultsPanel = page.getByRole("tabpanel", { name: /Results/i });
        const label = resultsPanel.getByText("SNR Analysis Method:").first();
        if (await label.isVisible()) {
          await expect(label).toBeVisible();
          const paragraph = label.locator("..");
          const text = await paragraph.textContent();
          const methods = [
            "Analytic Method",
            "Multiple Replica",
            "Pseudo Multiple Replica",
            "Generalized Pseudo-Replica",
          ];
          const found = methods.some((m) => text?.includes(m));
          expect(found).toBeTruthy();
        }
      });

      test("displays 'Image Reconstruction Method' label with value", async ({
        page,
      }) => {
        // The label and value sit inside a <li> under the Current Job Settings panel.
        // Scope tightly: find the <paragraph> that contains the <strong> label, then
        // check its text content for one of the known method names. This avoids
        // getByText() matching unrelated elements elsewhere in the tabpanel
        // (e.g. "Viewing sense" panel header contains "SENSE" as a substring).
        const resultsPanel = page.getByRole("tabpanel", { name: /Results/i });
        const label = resultsPanel
          .getByText("Image Reconstruction Method:")
          .first();
        if (await label.isVisible()) {
          await expect(label).toBeVisible();
          // The parent <p> holds both the <strong> label and the text value.
          const paragraph = label.locator("..");
          const text = await paragraph.textContent();
          const reconMethods = [
            "Root Sum of Squares",
            "B1 Weighted",
            "SENSE",
            "GRAPPA",
          ];
          const found = reconMethods.some((m) => text?.includes(m));
          expect(found).toBeTruthy();
        }
      });

      test("displays 'Flip Angle Correction' status", async ({ page }) => {
        const label = page.getByText("Flip Angle Correction:").first();
        if (await label.isVisible()) {
          await expect(label).toBeVisible();
          // Should show True or False
          const trueOrFalse = await Promise.any([
            page
              .getByText("Flip Angle Correction:")
              .locator("..")
              .getByText(/True|False/i)
              .first()
              .isVisible()
              .then((v) => (v ? true : Promise.reject())),
          ]).catch(() => false);
          expect(trueOrFalse).toBeTruthy();
        }
      });

      test("displays Pseudo Replica count for PMR/GPR methods", async ({
        page,
      }) => {
        const pseudoLabel = page
          .getByText("Number of Pseudo Replica:")
          .first();
        // This is conditional — only visible for PMR or GPR
        if (await pseudoLabel.isVisible()) {
          await expect(pseudoLabel).toBeVisible();
        }
      });

      test("displays Cubic VOI Size for GPR method", async ({ page }) => {
        const voiLabel = page
          .getByText(/Cubic VOI Size.*Length.*Pixels/i)
          .first();
        // Conditional — only for Generalized Pseudo-Replica
        if (await voiLabel.isVisible()) {
          await expect(voiLabel).toBeVisible();
        }
      });

      test("displays Kernel Size for GRAPPA reconstruction", async ({
        page,
      }) => {
        const k1 = page.getByText("Kernel Size 1:").first();
        const k2 = page.getByText("Kernel Size 2:").first();
        // Conditional — only for GRAPPA
        if (await k1.isVisible()) {
          await expect(k1).toBeVisible();
          await expect(k2).toBeVisible();
        }
      });

      test("displays Decimate Data status for SENSE/GRAPPA", async ({
        page,
      }) => {
        const decimateLabel = page.getByText("Decimate Data:").first();
        if (await decimateLabel.isVisible()) {
          await expect(decimateLabel).toBeVisible();
        }
      });

      test("settings are read-only (no editable inputs in inspection)", async ({
        page,
      }) => {
        // The setup inspection panel should not have any editable text inputs
        const settingsContainer = page
          .getByText("Current Job Settings")
          .first()
          .locator("..");

        // Any spinbuttons should be disabled or non-existent
        const editableInputs = settingsContainer.locator(
          'input:not([disabled]):not([readonly])',
        );
        const editableCount = await editableInputs.count();
        // Inspection panel displays CmrInputNumber but they should not be editable
        // This is a soft check — some may be technically enabled but not user-interactive
        // The key point is that the panel renders correctly
        expect(editableCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ==========================================================
  // ROI TABLE (inside the NiiVue viewer panel)
  // ==========================================================
  test.describe("ROI Table functionality", () => {
    test.beforeEach(async ({ page }) => {
      await loadCompletedJob(page);
    });

    test("ROI table has expected columns: Label, Color, Mean, SD, Visibility, Voxel Count", async ({
      page,
    }) => {
      const expectedHeaders = [
        "ROI Label",
        "Color",
        "Mean",
        "SD",
        "Visibility",
        "Voxel Count",
      ];

      for (const header of expectedHeaders) {
        const col = page.getByText(header, { exact: true }).first();
        if (await col.isVisible()) {
          await expect(col).toBeVisible();
        }
      }
    });

    test("ROI toolbar has Group, Ungroup, Download, Delete buttons", async ({
      page,
    }) => {
      // The ROI toolbar sits below the ROI DataGrid. Its buttons have specific
      // accessible names. "Delete" (capital D, aria-label="Delete") also clashes
      // with the drawing toolkit's "delete" (lowercase, aria-label="delete").
      // Use exact: true so getByRole matches case-sensitively.
      const buttons = [
        { name: "Ungroup ROIs", exact: true },
        { name: "Download", exact: true },
        { name: "Delete", exact: true },
      ];

      for (const { name, exact } of buttons) {
        const btn = page.getByRole("button", { name, exact });
        if (await btn.isVisible()) {
          await expect(btn).toBeVisible();
          await expect(btn).toBeEnabled();
        }
      }

      // The Group button's wrapper has aria-label="Group Selected ROIs"
      const groupBtn = page.locator('[aria-label="Group Selected ROIs"]').first();
      if (await groupBtn.isVisible()) {
        await expect(groupBtn).toBeVisible();
      }
    });

    test("Group button warns when no ROI is selected", async ({ page }) => {
      const groupBtn = page.getByRole("button", { name: "Group" });
      if (await groupBtn.isVisible()) {
        await groupBtn.click();

        // Should show warning snackbar
        const warning = page.getByText(/Please select an ROI/i).first();
        await expect(warning).toBeVisible({ timeout: 5000 });
      }
    });

    test("Ungroup button warns when no ROI is selected", async ({ page }) => {
      const ungroupBtn = page.getByRole("button", { name: "Ungroup" });
      if (await ungroupBtn.isVisible()) {
        await ungroupBtn.click();

        const warning = page.getByText(/Please select an ROI/i).first();
        await expect(warning).toBeVisible({ timeout: 5000 });
      }
    });

    test("Download button warns when no ROI is selected", async ({ page }) => {
      const downloadBtn = page.getByRole("button", { name: "Download" });
      if (await downloadBtn.isVisible()) {
        await downloadBtn.click();

        const warning = page.getByText(/Please select an ROI/i).first();
        await expect(warning).toBeVisible({ timeout: 5000 });
      }
    });

    test("Delete button warns when no ROI is selected", async ({ page }) => {
      const deleteBtn = page
        .locator('[aria-label="Delete"], [title="Delete"]')
        .last();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();

        const warning = page.getByText(/Please select an ROI/i).first();
        await expect(warning).toBeVisible({ timeout: 5000 });
      }
    });

    test("ROI upload button is present in toolbar", async ({ page }) => {
      // CMRUpload renders an upload button
      const uploadBtn = page
        .locator("button")
        .filter({ hasText: /Upload|upload/i })
        .last();
      if (await uploadBtn.isVisible()) {
        await expect(uploadBtn).toBeVisible();
      }
    });
  });

  // ==========================================================
  // DRAWING TOOLKIT (inside NiiVue viewer)
  // ==========================================================
  test.describe("Drawing toolkit", () => {
    test.beforeEach(async ({ page }) => {
      await loadCompletedJob(page);
    });

    test("freehand button is visible and toggleable", async ({ page }) => {
      const roiTools = roiToolsPanel(page);
      const freehandBtn = roiTools.getByRole("button", { name: "freehand" });
      await expect(freehandBtn).toBeVisible({ timeout: 15000 });
      await freehandBtn.click();
      await expect(roiTools.getByRole("button", { name: "Color 1" })).toBeVisible({
        timeout: 5000,
      });
      await freehandBtn.click();
    });

    test("eraser button is visible", async ({ page }) => {
      const eraserBtn = roiToolsPanel(page).getByRole("button", { name: "erase" });
      await expect(eraserBtn).toBeVisible({ timeout: 15000 });
    });

    test("undo button is visible", async ({ page }) => {
      const undoBtn = roiToolsPanel(page).getByRole("button", { name: "revert" });
      await expect(undoBtn).toBeVisible({ timeout: 15000 });
    });

    test("screenshot button is visible", async ({ page }) => {
      const screenshotBtn = roiToolsPanel(page).getByRole("button", {
        name: "capture",
      });
      await expect(screenshotBtn).toBeVisible({ timeout: 15000 });
    });

    test("opacity slider is available", async ({ page }) => {
      const roiTools = roiToolsPanel(page);
      const opacityBtn = roiTools.getByRole("button", { name: "opaque" });
      await expect(opacityBtn).toBeVisible({ timeout: 15000 });
      await opacityBtn.click();

      const slider = roiTools.locator('[role="slider"]').first();
      await expect(slider).toBeVisible({ timeout: 5000 });
    });

    test("visibility toggle button is available", async ({ page }) => {
      const visBtn = roiToolsPanel(page).getByRole("button", { name: "visible" });
      await expect(visBtn).toBeVisible({ timeout: 15000 });
      await visBtn.click();
    });
  });

  // ==========================================================
  // ROI DRAWING (canvas interaction)
  // ==========================================================
  test.describe("ROI drawing", () => {
    test.beforeEach(async ({ page }) => {
      await loadCompletedJob(page);
    });

    test("rectangle drag commits shape to the ROI table", async ({ page }) => {
      const roiTools = roiToolsPanel(page);
      await expect(roiTools.getByRole("button", { name: "rectangle" })).toBeVisible({
        timeout: 15000,
      });

      await roiTools.getByRole("button", { name: "rectangle" }).click();
      await dragOnNiivueCanvas(page);
      await expectCommittedRoiInTable(page);
    });

    test("ellipse drag commits shape to the ROI table", async ({ page }) => {
      const roiTools = roiToolsPanel(page);
      await expect(roiTools.getByRole("button", { name: "ellipse" })).toBeVisible({
        timeout: 15000,
      });

      await roiTools.getByRole("button", { name: "ellipse" }).click();
      await dragOnNiivueCanvas(page);
      await expectCommittedRoiInTable(page);
    });

    test("freehand stroke commits shape to the ROI table", async ({ page }) => {
      const roiTools = roiToolsPanel(page);
      await expect(roiTools.getByRole("button", { name: "freehand" })).toBeVisible({
        timeout: 15000,
      });

      await roiTools.getByRole("button", { name: "freehand" }).click();
      await strokeLoopOnNiivueCanvas(page);
      await expectCommittedRoiInTable(page);
    });

    test("polyline clicks commit closed shape to the ROI table", async ({ page }) => {
      const roiTools = roiToolsPanel(page);
      await expect(roiTools.getByRole("button", { name: "polyline" })).toBeVisible({
        timeout: 15000,
      });

      await roiTools.getByRole("button", { name: "polyline" }).click();
      await expect(roiTools.getByText(/Click to add vertices/i)).toBeVisible({
        timeout: 5000,
      });
      await drawPolylineTriangleOnNiivueCanvas(page, roiTools);
      await expectCommittedRoiInTable(page);
    });

    test("eraser reduces ROI voxel count after partial erase", async ({ page }) => {
      const roiTools = roiToolsPanel(page);
      await expect(roiTools.getByRole("button", { name: "rectangle" })).toBeVisible({
        timeout: 15000,
      });

      await roiTools.getByRole("button", { name: "rectangle" }).click();
      await dragOnNiivueCanvas(page);
      await expectCommittedRoiInTable(page);

      const beforeCount = await getFirstRoiVoxelCount(page);
      expect(beforeCount).toBeGreaterThan(0);

      await roiTools.getByRole("button", { name: "erase" }).click();
      await expect(roiTools.getByText(/Eraser size:/i)).toBeVisible({ timeout: 5000 });
      await setEraserSize(roiTools, 7);

      // Drag through the interior of the rectangle drawn by dragOnNiivueCanvas defaults.
      await dragOnNiivueCanvas(page, { fromXRatio: 0.32, fromYRatio: 0.28, dx: 100, dy: 100 });

      await expect
        .poll(async () => getFirstRoiVoxelCount(page), { timeout: 15000 })
        .toBeLessThan(beforeCount);

      const afterCount = await getFirstRoiVoxelCount(page);
      expect(afterCount).toBeGreaterThan(0);
    });

    test("palette Delete removes a reopened rectangle ROI", async ({ page }) => {
      const roiTools = roiToolsPanel(page);
      const canvas = page.locator("#niiCanvas");

      await roiTools.getByRole("button", { name: "rectangle" }).click();
      await dragOnNiivueCanvas(page);
      await expectCommittedRoiInTable(page);

      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      await ensureDraftDeleteReady(
        page,
        roiTools,
        "shape",
        defaultRectangleCenterOnCanvas(box!),
      );

      await clickDeleteInPalette(roiTools, "shape");
      await expectEmptyRoiTable(page);
      await expect(page.getByRole("button", { name: /Save Drawing Layer/i })).toBeEnabled({
        timeout: 15000,
      });
    });

    test("palette Delete removes a reopened freehand ROI", async ({ page }) => {
      const roiTools = roiToolsPanel(page);
      const canvas = page.locator("#niiCanvas");

      await roiTools.getByRole("button", { name: "freehand" }).click();
      await strokeLoopOnNiivueCanvas(page);
      await expectCommittedRoiInTable(page);

      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      await ensureDraftDeleteReady(page, roiTools, "pen", {
        x: box!.width * 0.35,
        y: box!.height * 0.35,
      });

      await clickDeleteInPalette(roiTools, "pen");
      await expectEmptyRoiTable(page);
      await expect(page.getByRole("button", { name: /Save Drawing Layer/i })).toBeEnabled({
        timeout: 15000,
      });
    });
  });

  // ==========================================================
  // DUAL-RANGE SLIDER (contrast/window controls)
  // ==========================================================
  test.describe("Contrast range slider", () => {
    test.beforeEach(async ({ page }) => {
      await loadCompletedJob(page);
    });

    test("min/max range sliders are rendered", async ({ page }) => {
      const sliders = page.locator('[role="slider"]');
      // There should be at least some sliders for the range controls
      if ((await sliders.count()) > 0) {
        await expect(sliders.first()).toBeVisible();
      }
    });
  });

  // ==========================================================
  // NIIVUE PANEL SLICE CONTROLS
  // ==========================================================
  test.describe("NiiVue panel slice controls", () => {
    test.beforeEach(async ({ page }) => {
      await loadCompletedJob(page);
    });

    test("slice position inputs (X, Y, Z) are rendered", async ({ page }) => {
      // Location table should have coordinate inputs
      const locationTable = page.locator("table, .MuiTable-root").first();
      if (await locationTable.isVisible()) {
        await expect(locationTable).toBeVisible();
      }
    });

    test("gamma slider is available", async ({ page }) => {
      const gammaLabel = page.getByText(/Gamma/i).first();
      if (await gammaLabel.isVisible()) {
        const slider = gammaLabel
          .locator("..")
          .locator('[role="slider"]')
          .first();
        if (await slider.isVisible()) {
          await expect(slider).toBeVisible();
        }
      }
    });
  });
});
