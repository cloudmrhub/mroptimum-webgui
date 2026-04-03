# MR Optimum E2E Test Suite Summary

All tests are located in the `tests/` directory and run with Playwright against either `local` or `prod` environments.

---

## `auth.setup.ts`
**Purpose:** One-time setup that logs in and saves a reusable authenticated browser session.

- Logs in via the UI using `E2E_EMAIL` and `E2E_PASSWORD`
- Saves browser storage state to `playwright/.auth/auth.json`
- Used when `USE_AUTH_STATE=1` so subsequent tests can skip the login step

---

## `login.spec.ts`
**Purpose:** Validates the login/authentication flow.

| Test | What it checks |
|------|---------------|
| User can log in successfully | Fills in credentials, submits, lands on Home with "Uploaded Data" visible |
| Shows error for invalid credentials | Uses invalid email/password, stays on login page, error alert appears |

---

## `home.full.spec.ts`
**Purpose:** Comprehensive tests for the Home page — panels, file upload, rename, and delete.

> **Note:** Uses `test.describe.configure({ mode: "serial" })` to force sequential execution. Tests share server-side state (uploaded files, rename, delete operations) and will race against each other under `fullyParallel: true` if run concurrently.

### Page Sections
| Test | What it checks |
|------|---------------|
| Shows Calculation Counts panel | Panel header is visible |
| Shows Mode 1 (Cloud MR AWS) Computing Units panel | Panel header is visible |
| Shows Uploaded Data panel | Panel header is visible |
| Shows Mode 2 Computing Units panel if user has mode 2 units | Only checks if user has Mode 2 units; skips gracefully otherwise |
| Calculation Counts loads a numeric value for Mode 1 | Loading spinner disappears, Mode 1 count label appears |

### Uploaded Data Table
| Test | What it checks |
|------|---------------|
| Shows correct column headers | File Name, Date Submitted, Status, Edit File Name columns visible |
| Delete button is disabled when no file is selected | Delete button is disabled by default |
| Download button is disabled when no file is selected | Download button is disabled by default |
| Delete and Download buttons enable after selecting a file | Checking a row enables both Delete and Download |

### File Download
| Test | What it checks |
|------|---------------|
| Download starts a browser download when a file is selected | `page.waitForEvent("download")` after clicking Download; filename or URL present on `Download` object |

### File Upload
| Test | What it checks |
|------|---------------|
| Uploading a .dat file succeeds and appears in table | `sodium.dat` appears in the table within 10 seconds |
| Upload only accepts allowed file extensions | **`public/test0fail-upload.mp4`** — synthetic **drop** on inner drop zone; **MUI Alert** (`role="alert"`) with full allowed-extension list; **Cancel** closes without uploading |

### File Rename
| Test | What it checks |
|------|---------------|
| Clicking the edit icon opens the rename dialog | Clicking the edit icon opens a dialog |
| Renaming a file without an extension shows an error message | "Missing file extension" error message appears |
| Renaming a file with a changed extension shows a confirmation dialog | "Changing file extension" warning dialog appears |

### File Delete
| Test | What it checks |
|------|---------------|
| Selecting a file and clicking Delete opens a confirmation dialog | "Please confirm that you are deleting" dialog appears |
| Cancelling the delete confirmation keeps the file in the table | File remains in the table after cancelling |
| Confirming delete removes the file from the table | After confirm, one fewer row for the selected file name |

---

## `setup.spec.ts`
**Purpose:** Comprehensive validation of the Setup page — all analysis methods, reconstruction methods, and their configuration options.

