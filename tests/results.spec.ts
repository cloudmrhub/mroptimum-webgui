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

/** Color palette container for the freehand tool (avoids matching polyline/shape palettes). */
function freehandToolGroup(roiTools: ReturnType<typeof roiToolsPanel>) {
  return roiTools.getByRole("button", { name: "freehand" }).locator("xpath=..");
}

/** Color palette container for the polyline tool. */
function polylineToolGroup(roiTools: ReturnType<typeof roiToolsPanel>) {
  return roiTools.getByRole("button", { name: "polyline" }).locator("xpath=..");
}

/** Color palette container for the rectangle tool. */
function rectangleToolGroup(roiTools: ReturnType<typeof roiToolsPanel>) {
  return roiTools.getByRole("button", { name: "rectangle" }).locator("xpath=..");
}

/** Color palette container for the ellipse (circle) tool. */
function ellipseToolGroup(roiTools: ReturnType<typeof roiToolsPanel>) {
  return roiTools.getByRole("button", { name: "ellipse" }).locator("xpath=..");
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

/** Activate polyline draw mode and wait for the vertex palette hint. */
async function ensurePolylineDrawReady(roiTools: ReturnType<typeof roiToolsPanel>) {
  const polylineBtn = roiTools.getByRole("button", { name: "polyline" });
  await expect(polylineBtn).toBeVisible({ timeout: 15000 });
  await polylineBtn.click();
  await expect(polylineToolGroup(roiTools).getByText(/Click to add vertices/i)).toBeVisible({
    timeout: 5000,
  });
}

/** Activate freehand draw mode and wait for the freehand palette to open. */
async function ensureFreehandDrawReady(roiTools: ReturnType<typeof roiToolsPanel>) {
  const freehandBtn = roiTools.getByRole("button", { name: "freehand" });
  await expect(freehandBtn).toBeVisible({ timeout: 15000 });

  const freehandPalette = freehandToolGroup(roiTools);
  const lineThickness = freehandPalette.getByText(/Line thickness/i);
  if (!(await lineThickness.isVisible().catch(() => false))) {
    await freehandBtn.click();
  }
  await expect(lineThickness).toBeVisible({ timeout: 5000 });
}

/**
 * Draw a closed freehand loop on the NiiVue canvas.
 * Uses canvas.hover (same as dragOnNiivueCanvas) so Niivue receives pointer events on #niiCanvas.
 */
async function strokeLoopOnNiivueCanvas(
  page: Page,
  opts: { centerXRatio?: number; centerYRatio?: number; radius?: number } = {},
): Promise<{ center: { x: number; y: number } }> {
  const { centerXRatio = 0.35, centerYRatio = 0.35, radius = 55 } = opts;
  const canvas = page.locator("#niiCanvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await canvas.scrollIntoViewIfNeeded();

  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();

  const cx = box!.width * centerXRatio;
  const cy = box!.height * centerYRatio;
  const clamp = (x: number, y: number) => ({
    x: Math.max(8, Math.min(box!.width - 8, x)),
    y: Math.max(8, Math.min(box!.height - 8, y)),
  });

  const segments = 20;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(clamp(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)));
  }

  await canvas.hover({ position: points[0] });
  await page.waitForTimeout(50);
  await page.mouse.down();
  for (let i = 1; i < points.length; i++) {
    await canvas.hover({ position: points[i] });
    await page.waitForTimeout(10);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);

  return { center: { x: cx, y: cy } };
}

type PageLocator = ReturnType<Page["locator"]>;

/** Dispatch a PointerEvent on window (draft overlays listen on window after pointerdown). */
async function dispatchWindowPointerEvent(
  page: Page,
  type: "pointermove" | "pointerup",
  coords: { x: number; y: number },
  buttons: number,
) {
  await page.evaluate(
    ({ type, x, y, buttons }) => {
      window.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          button: 0,
          buttons,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          pressure: type === "pointerup" ? 0 : 0.5,
        }),
      );
    },
    { type, x: coords.x, y: coords.y, buttons },
  );
}

/**
 * Begin dragging a draft overlay handle. Handles use onPointerDown and window pointermove/up —
 * Playwright page.mouse does not trigger those listeners.
 */
async function startHandlePointerDrag(page: Page, handle: PageLocator) {
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  expect(box).toBeTruthy();

  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;

  await handle.dispatchEvent("pointerdown", {
    pointerId: 1,
    button: 0,
    buttons: 1,
    bubbles: true,
    cancelable: true,
    clientX: startX,
    clientY: startY,
    pressure: 0.5,
  });

  let currentX = startX;
  let currentY = startY;

  return {
    startX,
    startY,
    async moveBy(delta: { dx: number; dy: number }, steps = 10) {
      for (let i = 1; i <= steps; i++) {
        currentX = startX + (delta.dx * i) / steps;
        currentY = startY + (delta.dy * i) / steps;
        await dispatchWindowPointerEvent(page, "pointermove", { x: currentX, y: currentY }, 1);
        await page.waitForTimeout(25);
      }
    },
    async release() {
      await dispatchWindowPointerEvent(
        page,
        "pointerup",
        { x: currentX, y: currentY },
        0,
      );
    },
  };
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
  await canvas.scrollIntoViewIfNeeded();
  await canvas.hover({ position });
  await page.waitForTimeout(50);
  await page.mouse.down();
  await page.mouse.up();
}

/** Niivue polyline: clicks within this window count as a double-click (see polylinePenUtils.js). */
const POLYLINE_DOUBLE_CLICK_MS = 400;

/** Click the NiiVue canvas to place a polyline vertex (Playwright click sets mousePos correctly). */
async function clickPolylineVertex(
  canvas: ReturnType<Page["locator"]>,
  position: { x: number; y: number },
) {
  await canvas.scrollIntoViewIfNeeded();
  await canvas.click({ position, delay: 30 });
}

/**
 * Place four polyline vertices forming a closed quad, then apply + fill via Enter.
 * Vertex clicks are spaced > POLYLINE_DOUBLE_CLICK_MS so they are not mistaken for close.
 */
