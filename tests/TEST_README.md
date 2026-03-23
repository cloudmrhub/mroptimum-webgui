# MR Optimum — End-to-End Test Guide

This document explains how to install, configure, and run the full Playwright end-to-end test suite for the MR Optimum web application.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| Playwright | installed via `@playwright/test` devDependency |

Install project dependencies (if not already done):

```bash
npm install
```

Install Playwright browsers (first time only):

```bash
npx playwright install --with-deps chromium
```

---

## Environment Variables

The test suite requires credentials and can target either a local dev server or the production deployment.

### Required

| Variable | Description | Example |
|---|---|---|
| `E2E_EMAIL` | Valid login email | `user@example.com` |
| `E2E_PASSWORD` | Valid login password | `s3cret` |

### Optional

| Variable | Description | Default |
|---|---|---|
| `ENV` | Target environment: `local` or `prod` | `local` |
| `E2E_LOCAL_BASE_URL` | Override local dev server URL | `http://localhost:5173` |
| `E2E_PROD_BASE_URL` | Override production URL | `https://mro.aws.cloudmrhub.com/main` |
| `USE_AUTH_STATE` | Reuse saved auth state (`true`/`false`) | `false` |
| `E2E_INVALID_EMAIL` | Email for invalid-login test | _(skipped if unset)_ |
| `E2E_INVALID_PASSWORD` | Password for invalid-login test | _(skipped if unset)_ |
| `CI` | Set automatically in CI pipelines | _(unset locally)_ |

Export them before running:

```bash
export E2E_EMAIL="your-email@example.com"
export E2E_PASSWORD="your-password"
```

---

## Test Files Overview

All test files live in the `tests/` directory:

| File | What it tests |
|---|---|
| `tests/auth.setup.ts` | Authenticates and saves browser storage state for reuse |
| `tests/login.spec.ts` | Login flow — valid credentials, invalid credentials error |
| `tests/home.full.spec.ts` | Home page — sections visible, file upload (.dat accepted, .nii rejected), calculation counts |
| `tests/setup.spec.ts` | Setup page — all analysis methods, reconstruction methods, checkboxes, inputs, constraints |
| `tests/results.spec.ts` | Results page — job table, viewer controls, ROI table, drawing toolkit, settings inspection |
| `tests/helpers/auth.ts` | Shared authentication helpers used by all test files |

### Setup Tests (`setup.spec.ts`) — Detailed Coverage

**Analysis Methods** (radio buttons):
- Analytic Method, Multiple Replica, Pseudo Multiple Replica, Generalized Pseudo-Replica

**Reconstruction Methods per Analysis Method:**

| Analysis Method | RSS | B1 | SENSE | GRAPPA |
|---|---|---|---|---|
| Analytic | ✅ | ✅ | ✅ | ❌ |
| Multiple Replica | ✅ | ❌ | ❌ | ❌ |
| Pseudo Multiple Replica | ✅ | ✅ | ✅ | ✅ |
| Generalized Pseudo-Replica | ✅ | ✅ | ✅ | ✅ |

**Checkboxes/Options per Reconstruction:**

| Feature | RSS | B1 | SENSE | GRAPPA |
|---|---|---|---|---|
| No Flip Angle Correction | ✅ | ✅ | ✅ | ✅ |
| Save .mat file | ✅ | ✅ | ✅ | ✅ |
| Save Coil Sensitivities | ❌ | ✅ | ✅ | ❌ |
| Save g Factor | ❌ | ❌ | ✅ | ❌ |
| Object Masking | ❌ | ✅ | ✅ | ❌ |
| Decimate Data | ❌ | ❌ | ✅ | ✅ |
| Kernel Size X/Y | ❌ | ❌ | ❌ | ✅ |

**Object Masking Options** (B1/SENSE):
- Do Not Mask — selectable
- Keep Pixels Above % — threshold `min=1` (no negatives)
- Use Mask from ESPIRiT — k, r, t, c inputs all `>= 0`
- Predefined Mask — file upload tested with `hippo.nii`

**Decimate Data** (SENSE/GRAPPA):
- Acceleration Factor X/Y — `min=1`
- Autocalibration Lines — `min=2`
- "Use All Lines for Autocalibration" — disables ACL input (NaN); uncheck re-enables

**Pseudo-Replica Specific:**
- Number of Pseudo Replicas — integer, `min=2`, `max=128` (PMR) / `max=10` (GPR)

**Generalized Pseudo-Replica Specific:**
- Cubic VOI Size (Length of Side in Pixels) — `min=2`, `max=20`

### Results Tests (`results.spec.ts`) — Detailed Coverage

**Job Results Panel:**
- Table columns: Job ID, Alias, Date Submitted, Status, Actions
- Auto Refreshing checkbox toggles
- Refresh button clickable
- Completed jobs: Play, Download, Delete buttons visible
- Pending jobs: Play button disabled
- Delete opens confirmation dialog