> **Key implementation notes:**
> - `selectAnalysisMethod()` uses a UI proxy instead of `toBeChecked()` (both RadioGroups share `name="row-radio-buttons-group"`, causing native browser conflicts). Proxy: GRAPPA not visible = Analytic; ESPIRIT visible = Multiple Replica (no noise); GRAPPA visible = PMR/GPR.
> - `selectReconMethod()` similarly uses "No Flip Angle Correction" visibility (10 s timeout) as proxy.
> - All `getByText()` visibility assertions use `.first()` to avoid strict-mode violations from ancestor elements matching the same text.
> - ACL (Autocalibration Lines) min=2 tests first uncheck "Use All Lines for Autocalibration" because it is **checked by default** (Redux `acl = [null, null]` on init and on every "Decimate Data" toggle).
> - **BrainSingleSlice job queue → Results (serial)** — under **Analytic Method**, RSS, four B1 completion tests, and **two** **Analytic SENSE** jobs (Decimate on + either **Use All Lines** checked, or unchecked with **ACL = 24** from `Setup.tsx` `setDecimateACL(24)`) share one `test.describe` with `test.describe.configure({ mode: "serial" })` so they never run in parallel against the backend. Each calls `selectReconMethod` at the start (they are no longer inside the RSS / B1 / SENSE reconstruction `describe` blocks).
> - **RSS / B1 / SENSE BrainSingleSlice → Results**: `test.setTimeout(330_000)` (~5.5 min); **Job successfully queued!** (5 s); then up to **300_000 ms** for a **completed** row; `goToResultsTabAndExpandJobResults`; skips if library pair missing. **SENSE** variants: **Use All Lines** on → ACL disabled; **Use All Lines** off → ACL spinbutton **`24`** and enabled. **Predefined Mask** E2E uses **`b1-weighted-predefined-mask.nii`** when present. **Set Job Name** aliases include `…-SENSE-Decimate-ACL24-…`, `…-SENSE-Decimate-UseAllACL-…`, etc. (`<n>` = `1`, `2`, `3`, …).

### Queue Job preflight validation
| Test | What it checks |
|------|---------------|
| Signal and noise both missing (Analytic) | **Queue Job** → `Set Up Validation Failed` + “Please select or upload signal and noise files.” → **OK** closes dialog |
| Signal missing, noise present (Analytic) | Selects **`BrainSingleSliceNoise.dat`** from library (skips if missing); **Queue Job** → “Please select or upload signal file.” → **OK** |
| Noise missing, signal present, non-multi-raid (Analytic) | Selects **`BrainSingleSliceSignal.dat`** only (skips if missing); **Queue Job** → separate noise file message → **OK** |
| Flip angle correction on, no FA map (Multiple Replica) | **`BrainSingleSliceSignal.dat`** only (skips if missing); uncheck **No Flip Angle Correction**; **Queue Job** → FA map message → **OK** |
| Predefined Mask, no mask file (Analytic + B1) | Signal **`nth(0)`** + noise **first remaining Choose** (after signal, only noise has **Choose**); **B1 Weighted** → **Predefined Mask**, no mask file; **Queue Job** → mask message → **OK** |

### Queue Job — SENSE decimation warning
| Test | What it checks |
|------|---------------|
| SENSE + Decimate Data unchecked | Canonical signal/noise `.dat`; **SENSE**; ensure **Decimate Data** off; **Queue Job** → **Warning** dialog (prospective undersampling copy) → **Keep Editing** closes it |

### Analysis Method Radio Buttons
| Test | What it checks |
|------|---------------|
| all four analysis method labels are present | Analytic Method, Multiple Replica, Pseudo Multiple Replica, Generalized Pseudo-Replica labels present |