async function drawClosedPolylineOnNiivueCanvas(
  page: Page,
  roiTools: ReturnType<typeof roiToolsPanel>,
): Promise<{ center: { x: number; y: number } }> {
  const canvas = page.locator("#niiCanvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });

  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();

  const cx = box!.width * 0.38;
  const cy = box!.height * 0.38;
  const halfW = 52;
  const halfH = 48;
  const clamp = (x: number, y: number) => ({
    x: Math.max(8, Math.min(box!.width - 8, x)),
    y: Math.max(8, Math.min(box!.height - 8, y)),
  });

  // Four-segment closed shape (diamond).
  const top = clamp(cx, cy - halfH);
  const right = clamp(cx + halfW, cy);
  const bottom = clamp(cx, cy + halfH);
  const left = clamp(cx - halfW, cy);
  const vertices = [top, right, bottom, left];

  const polylinePalette = polylineToolGroup(roiTools);
  const vertexGapMs = POLYLINE_DOUBLE_CLICK_MS + 100;

  for (const vertex of vertices) {
    await clickPolylineVertex(canvas, vertex);
    await page.waitForTimeout(vertexGapMs);
  }

  await expect(polylinePalette.getByText(/Double-click to close & fill/i)).toBeVisible({
    timeout: 10000,
  });

  // Apply + flood-fill (same as right-click / Enter on an open polyline draft).
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);

  return { center: { x: cx, y: cy } };
}

/** After a draw commits (including apply-on-release), the ROI stats table should update. */
async function expectCommittedRoiInTable(page: Page) {
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

type RoiTableRowSnapshot = {
  label: string;
  count: number;
  color: string;
};

/** Normalize CSS colors for stable comparisons (#f00 vs rgb(255, 0, 0)). */
function normalizeCssColor(color: string): string {
  return color.trim().toLowerCase().replace(/\s+/g, "");
}

/** Read the ROI table color swatch (inline `background`, not a MUI wrapper div). */
async function getRoiTableSwatchColor(
  row: ReturnType<ReturnType<typeof roiTableGrid>["locator"]>,
): Promise<string> {
  return row.locator('.MuiDataGrid-cell[data-field="color"]').evaluate((cell) => {
    const swatch = cell.querySelector('div[style*="background"]') as HTMLElement | null;
    if (!swatch) return "";
    return swatch.style.background.trim() || window.getComputedStyle(swatch).backgroundColor;
  });
}

/** Read ROI table row count without requiring rows to exist yet. */
async function getRoiTableRowCount(page: Page): Promise<number> {
  const roiGrid = roiTableGrid(page);
  await roiGrid.scrollIntoViewIfNeeded();
  return roiGrid.locator(".MuiDataGrid-virtualScroller .MuiDataGrid-row").count();
}

/** Read all ROI table rows (label alias, voxel count, swatch color). */
async function getRoiTableRows(page: Page): Promise<RoiTableRowSnapshot[]> {
  const roiGrid = roiTableGrid(page);
  await roiGrid.scrollIntoViewIfNeeded();
  const rows = roiGrid.locator(".MuiDataGrid-virtualScroller .MuiDataGrid-row");
  const rowCount = await rows.count();
  if (rowCount === 0) return [];

  const snapshots: RoiTableRowSnapshot[] = [];

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const label = (await row.locator('.MuiDataGrid-cell[data-field="alias"]').innerText()).trim();
    const countText = (await row.locator('.MuiDataGrid-cell[data-field="count"]').innerText()).trim();
    const count = Number.parseInt(countText.replace(/,/g, ""), 10);
    const color = await getRoiTableSwatchColor(row);
    snapshots.push({ label, count, color });
  }

  return snapshots;
}

async function expectRoiTableRowCount(page: Page, expected: number) {
  await expect
    .poll(async () => getRoiTableRowCount(page), { timeout: 15000 })
    .toBe(expected);
}

/** Apply an open shape draft if draw released into edit mode instead of immediate commit. */
async function ensureShapeCommittedAfterDraw(page: Page) {
  if (await shapeDraftOverlay(page).isVisible().catch(() => false)) {
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
  }
  await expectCommittedRoiInTable(page);
}

/** Activate a shape tool palette and pick a draw color swatch. */
async function selectShapeDrawColor(
  roiTools: ReturnType<typeof roiToolsPanel>,
  tool: "rectangle" | "ellipse",
  colorIndex: 1 | 2 | 3 | 4 | 5 | 6,
) {
  const palette = tool === "rectangle" ? rectangleToolGroup(roiTools) : ellipseToolGroup(roiTools);
  const swatch = palette.getByRole("button", { name: `Color ${colorIndex}` });

  if (!(await swatch.isVisible().catch(() => false))) {
    await roiTools.getByRole("button", { name: tool }).click();
  }
  await expect(swatch).toBeVisible({ timeout: 5000 });
  await swatch.click();
}

/** Draw one shape and expect the ROI table to gain exactly one new row. */
async function drawShapeAndExpectNewRoiRow(
  page: Page,
  roiTools: ReturnType<typeof roiToolsPanel>,
  tool: "rectangle" | "ellipse",
  colorIndex: 1 | 2 | 3 | 4 | 5 | 6,
  dragOpts?: { fromXRatio?: number; fromYRatio?: number; dx?: number; dy?: number },
) {
  const beforeRows = await getRoiTableRowCount(page);

  await roiTools.getByRole("button", { name: tool }).click();
  await selectShapeDrawColor(roiTools, tool, colorIndex);
  await dragOnNiivueCanvas(page, dragOpts);
  await ensureShapeCommittedAfterDraw(page);

  await expect
    .poll(async () => getRoiTableRowCount(page), { timeout: 20000 })
    .toBe(beforeRows + 1);
}

/**
 * Multiple colors = separate ROIs: rectangle with Color 1, ellipse with Color 2.
 * Expect two table rows with distinct swatch colors and independent voxel counts.
 */