**View Results Panel (NiiVue Viewer):**
- Opened Volume dropdown
- Orientation dropdown: Axial, Coronal, Sagittal, Multi, 3D
- Scroll and Right Click: Pan and Zoom, Slice and Measurement, Contrast, Slice and None
- Display Mode dropdown
- ROI Layer dropdown
- Switches: Neurological, Show Crosshair, Show Color Bar, Labels Visible
- Buttons: Reset Views, Recenter Views, Reset Zooms, Reset Contrast, Zoom In, Zoom Out
- Save Drawing Layer button
- Settings gear icon

**ROI Table:**
- Columns: ROI Label, Color, Mean, SD, Visibility, Voxel Count
- Toolbar: Group, Ungroup, Download, Delete — all warn when no selection
- Upload button present

**Drawing Toolkit:**
- Paint brush, eraser, undo, screenshot buttons
- Opacity slider
- Visibility toggle

**Current Job Settings (read-only inspection):**
- Number of Slices, SNR Analysis Method, Image Reconstruction Method
- Flip Angle Correction, Pseudo Replica Count, Cubic VOI Size
- Kernel Sizes, Decimate Data, Acceleration Factors, Autocalibration Lines

---

## Running Tests

### Run All Tests (headless)

```bash
# Against local dev server (auto-started by Playwright)
npm run test:e2e

# Against production
ENV=prod npm run test:e2e
```

### Run All Tests (headed — browser visible)

```bash
npm run test:e2e:headed
```

### Run with Playwright UI (interactive mode)

```bash
npm run test:e2e:ui
```

### Run a Single Test File

```bash
# Login tests only
npx playwright test tests/login.spec.ts

# Home page tests only
npx playwright test tests/home.full.spec.ts

# Setup page tests only
npx playwright test tests/setup.spec.ts

# Results page tests only
npx playwright test tests/results.spec.ts
```

### Run a Specific Test by Name

```bash
npx playwright test -g "has 'Save g Factor' checkbox"
```

### Run Tests in a Specific Describe Block

```bash
npx playwright test -g "Analytic Method"
npx playwright test -g "GRAPPA reconstruction"
npx playwright test -g "Job Results panel"
```

---

## Using Saved Auth State (faster re-runs)

To avoid logging in on every test run, enable auth state reuse:

```bash
# Step 1: Run auth setup to save browser state
npx playwright test tests/auth.setup.ts

# Step 2: Run tests with saved state
USE_AUTH_STATE=true npm run test:e2e
```

The auth state is saved to `playwright/.auth/auth.json`.

---

## Viewing Reports

After a test run, an HTML report is generated:

```bash
npx playwright show-report
```

This opens the report in your browser with detailed pass/fail results, screenshots on failure, and video recordings.

---

## Debugging Failed Tests

### Step-by-step debug mode

```bash
npx playwright test --debug tests/setup.spec.ts
```

### Run with trace viewer

```bash
npx playwright test --trace on tests/results.spec.ts
npx playwright show-report
# Click on the failed test → "Traces" tab
```

### View videos of test runs

Videos are recorded automatically (configured in `playwright.config.ts`). Find them in `test-results/` after a run.

### Screenshots on failure

Screenshots are captured automatically on failure and embedded in the HTML report.

---

## CI / Pipeline Usage

In CI environments, set the `CI` environment variable (usually automatic). The config adjusts behavior:

- **Retries**: 2 (vs 0 locally)
- **Workers**: 1 (serial execution)
- **`forbidOnly`**: `true` (prevents `.only` from slipping into CI)

Example CI command:

```bash
export CI=true
export E2E_EMAIL="ci-user@example.com"
export E2E_PASSWORD="ci-password"
export ENV=prod

npx playwright install --with-deps chromium
npm run test:e2e
```

---

## Project Structure

```
tests/
├── auth.setup.ts          # Auth state setup (run once, reuse)
├── login.spec.ts          # Login page tests
├── home.full.spec.ts      # Home page tests
├── setup.spec.ts          # Setup page tests (analysis, reconstruction, masking, etc.)
├── results.spec.ts        # Results page tests (jobs, viewer, ROI, drawing)
└── helpers/
    └── auth.ts            # Shared login/auth utilities

playwright.config.ts       # Playwright configuration
playwright/
└── .auth/
    └── auth.json          # Saved auth state (gitignored)
test-results/              # Screenshots, videos, traces from last run
playwright-report/         # HTML report output
```

---

## Timeouts

- **Global test timeout**: 120 seconds per test (set in each spec file)
- **Web server startup**: 120 seconds (for local `vite` dev server)
- **Network idle wait**: used in `beforeEach` to ensure pages are fully loaded

If tests time out on a slow machine, increase the timeout in the spec file:

```typescript
test.setTimeout(180_000); // 3 minutes
```