### Analytic Method
| Test | What it checks |
|------|---------------|
| Available reconstruction methods | RSS, B1 Weighted, SENSE visible; GRAPPA and ESPIRIT not rendered |
| **RSS:** No Flip Angle Correction checkbox toggles | Checkbox visible and toggleable |
| **RSS:** Save .mat file checkbox | Checkbox visible |
| **RSS:** No Coil Sensitivities or g Factor | These options do not appear for RSS |
| **RSS:** No Object Masking | Section does not appear for RSS |
| **`queues Analytic RSS job with BrainSingleSlice signal+noise and sees completion on Results`** | In **BrainSingleSlice job queue → Results (serial)**; **selectReconMethod**(RSS); then same queue / Results flow as before; **300 s** / **330 s** timeouts |
| **B1 Weighted:** No Flip Angle + Save .mat + Save Coil Sensitivities | All three checkboxes visible |
| **B1 Weighted:** No g Factor | Not shown for B1 |
| **`Object Masking — shows section with all four options`** | Do Not Mask Coil Sensitivities Maps, Keep Pixels Above %, ESPIRiT, Predefined Mask labels visible |
| **`Object Masking — Do Not Mask Coil Sensitivities Maps is selectable`** | Radio selects and **toBeChecked** |
| **`Object Masking — Keep Pixels Above % reveals threshold input with min=1`** | Spinbutton visible; cannot enter negative or zero |
| **`Object Masking — Use Mask from ESPIRiT reveals k, r, t, c inputs`** | Four spinbuttons visible |
| **`Object Masking — Predefined Mask reveals file upload button`** | **Choose or Upload Mask** visible |
| **`queues Analytic B1 Weighted job with BrainSingleSlice signal+noise (Do Not Mask Coil Sensitivities Maps, Save Coil Sensitivities) and sees completion on Results`** | Serial group; **selectReconMethod**(B1); **Do Not Mask** + **Save Coil Sensitivities**; alias prefix **…-DoNotMask-…**; same queue / Results flow |
| **`queues Analytic B1 Weighted job with BrainSingleSlice signal+noise (Keep Pixels Above 10% default, Save Coil Sensitivities) and sees completion on Results`** | Serial group; **Keep Pixels Above** radio; spinbutton **`10`** (default); **Save Coil Sensitivities**; alias **…-KeepPixels10pct-…**; same queue / Results flow |
| **`queues Analytic B1 Weighted job with BrainSingleSlice signal+noise (Use Mask from ESPIRiT default k/r/t/c, Save Coil Sensitivities) and sees completion on Results`** | Serial group; **Use Mask from ESPIRiT** radio; four spinbuttons **8 / 24 / 0.01 / 0.995**; **Save Coil Sensitivities**; alias **…-ESPIRiTmask-defaults-…**; same queue / Results flow |
| **`queues Analytic B1 Weighted job with BrainSingleSlice signal+noise (Predefined Mask b1-weighted-predefined-mask.nii from library, Save Coil Sensitivities) and sees completion on Results`** | Serial group; **Predefined Mask** + **Choose or Upload Mask** → library **`b1-weighted-predefined-mask.nii`** (`trySelectPredefinedMaskFromLibrary`); **Save Coil Sensitivities**; alias **…-PredefinedMask-…** |
| **`queues Analytic SENSE job with BrainSingleSlice signal+noise (Decimate Data on, Use All Lines for Autocalibration) and sees completion on Results`** | Serial group; **selectReconMethod**(SENSE); **Decimate Data** checked; **Use All Lines for Autocalibration** checked; ACL spinbutton **disabled**; alias **…-SENSE-Decimate-UseAllACL-…**; queue / Results same as RSS |
| **`queues Analytic SENSE job with BrainSingleSlice signal+noise (Decimate Data on, Autocalibration Lines 24 — Use All Lines unchecked) and sees completion on Results`** | Serial group; **Use All Lines** unchecked (`setDecimateACL(24)` in **Setup.tsx**); ACL spinbutton **enabled**, value **`24`**; alias **…-SENSE-Decimate-ACL24-…** |
| **SENSE:** No Flip Angle + Save .mat + Coil Sensitivities + g Factor | All checkboxes visible |
| **SENSE:** Object Masking visible | Section appears for SENSE |
| **SENSE:** Decimate Data checkbox | Visible and accessible |
| **SENSE:** Decimate Data — Acceleration Factor X/Y min = 1 | Cannot enter 0 or negative |
| **SENSE:** Autocalibration Lines min = 2 | "Use All Lines" unchecked first to enable input; cannot enter 0 or 1 |
| **SENSE:** "Use All Lines" disables ACL input | Checked by default; unchecking re-enables; rechecking disables again |