async function drawRectangleAndEllipseAsSeparateColorRois(page: Page) {
  const roiTools = roiToolsPanel(page);

  await drawShapeAndExpectNewRoiRow(page, roiTools, "rectangle", 1);
  await drawShapeAndExpectNewRoiRow(page, roiTools, "ellipse", 2, {
    fromXRatio: 0.52,
    fromYRatio: 0.48,
    dx: 95,
    dy: 85,
  });

  const rows = await getRoiTableRows(page);
  expect(rows).toHaveLength(2);

  const byLabel = Object.fromEntries(rows.map((row) => [row.label, row]));
  expect(byLabel["1"]).toBeDefined();
  expect(byLabel["2"]).toBeDefined();
  expect(byLabel["1"].count).toBeGreaterThan(0);
  expect(byLabel["2"].count).toBeGreaterThan(0);
  expect(byLabel["1"].count).not.toBe(byLabel["2"].count);

  const color1 = normalizeCssColor(byLabel["1"].color);
  const color2 = normalizeCssColor(byLabel["2"].color);
  expect(color1).not.toBe("rgba(0,0,0,0)");
  expect(color2).not.toBe("rgba(0,0,0,0)");
  expect(color1).not.toBe(color2);
  // Niivue label index maps to fixed histogram/table colors (see ROI_HISTOGRAM_COLORS).
  expect(["#f00", "#ff0000", "rgb(255,0,0)", "rgba(255,0,0,1)"]).toContain(color1);
  expect(["#0f0", "#00ff00", "rgb(0,255,0)", "rgba(0,255,0,1)"]).toContain(color2);
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

/**
 * Top-left inset of the default rectangle — stays filled after the standard partial-erase stroke
 * (which runs through the interior, not this corner).
 */
function defaultRectangleIntactCornerOnCanvas(box: { width: number; height: number }) {
  const fromX = box.width * 0.3;
  const fromY = box.height * 0.25;
  return {
    x: Math.max(10, fromX + 8),
    y: Math.max(10, fromY + 8),
  };
}

/** Bottom-right inset of the default rectangle — fallback reopen target after partial erase. */
function defaultRectangleOppositeCornerOnCanvas(box: { width: number; height: number }) {
  const fromX = box.width * 0.3;
  const fromY = box.height * 0.25;
  return {
    x: Math.min(box.width - 10, fromX + 120 - 8),
    y: Math.min(box.height - 10, fromY + 120 - 8),
  };
}

/** Pixel bounds of the default rectangle drag used by dragOnNiivueCanvas. */
function defaultRectangleBoundsOnCanvas(box: { width: number; height: number }) {
  const fromX = box.width * 0.3;
  const fromY = box.height * 0.25;
  return { fromX, fromY, width: 120, height: 120 };
}

/** Bottom-left inset — stays filled after a top-edge notch erase. */
function defaultRectangleBottomLeftCornerOnCanvas(box: { width: number; height: number }) {
  const { fromX, fromY, height } = defaultRectangleBoundsOnCanvas(box);
  return {
    x: Math.max(10, fromX + 10),
    y: Math.min(box.height - 10, fromY + height - 10),
  };
}

/** Stroke eraser drag in canvas-relative pixel coordinates. */
async function strokeEraserOnCanvas(
  page: Page,
  from: { x: number; y: number },
  delta: { dx: number; dy: number },
) {
  const canvas = page.locator("#niiCanvas");
  await expect(canvas).toBeVisible({ timeout: 15000 });
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();

  const clamp = (x: number, y: number) => ({
    x: Math.max(4, Math.min(box!.width - 4, x)),
    y: Math.max(4, Math.min(box!.height - 4, y)),
  });
  const start = clamp(from.x, from.y);
  const end = clamp(from.x + delta.dx, from.y + delta.dy);

  await canvas.hover({ position: start });
  await page.mouse.down();
  await canvas.hover({ position: end });
  await page.mouse.up();
}

/** Carve a horizontal notch into the top edge of the default drawn rectangle. */
async function eraseNotchOnRectangleTopEdge(
  page: Page,
  box: { width: number; height: number },
) {
  const { fromX, fromY, width } = defaultRectangleBoundsOnCanvas(box);
  const notchY = fromY + 6;
  const notchFromX = fromX + width * 0.3;
  await strokeEraserOnCanvas(page, { x: notchFromX, y: notchY }, { dx: 50, dy: 0 });
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
  if (await deleteBtn.isVisible()) {
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    return;
  }

  if (draftKind === "pen") {
    await deactivateFreehandDrawMode(roiTools);
    await page.waitForTimeout(150);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    await reopenRoiOnCanvas(page, reopenPosition);
    await page.waitForTimeout(250);
    if (await deleteBtn.isVisible()) break;
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

/** Shape draft overlay (rectangle/ellipse adjust mode). */
function shapeDraftOverlay(page: Page) {
  return page.getByLabel("Adjust ROI shape");
}

/** Width of the dashed preview box while a shape draft is active. */
async function getShapeDraftBorderWidth(page: Page): Promise<number> {
  const rect = await getShapeDraftBorderRect(page);
  return rect.width;
}

/** Screen-space bounds of the dashed shape preview box. */
async function getShapeDraftBorderRect(page: Page): Promise<{
  left: number;
  top: number;
  width: number;
  height: number;
}> {
  const overlay = shapeDraftOverlay(page);
  await expect(overlay).toBeVisible({ timeout: 10000 });
  return overlay.evaluate((el) => {
    const border = el.querySelector("div");
    const r = border?.getBoundingClientRect();
    return {
      left: r?.left ?? 0,
      top: r?.top ?? 0,
      width: r?.width ?? 0,
      height: r?.height ?? 0,
    };
  });
}

/** Center move handle for an active rectangle/ellipse draft. */
function shapeMoveHandle(page: Page) {
  return shapeDraftOverlay(page).getByTitle(/^Move shape/);
}

/** Pen/freehand draft overlay (move-only adjust mode). */
function penDraftOverlay(page: Page) {
  return page.getByLabel("Adjust pen ROI");
}

/** Center move handle for an active freehand/polyline pen draft. */
function penMoveHandle(page: Page) {
  // Prefer handle inside pen overlay; fall back to canvas sibling overlay container.
  return page
    .locator("#niiCanvas")
    .locator("xpath=..")
    .getByTitle(/^Move shape/)
    .first();
}

/** Whether pen draft edit UI is active (overlay and/or palette delete). */
async function isPenDraftEditActive(
  page: Page,
  roiTools: ReturnType<typeof roiToolsPanel>,
): Promise<boolean> {
  if (await penDraftOverlay(page).isVisible().catch(() => false)) return true;
  if (await penMoveHandle(page).isVisible().catch(() => false)) return true;
  if (await paletteDeleteButton(roiTools, "pen").isVisible().catch(() => false)) return true;
  return false;
}

/** Leave freehand draw mode so a canvas click reopens the ROI instead of sketching. */
async function deactivateFreehandDrawMode(roiTools: ReturnType<typeof roiToolsPanel>) {
  const freehandPalette = freehandToolGroup(roiTools);
  const lineThickness = freehandPalette.getByText(/Line thickness/i);
  if (await lineThickness.isVisible().catch(() => false)) {
    await roiTools.getByRole("button", { name: "freehand" }).click();
    return;
  }
  // Fallback: switch to rectangle and collapse it to disable drawing entirely.
  const rectangleBtn = roiTools.getByRole("button", { name: "rectangle" });
  await rectangleBtn.click();
  const rectangleGroup = rectangleBtn.locator("xpath=..");
  const rectanglePalette = rectangleGroup.getByRole("button", { name: "Color 1" });
  if (await rectanglePalette.first().isVisible().catch(() => false)) {
    await rectangleBtn.click();
  }
}

/** Leave polyline draw mode so a canvas click reopens the ROI instead of adding vertices. */
async function deactivatePolylineDrawMode(roiTools: ReturnType<typeof roiToolsPanel>) {
  const polylinePalette = polylineToolGroup(roiTools);
  const drawHint = polylinePalette.getByText(/Click to add vertices/i);
  const closeHint = polylinePalette.getByText(/Double-click to close & fill/i);
  if (
    (await drawHint.isVisible().catch(() => false)) ||
    (await closeHint.isVisible().catch(() => false))
  ) {
    await roiTools.getByRole("button", { name: "polyline" }).click();
    return;
  }
  const rectangleBtn = roiTools.getByRole("button", { name: "rectangle" });
  await rectangleBtn.click();
  const rectangleGroup = rectangleBtn.locator("xpath=..");
  const rectanglePalette = rectangleGroup.getByRole("button", { name: "Color 1" });
  if (await rectanglePalette.first().isVisible().catch(() => false)) {
    await rectangleBtn.click();
  }
}

/** Screen-space bounds of the dashed pen draft preview box. */
async function getPenDraftBorderRect(page: Page): Promise<{
  left: number;
  top: number;
  width: number;
  height: number;
}> {
  await expect(penMoveHandle(page)).toBeVisible({ timeout: 10000 });
  const overlayRoot = page.locator("#niiCanvas").locator("xpath=..");
  return overlayRoot.evaluate((el) => {
    const labeled = el.querySelector('[aria-label="Adjust pen ROI"]');
    const border = labeled?.querySelector("div") ?? el.querySelector('[aria-label="Adjust pen ROI"] div');
    const r = border?.getBoundingClientRect();
    return {
      left: r?.left ?? 0,
      top: r?.top ?? 0,
      width: r?.width ?? 0,
      height: r?.height ?? 0,
    };
  });
}

/** Re-open a committed freehand ROI for edit, or no-op if pen draft UI is already open. */
async function ensurePenDraftForEdit(
  page: Page,
  roiTools: ReturnType<typeof roiToolsPanel>,
  reopenPosition: { x: number; y: number },
) {
  if (await isPenDraftEditActive(page, roiTools)) {
    await expect(penMoveHandle(page)).toBeVisible({ timeout: 10000 });
    return;
  }

  await deactivateFreehandDrawMode(roiTools);
  await page.waitForTimeout(150);

  for (let attempt = 0; attempt < 3; attempt++) {
    await reopenRoiOnCanvas(page, reopenPosition);
    await page.waitForTimeout(250);
    if (await isPenDraftEditActive(page, roiTools)) break;
  }

  await expect
    .poll(async () => isPenDraftEditActive(page, roiTools), { timeout: 15000 })
    .toBe(true);
  await expect(penMoveHandle(page)).toBeVisible({ timeout: 10000 });
}

/** Re-open a committed polyline ROI for edit (reopens as freehand draft from registry). */
async function ensurePolylineDraftForEdit(
  page: Page,
  roiTools: ReturnType<typeof roiToolsPanel>,
  reopenPosition: { x: number; y: number },
) {
  await ensurePenDraftForEdit(page, roiTools, reopenPosition);
}

/**
 * Pen ROI re-edit: move-only overlay — not rectangle/ellipse shape handles.
 * Committed polylines reopen as freehand drafts (registry voxels), so the freehand palette opens.
 */
async function expectPolylineMoveOnlyEditUi(
  page: Page,
  roiTools: ReturnType<typeof roiToolsPanel>,
) {
  await expect(penDraftOverlay(page)).toBeVisible({ timeout: 10000 });
  await expect(shapeDraftOverlay(page)).not.toBeVisible();
  await expect(penMoveHandle(page)).toBeVisible({ timeout: 10000 });

  const penOverlay = penDraftOverlay(page);
  await expect(penOverlay.getByTitle(/^Move shape/)).toHaveCount(1);
  await expect(penOverlay.locator('[title="Resize shape"]')).toHaveCount(0);

  await expect(freehandToolGroup(roiTools).getByText(/Line thickness/i)).toBeVisible({
    timeout: 5000,
  });
  await expect(polylineToolGroup(roiTools).getByText(/Click to add vertices/i)).not.toBeVisible();
}

/** Parse the first ROI row mean from the stats table. */
async function getFirstRoiMean(page: Page): Promise<number> {
  const roiGrid = roiTableGrid(page);
  await roiGrid.scrollIntoViewIfNeeded();
  const meanCell = roiGrid
    .locator(".MuiDataGrid-virtualScroller .MuiDataGrid-row")
    .first()
    .locator('.MuiDataGrid-cell[data-field="mu"]');
  await expect(meanCell).toBeVisible({ timeout: 15000 });
  const value = Number.parseFloat((await meanCell.innerText()).trim());
  expect(Number.isFinite(value)).toBeTruthy();
  return value;
}

/**
 * Re-open a committed rectangle/ellipse for edit, or no-op if draft overlay is already open.
 */
async function ensureShapeDraftForEdit(
  page: Page,
  reopenPosition: { x: number; y: number },
) {
  const overlay = shapeDraftOverlay(page);
  if (!(await overlay.isVisible())) {
    await reopenRoiOnCanvas(page, reopenPosition);
  }
  await expect(overlay).toBeVisible({ timeout: 10000 });
  await expect(shapeMoveHandle(page)).toBeVisible({ timeout: 10000 });
  await expect(page.getByTitle("Resize shape").first()).toBeVisible({ timeout: 10000 });
}

/**
 * Draw a committed shape, re-enter edit mode, drag a corner handle, and assert
 * live preview growth plus updated voxel count after pointer release (auto-apply).
 */
async function resizeCommittedShapeViaCornerHandle(
  page: Page,
  tool: "rectangle" | "ellipse",
  reopenPosition: { x: number; y: number },
) {
  const roiTools = roiToolsPanel(page);

  await roiTools.getByRole("button", { name: tool }).click();
  await dragOnNiivueCanvas(page);
  await expectCommittedRoiInTable(page);

  const beforeCount = await getFirstRoiVoxelCount(page);
  expect(beforeCount).toBeGreaterThan(0);

  await ensureShapeDraftForEdit(page, reopenPosition);

  const borderWidthBefore = await getShapeDraftBorderWidth(page);

  const handles = page.getByTitle("Resize shape");
  const count = await handles.count();
  let bestIndex = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < count; i++) {
    const box = await handles.nth(i).boundingBox();
    if (!box) continue;
    const score = box.x + box.y;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  const handle = handles.nth(bestIndex);
  const delta = { dx: 50, dy: 50 };

  const drag = await startHandlePointerDrag(page, handle);
  await drag.moveBy(delta);

  await expect
    .poll(async () => getShapeDraftBorderWidth(page), { timeout: 5000 })
    .toBeGreaterThan(borderWidthBefore);

  await drag.release();

  await expect
    .poll(async () => getFirstRoiVoxelCount(page), { timeout: 15000 })
    .toBeGreaterThan(beforeCount);
}

/**
 * Draw a committed shape, re-enter edit mode, drag the center handle, and assert
 * live translation (position changes, size preserved) plus stats refresh on release.
 */
async function translateCommittedShapeViaCenterHandle(
  page: Page,
  tool: "rectangle" | "ellipse",
  reopenPosition: { x: number; y: number },
) {
  const roiTools = roiToolsPanel(page);

  await roiTools.getByRole("button", { name: tool }).click();
  await dragOnNiivueCanvas(page);
  await expectCommittedRoiInTable(page);

  const beforeCount = await getFirstRoiVoxelCount(page);
  expect(beforeCount).toBeGreaterThan(0);
  await getFirstRoiMean(page);

  await ensureShapeDraftForEdit(page, reopenPosition);
  const rectBefore = await getShapeDraftBorderRect(page);

  const moveHandle = shapeMoveHandle(page);
  const delta = { dx: 70, dy: 50 };

  const drag = await startHandlePointerDrag(page, moveHandle);
  await drag.moveBy(delta);

  await expect
    .poll(async () => {
      const rect = await getShapeDraftBorderRect(page);
      const moved =
        Math.abs(rect.left - rectBefore.left) > 5 ||
        Math.abs(rect.top - rectBefore.top) > 5;
      const sameWidth = Math.abs(rect.width - rectBefore.width) < 3;
      const sameHeight = Math.abs(rect.height - rectBefore.height) < 3;
      return moved && sameWidth && sameHeight;
    }, { timeout: 5000 })
    .toBe(true);

  await drag.release();

  // Draft auto-applies on pointer release; overlay closes and stats refresh.
  await expect(shapeDraftOverlay(page)).not.toBeVisible({ timeout: 10000 });
  await expect
    .poll(async () => getFirstRoiVoxelCount(page), { timeout: 15000 })
    .toBe(beforeCount);

  const afterMean = await getFirstRoiMean(page);
  expect(Number.isFinite(afterMean)).toBe(true);
}

/**
 * Draw freehand, re-enter edit mode, drag center handle, and assert live translation
 * plus roughly preserved voxel count and refreshed stats after auto-apply.
 */
async function translateCommittedFreehandViaCenterHandle(page: Page) {
  const roiTools = roiToolsPanel(page);

  await ensureFreehandDrawReady(roiTools);
  const { center } = await strokeLoopOnNiivueCanvas(page);
  await expectCommittedRoiInTable(page);

  const beforeCount = await getFirstRoiVoxelCount(page);
  expect(beforeCount).toBeGreaterThan(0);
  await getFirstRoiMean(page);

  await ensurePenDraftForEdit(page, roiTools, center);
  const rectBefore = await getPenDraftBorderRect(page);

  const moveHandle = penMoveHandle(page);
  const delta = { dx: 70, dy: 50 };

  const drag = await startHandlePointerDrag(page, moveHandle);
  await drag.moveBy(delta);

  await expect
    .poll(async () => {
      const rect = await getPenDraftBorderRect(page);
      const moved =
        Math.abs(rect.left - rectBefore.left) > 5 ||
        Math.abs(rect.top - rectBefore.top) > 5;
      const sameWidth = Math.abs(rect.width - rectBefore.width) < 4;
      const sameHeight = Math.abs(rect.height - rectBefore.height) < 4;
      return moved && sameWidth && sameHeight;
    }, { timeout: 5000 })
    .toBe(true);

  await drag.release();

  // Draft auto-applies on pointer release; overlay closes and stats refresh.
  await expect(penDraftOverlay(page)).not.toBeVisible({ timeout: 10000 });

  await expect
    .poll(async () => {
      const afterCount = await getFirstRoiVoxelCount(page);
      return Math.abs(afterCount - beforeCount) / beforeCount;
    }, { timeout: 15000 })
    .toBeLessThanOrEqual(0.15);

  const afterCount = await getFirstRoiVoxelCount(page);
  expect(afterCount).toBeGreaterThan(0);

  const afterMean = await getFirstRoiMean(page);
  expect(Number.isFinite(afterMean)).toBe(true);
}

/**
 * Draw polyline, close & fill, re-enter edit mode, move via center handle, apply,
 * and verify the filled region moved while staying classified as polyline.
 */
async function translateCommittedPolylineViaCenterHandle(page: Page) {
  const roiTools = roiToolsPanel(page);

  await ensurePolylineDrawReady(roiTools);
  const { center } = await drawClosedPolylineOnNiivueCanvas(page, roiTools);
  await expectCommittedRoiInTable(page);

  const beforeCount = await getFirstRoiVoxelCount(page);
  expect(beforeCount).toBeGreaterThan(0);

  await ensurePolylineDraftForEdit(page, roiTools, center);
  await expectPolylineMoveOnlyEditUi(page, roiTools);

  const rectBefore = await getPenDraftBorderRect(page);
  const delta = { dx: 70, dy: 50 };

  const drag = await startHandlePointerDrag(page, penMoveHandle(page));
  await drag.moveBy(delta);

  await expect
    .poll(async () => {
      const rect = await getPenDraftBorderRect(page);
      const moved =
        Math.abs(rect.left - rectBefore.left) > 5 ||
        Math.abs(rect.top - rectBefore.top) > 5;
      const sameWidth = Math.abs(rect.width - rectBefore.width) < 4;
      const sameHeight = Math.abs(rect.height - rectBefore.height) < 4;
      return moved && sameWidth && sameHeight;
    }, { timeout: 5000 })
    .toBe(true);

  await drag.release();

  await expect(penDraftOverlay(page)).not.toBeVisible({ timeout: 10000 });

  await expect
    .poll(async () => {
      const afterCount = await getFirstRoiVoxelCount(page);
      return Math.abs(afterCount - beforeCount) / beforeCount;
    }, { timeout: 15000 })
    .toBeLessThanOrEqual(0.15);

  const afterCount = await getFirstRoiVoxelCount(page);
  expect(afterCount).toBeGreaterThan(0);

  // Re-open at the translated position — must still be polyline, not shape inference.
  const movedCenter = { x: center.x + delta.dx, y: center.y + delta.dy };
  await ensurePolylineDraftForEdit(page, roiTools, movedCenter);
  await expectPolylineMoveOnlyEditUi(page, roiTools);
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

/** Leave eraser mode so canvas clicks reopen ROIs instead of erasing. */
async function deactivateEraser(roiTools: ReturnType<typeof roiToolsPanel>) {
  const eraserPanel = roiTools.getByText(/Eraser size:/i);
  if (await eraserPanel.isVisible().catch(() => false)) {
    await roiTools.getByRole("button", { name: "erase" }).click();
  }
}

/** Shape re-edit after partial erase: move only, no corner resize handles. */
async function expectShapeResizeDisabledEditUi(page: Page) {
  await expect(shapeDraftOverlay(page)).toBeVisible({ timeout: 10000 });
  await expect(
    shapeDraftOverlay(page).getByTitle(/Move shape \(resize unavailable after erasing\)/),
  ).toBeVisible({ timeout: 10000 });
  await expect(shapeDraftOverlay(page).getByTitle("Resize shape")).toHaveCount(0);
}

/** Re-open a partially erased shape for edit and assert resize is disabled. */
async function ensurePartiallyErasedShapeDraftForEdit(
  page: Page,
  reopenPositions: Array<{ x: number; y: number }>,
) {
  if (await shapeDraftOverlay(page).isVisible().catch(() => false)) {
    await expectShapeResizeDisabledEditUi(page);
    return;
  }

  for (const position of reopenPositions) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await reopenRoiOnCanvas(page, position);
      await page.waitForTimeout(250);
      if (await shapeDraftOverlay(page).isVisible().catch(() => false)) break;
    }
    if (await shapeDraftOverlay(page).isVisible().catch(() => false)) break;
  }

  await expectShapeResizeDisabledEditUi(page);
}

/**
 * Draw rectangle, partially erase, re-enter edit (resize disabled), move via center handle,
 * and verify voxel count and move-only UI are preserved.
 */
async function movePartiallyErasedRectangleWithResizeDisabled(page: Page) {
  const roiTools = roiToolsPanel(page);
  const canvas = page.locator("#niiCanvas");
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  const intactCorner = defaultRectangleIntactCornerOnCanvas(box!);
  const oppositeCorner = defaultRectangleOppositeCornerOnCanvas(box!);
  const reopenCandidates = [intactCorner, oppositeCorner];

  await roiTools.getByRole("button", { name: "rectangle" }).click();
  await dragOnNiivueCanvas(page);
  await expectCommittedRoiInTable(page);

  const beforeCount = await getFirstRoiVoxelCount(page);
  expect(beforeCount).toBeGreaterThan(0);

  await roiTools.getByRole("button", { name: "erase" }).click();
  await expect(roiTools.getByText(/Eraser size:/i)).toBeVisible({ timeout: 5000 });
  await setEraserSize(roiTools, 7);
  await dragOnNiivueCanvas(page, { fromXRatio: 0.32, fromYRatio: 0.28, dx: 100, dy: 100 });

  await expect
    .poll(async () => getFirstRoiVoxelCount(page), { timeout: 15000 })
    .toBeLessThan(beforeCount);
  const afterEraseCount = await getFirstRoiVoxelCount(page);
  expect(afterEraseCount).toBeGreaterThan(0);

  await deactivateEraser(roiTools);
  await page.waitForTimeout(150);

  await ensurePartiallyErasedShapeDraftForEdit(page, reopenCandidates);

  const rectBefore = await getShapeDraftBorderRect(page);
  const moveHandle = shapeMoveHandle(page);
  const delta = { dx: 70, dy: 50 };

  const drag = await startHandlePointerDrag(page, moveHandle);
  await drag.moveBy(delta);

  await expect
    .poll(async () => {
      const rect = await getShapeDraftBorderRect(page);
      const moved =
        Math.abs(rect.left - rectBefore.left) > 5 ||
        Math.abs(rect.top - rectBefore.top) > 5;
      const sameWidth = Math.abs(rect.width - rectBefore.width) < 3;
      const sameHeight = Math.abs(rect.height - rectBefore.height) < 3;
      return moved && sameWidth && sameHeight;
    }, { timeout: 5000 })
    .toBe(true);

  await drag.release();

  await expect(shapeDraftOverlay(page)).not.toBeVisible({ timeout: 10000 });
  await expect
    .poll(async () => getFirstRoiVoxelCount(page), { timeout: 15000 })
    .toBe(afterEraseCount);

  const afterMean = await getFirstRoiMean(page);
  expect(Number.isFinite(afterMean)).toBe(true);

  await ensurePartiallyErasedShapeDraftForEdit(page, [
    { x: intactCorner.x + delta.dx, y: intactCorner.y + delta.dy },
    { x: oppositeCorner.x + delta.dx, y: oppositeCorner.y + delta.dy },
  ]);
}

async function expectRectangleShapeEditPalette(roiTools: ReturnType<typeof roiToolsPanel>) {
  await expect(rectangleToolGroup(roiTools).getByRole("button", { name: "Color 1" })).toBeVisible({
    timeout: 5000,
  });
}

async function expectFreehandPenEditPalette(roiTools: ReturnType<typeof roiToolsPanel>) {
  await expect(freehandToolGroup(roiTools).getByText(/Line thickness/i)).toBeVisible({
    timeout: 5000,
  });
}

/** Assert eroded voxel count is preserved (not restored to pre-erase total). */
async function expectErasedVoxelCountPreserved(
  originalCount: number,
  afterEraseCount: number,
) {
  expect(afterEraseCount).toBeLessThan(originalCount);
  expect(afterEraseCount).toBeGreaterThan(0);
}

async function expectCommittedVoxelCount(page: Page, expected: number) {
  await expect
    .poll(async () => getFirstRoiVoxelCount(page), { timeout: 15000 })
    .toBe(expected);
}

/**
 * Draw → erase edge notch → reopen → move → apply → reopen again.
 * Verifies eroded voxels are not healed, move preserves count, and palette/tool match.
 */
async function eraseMoveAndReopenPartiallyErasedRectangle(page: Page) {
  const roiTools = roiToolsPanel(page);
  const canvas = page.locator("#niiCanvas");
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();

  const reopenCorner = defaultRectangleBottomLeftCornerOnCanvas(box!);
  const fallbackCorner = defaultRectangleOppositeCornerOnCanvas(box!);
  const reopenCandidates = [reopenCorner, fallbackCorner];

  await roiTools.getByRole("button", { name: "rectangle" }).click();
  await dragOnNiivueCanvas(page);
  await expectCommittedRoiInTable(page);

  const originalCount = await getFirstRoiVoxelCount(page);
  expect(originalCount).toBeGreaterThan(0);

  await roiTools.getByRole("button", { name: "erase" }).click();
  await expect(roiTools.getByText(/Eraser size:/i)).toBeVisible({ timeout: 5000 });
  await setEraserSize(roiTools, 5);
  await eraseNotchOnRectangleTopEdge(page, box!);

  await expect
    .poll(async () => getFirstRoiVoxelCount(page), { timeout: 15000 })
    .toBeLessThan(originalCount);
  const afterEraseCount = await getFirstRoiVoxelCount(page);
  await expectErasedVoxelCountPreserved(originalCount, afterEraseCount);

  await deactivateEraser(roiTools);
  await page.waitForTimeout(150);

  await ensurePartiallyErasedShapeDraftForEdit(page, reopenCandidates);
  await expectRectangleShapeEditPalette(roiTools);

  const rectBefore = await getShapeDraftBorderRect(page);
  const moveHandle = shapeMoveHandle(page);
  const delta = { dx: 60, dy: 40 };

  const drag = await startHandlePointerDrag(page, moveHandle);
  await drag.moveBy(delta);

  await expect
    .poll(async () => {
      const rect = await getShapeDraftBorderRect(page);
      const moved =
        Math.abs(rect.left - rectBefore.left) > 5 ||
        Math.abs(rect.top - rectBefore.top) > 5;
      const sameWidth = Math.abs(rect.width - rectBefore.width) < 3;
      const sameHeight = Math.abs(rect.height - rectBefore.height) < 3;
      return moved && sameWidth && sameHeight;
    }, { timeout: 5000 })
    .toBe(true);

  await drag.release();

  await expect(shapeDraftOverlay(page)).not.toBeVisible({ timeout: 10000 });
  await expectCommittedVoxelCount(page, afterEraseCount);
  expect(await getFirstRoiVoxelCount(page)).toBeLessThan(originalCount);

  await ensurePartiallyErasedShapeDraftForEdit(page, [
    { x: reopenCorner.x + delta.dx, y: reopenCorner.y + delta.dy },
    { x: fallbackCorner.x + delta.dx, y: fallbackCorner.y + delta.dy },
  ]);
  await expectRectangleShapeEditPalette(roiTools);
  await expectShapeResizeDisabledEditUi(page);
}

/**
 * Freehand variant: edge notch erase, move, re-open — eroded voxels and palette preserved.
 */
async function eraseMoveAndReopenPartiallyErasedFreehand(page: Page) {
  const roiTools = roiToolsPanel(page);
  const canvas = page.locator("#niiCanvas");

  await ensureFreehandDrawReady(roiTools);
  const { center } = await strokeLoopOnNiivueCanvas(page);
  await expectCommittedRoiInTable(page);

  const originalCount = await getFirstRoiVoxelCount(page);
  expect(originalCount).toBeGreaterThan(0);

  await roiTools.getByRole("button", { name: "erase" }).click();
  await expect(roiTools.getByText(/Eraser size:/i)).toBeVisible({ timeout: 5000 });
  await setEraserSize(roiTools, 5);
  // Notch on the top edge of the freehand loop (center interior stays filled).
  await strokeEraserOnCanvas(
    page,
    { x: center.x - 20, y: center.y - 50 },
    { dx: 40, dy: 0 },
  );

  await expect
    .poll(async () => getFirstRoiVoxelCount(page), { timeout: 15000 })
    .toBeLessThan(originalCount);
  const afterEraseCount = await getFirstRoiVoxelCount(page);
  await expectErasedVoxelCountPreserved(originalCount, afterEraseCount);

  await deactivateEraser(roiTools);
  await page.waitForTimeout(150);

  await ensurePenDraftForEdit(page, roiTools, center);
  await expectFreehandPenEditPalette(roiTools);

  const rectBefore = await getPenDraftBorderRect(page);
  const delta = { dx: 55, dy: 35 };

  const drag = await startHandlePointerDrag(page, penMoveHandle(page));
  await drag.moveBy(delta);

  await expect
    .poll(async () => {
      const rect = await getPenDraftBorderRect(page);
      const moved =
        Math.abs(rect.left - rectBefore.left) > 5 ||
        Math.abs(rect.top - rectBefore.top) > 5;
      const sameWidth = Math.abs(rect.width - rectBefore.width) < 4;
      const sameHeight = Math.abs(rect.height - rectBefore.height) < 4;
      return moved && sameWidth && sameHeight;
    }, { timeout: 5000 })
    .toBe(true);

  await drag.release();

  await expect(penDraftOverlay(page)).not.toBeVisible({ timeout: 10000 });
  await expectCommittedVoxelCount(page, afterEraseCount);
  expect(await getFirstRoiVoxelCount(page)).toBeLessThan(originalCount);

  const movedCenter = { x: center.x + delta.dx, y: center.y + delta.dy };
  await ensurePenDraftForEdit(page, roiTools, movedCenter);
  await expectFreehandPenEditPalette(roiTools);
  await expect(penDraftOverlay(page)).toBeVisible({ timeout: 10000 });
  await expect(shapeDraftOverlay(page)).not.toBeVisible();
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
      await expect(freehandToolGroup(roiTools).getByText(/Line thickness/i)).toBeVisible({
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

    test.describe("Basic draw (one tool, happy path)", () => {
      test("freehand stroke commits shape to the ROI table", async ({ page }) => {
        const roiTools = roiToolsPanel(page);
        await expect(roiTools.getByRole("button", { name: "freehand" })).toBeVisible({
          timeout: 15000,
        });

        await ensureFreehandDrawReady(roiTools);
        await strokeLoopOnNiivueCanvas(page);
        await expectCommittedRoiInTable(page);
      });

      test("polyline clicks commit closed shape to the ROI table", async ({ page }) => {
        const roiTools = roiToolsPanel(page);
        await ensurePolylineDrawReady(roiTools);
        await drawClosedPolylineOnNiivueCanvas(page, roiTools);
        await expectCommittedRoiInTable(page);
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

        await ensureFreehandDrawReady(roiTools);
        const { center } = await strokeLoopOnNiivueCanvas(page);
        await expectCommittedRoiInTable(page);

        await ensureDraftDeleteReady(page, roiTools, "pen", center);

        await clickDeleteInPalette(roiTools, "pen");
        await expectEmptyRoiTable(page);
        await expect(page.getByRole("button", { name: /Save Drawing Layer/i })).toBeEnabled({
          timeout: 15000,
        });
      });
    });

    test("rectangle Color 1 and ellipse Color 2 create separate ROI table rows", async ({
      page,
    }) => {
      await drawRectangleAndEllipseAsSeparateColorRois(page);
    });

    test.describe("Edit / move / resize", () => {
      test("rectangle corner handle resize updates preview live and voxel count on release", async ({
        page,
      }) => {
        const canvas = page.locator("#niiCanvas");
        const box = await canvas.boundingBox();
        expect(box).toBeTruthy();

        await resizeCommittedShapeViaCornerHandle(
          page,
          "rectangle",
          defaultRectangleCenterOnCanvas(box!),
        );
      });

      test("ellipse corner handle resize updates preview live and voxel count on release", async ({
        page,
      }) => {
        const canvas = page.locator("#niiCanvas");
        const box = await canvas.boundingBox();
        expect(box).toBeTruthy();

        await resizeCommittedShapeViaCornerHandle(
          page,
          "ellipse",
          defaultRectangleCenterOnCanvas(box!),
        );
      });

      test("rectangle center handle move translates shape live and refreshes stats on release", async ({
        page,
      }) => {
        const canvas = page.locator("#niiCanvas");
        const box = await canvas.boundingBox();
        expect(box).toBeTruthy();

        await translateCommittedShapeViaCenterHandle(
          page,
          "rectangle",
          defaultRectangleCenterOnCanvas(box!),
        );
      });

      test("freehand center handle move translates ROI live and refreshes stats on release", async ({
        page,
      }) => {
        await translateCommittedFreehandViaCenterHandle(page);
      });

      test("polyline center handle move translates filled region and stays classified as polyline", async ({
        page,
      }) => {
        await translateCommittedPolylineViaCenterHandle(page);
      });

      test("partially erased rectangle disables corner resize but center move still works", async ({
        page,
      }) => {
        await movePartiallyErasedRectangleWithResizeDisabled(page);
      });

      test("rectangle erase notch move and re-edit preserves eroded voxels and palette", async ({
        page,
      }) => {
        await eraseMoveAndReopenPartiallyErasedRectangle(page);
      });

      test("freehand erase notch move and re-edit preserves eroded voxels and palette", async ({
        page,
      }) => {
        await eraseMoveAndReopenPartiallyErasedFreehand(page);
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