### Multiple Replica
| Test | What it checks |
|------|---------------|
| Only RSS + ESPIRIT available (no noise file) | B1, SENSE, GRAPPA not shown; ESPIRIT present but disabled |
| RSS config matches Analytic RSS | No Flip Angle, Save .mat, no Coil Sensitivities, no g Factor, no Masking |
| **`queues Multiple Replica RSS job with Phantom100Replicas.dat signal only and sees completion on Results`** | **`Phantom100Replicas.dat`** via first **Choose** (no separate noise); **Setup Preview** → **Queue Job**; alias **`E2E-MultipleReplica-RSS-Phantom100Replicas-<n>`**; **Results** → **completed**; skips if file missing; **330 s** / **300 s** timeouts (not in Analytic serial block — may run parallel to other queue tests) |
| **`queues Multiple Replica RSS job with BrainMultiSliceSignal.dat and BrainMultiSliceNoise.dat and sees completion on Results`** | Matched brain multi-slice pair (`trySelectBrainMultiSlicePairForPreflight`); alias **`E2E-MultipleReplica-RSS-BrainMultiSlice-<n>`**; same queue / Results flow; skips if either `.dat` missing |

### Pseudo Multiple Replica (PMR)
| Test | What it checks |
|------|---------------|
| Number of Pseudo Replica input — min = 2 | Cannot enter 0 or 1; valid integer accepted (10 s timeout on first visibility check) |
| All 4 reconstruction methods available | RSS, B1, SENSE, GRAPPA all visible; ESPIRIT disabled |
| **RSS:** Same config as Analytic RSS | No Coil Sensitivities, no g Factor |
| **B1:** Has Coil Sensitivities + Object Masking, no g Factor | Correct options shown |
| **SENSE:** Has all B1 options + g Factor + Decimate Data | Full SENSE config visible (10 s timeout on first check) |
| **GRAPPA:** Kernel Size X/Y min = 1 | Cannot enter 0 or negative |
| **GRAPPA:** Decimate Data with acceleration constraints | AF X/Y min=1; ACL min=2 (uncheck "Use All Lines" first) |
| **GRAPPA:** "Use All Lines" disables ACL | Toggle disables/re-enables ACL input |
| **GRAPPA:** No Object Masking | Section does not appear (10 s timeout to allow React re-render) |
| **GRAPPA:** No Coil Sensitivities or g Factor | These options do not appear |

### Generalized Pseudo-Replica (GPR)
| Test | What it checks |
|------|---------------|
| Cubic VOI Size input — min = 2 | Cannot enter 0 or 1; valid value accepted |
| Number of Pseudo Replica — min = 2, max = 10 | Cannot exceed 10 for GPR (10 s timeout on first visibility check) |
| Same reconstruction methods as PMR | RSS, B1, SENSE, GRAPPA all available |
| **RSS/B1/SENSE/GRAPPA:** Same configs as PMR equivalents | Mirrors PMR behavior |
| **Object Masking (B1):** All 4 masking options work correctly | Matches Analytic B1 Weighted behavior; ESPIRiT k/r/t/c enforce min=0 |
| **Decimate Data (SENSE):** AF X/Y min=1, ACL min=2 | ACL: uncheck "Use All Lines" first; same constraints as PMR SENSE |
| **Decimate Data (SENSE):** "Use All Lines" disables ACL | Toggle behavior verified |

### Reset Button
| Test | What it checks |
|------|---------------|
| Reset clears all settings | After selecting PMR + GRAPPA, clicking Reset allows SNR panel to reopen |

---

## `results.spec.ts`
**Purpose:** Comprehensive validation of the Results page — job table, viewer, ROI tools, and drawing toolkit.

### Job Results Panel
| Test | What it checks |
|------|---------------|
| Panel visible with correct columns | Job ID, Alias, Date Submitted, Status, Actions |
| Auto Refreshing checkbox toggles | Can be checked/unchecked |
| Refresh button is clickable | Visible, enabled, does not crash on click |
| Job table renders without console errors | No critical JS errors while table loads |
| Completed job has Play, Download, Delete buttons | Action icons visible on completed rows |
| Pending job has disabled play button | Shows spinner or disabled button |
| Delete button opens confirmation dialog | Dialog with confirm/cancel appears; cancel closes it |

### View Results Panel
| Test | What it checks |
|------|---------------|
| Shows "Please Select a Job Result" when empty | Default state message visible |
| NiiVue canvas renders when job is loaded | Canvas element visible after loading a job |
| "Opened Volume" dropdown lists volumes | Dropdown opens without error |
| "Orientation" dropdown has all 5 options | Axial, Coronal, Sagittal, Multi, 3D — each selectable |
| "Scroll and Right Click" dropdown has all drag modes | Pan and Zoom, Slice and Measurement, Contrast, Slice and None |
| "Display Mode" dropdown available | At least "Absolute" option visible |
| "ROI Layer" dropdown available | Dropdown opens without error |
| Neurological switch toggles | Switch state changes on click |
| Show Crosshair switch toggles | Switch state changes on click |
| Show Color Bar switch toggles | Switch state changes on click |
| Labels Visible switch toggles | Switch state changes on click |
| Reset Views button clickable | Enabled and responds to click |
| Recenter Views button clickable | Enabled and responds to click |
| Reset Zooms button clickable | Enabled and responds to click |
| Reset Contrast button clickable | Enabled and responds to click |
| Zoom In / Zoom Out buttons clickable | Both enabled and respond to clicks |
| Save Drawing Layer button visible | Visible and enabled |
| Settings gear icon opens settings | Clicking opens settings panel |

### Current Job Settings Panel
| Test | What it checks |
|------|---------------|
| Shows "Please Select a Job Result" when empty | Default state message visible |
| Displays Number of Slices label | Label visible after loading a job |
| Displays SNR Analysis Method with value | Known method name is visible |
| Displays Image Reconstruction Method with value | Known recon method name is visible |
| Displays Flip Angle Correction status | True or False value shown |
| Displays Pseudo Replica count (conditional) | Only shown for PMR/GPR jobs |
| Displays Cubic VOI Size (conditional) | Only shown for GPR jobs |
| Displays Kernel Size (conditional) | Only shown for GRAPPA jobs |
| Displays Decimate Data status (conditional) | Only shown for SENSE/GRAPPA jobs |
| Settings panel is read-only | No editable inputs in the inspection panel |

### ROI Table
| Test | What it checks |
|------|---------------|
| ROI table columns visible | ROI Label, Color, Mean, SD, Visibility, Voxel Count |
| Toolbar has Group, Ungroup, Download, Delete buttons | All visible and enabled |
| Group button warns when no ROI selected | "Please select an ROI" warning appears |
| Ungroup button warns when no ROI selected | Warning appears |
| Download button warns when no ROI selected | Warning appears |
| Delete button warns when no ROI selected | Warning appears |
| ROI upload button is present | Upload button visible in toolbar |

### Drawing Toolkit
| Test | What it checks |
|------|---------------|
| Paint brush button toggleable | Click enables drawing; click again disables |
| Eraser button visible | AutoFixNormal icon present |
| Undo button visible | Reply icon present |
| Screenshot button visible | CameraAlt icon present |
| Opacity slider available | Clicking Opacity icon shows a slider |
| Visibility toggle available | Visibility icon click responds without error |

### Contrast Range Slider
| Test | What it checks |
|------|---------------|
| Min/max range sliders rendered | At least one slider visible after loading a job |

### NiiVue Slice Controls
| Test | What it checks |
|------|---------------|
| Slice position inputs (X, Y, Z) rendered | Location table visible after loading a job |
| Gamma slider available | Slider visible next to Gamma label |

---

## Test Count Summary

| File | Tests |
|------|-------|
| `auth.setup.ts` | 1 (storage-state setup) |
| `login.spec.ts` | 2 |
| `home.full.spec.ts` | 17 |
| `setup.spec.ts` | 68 |
| `results.spec.ts` | 51 |
| **Total** | **139** |
