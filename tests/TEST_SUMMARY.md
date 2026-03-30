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
| Shows Mode 2 Computing Units panel (conditional) | Only checks if user has Mode 2 units; skips gracefully otherwise |
| Calculation Counts loads a numeric value | Loading spinner disappears, Mode 1 count label appears |

### Uploaded Data Table
| Test | What it checks |
|------|---------------|
| Shows correct column headers | File Name, Date Submitted, Status, Edit File Name columns visible |
| Delete button disabled when nothing selected | Delete button is disabled by default |
| Download button disabled when nothing selected | Download button is disabled by default |
| Buttons enable after selecting a file | Checking a row enables both Delete and Download |

### File Upload
| Test | What it checks |
|------|---------------|
| Uploading a `.nii` file is rejected | `hippo.nii` does not appear in the table after upload attempt |
| Uploading a `.dat` file succeeds | `sodium.dat` appears in the table within 10 seconds |

### File Rename
| Test | What it checks |
|------|---------------|
| Edit icon opens rename dialog | Clicking the edit icon opens a dialog |
| Rename without extension shows error | "Missing file extension" error message appears |
| Rename with changed extension shows confirmation | "Changing file extension" warning dialog appears |

### File Delete
| Test | What it checks |
|------|---------------|
| Delete opens confirmation dialog | "Please confirm that you are deleting" dialog appears |
| Cancelling delete keeps the file | File remains in the table after cancelling |

---

## `setup.spec.ts`
**Purpose:** Comprehensive validation of the Setup page — all analysis methods, reconstruction methods, and their configuration options.

> **Key implementation notes:**
> - `selectAnalysisMethod()` uses a UI proxy instead of `toBeChecked()` (both RadioGroups share `name="row-radio-buttons-group"`, causing native browser conflicts). Proxy: GRAPPA not visible = Analytic; ESPIRIT visible = Multiple Replica (no noise); GRAPPA visible = PMR/GPR.
> - `selectReconMethod()` similarly uses "No Flip Angle Correction" visibility (10 s timeout) as proxy.
> - All `getByText()` visibility assertions use `.first()` to avoid strict-mode violations from ancestor elements matching the same text.
> - ACL (Autocalibration Lines) min=2 tests first uncheck "Use All Lines for Autocalibration" because it is **checked by default** (Redux `acl = [null, null]` on init and on every "Decimate Data" toggle).

### Analysis Method Radio Buttons
| Test | What it checks |
|------|---------------|
| All four methods are visible | Analytic Method, Multiple Replica, Pseudo Multiple Replica, Generalized Pseudo-Replica labels present |

### Analytic Method
| Test | What it checks |
|------|---------------|
| Available reconstruction methods | RSS, B1 Weighted, SENSE visible; GRAPPA and ESPIRIT not rendered |
| **RSS:** No Flip Angle Correction checkbox toggles | Checkbox visible and toggleable |
| **RSS:** Save .mat file checkbox | Checkbox visible |
| **RSS:** No Coil Sensitivities or g Factor | These options do not appear for RSS |
| **RSS:** No Object Masking | Section does not appear for RSS |
| **B1 Weighted:** No Flip Angle + Save .mat + Save Coil Sensitivities | All three checkboxes visible |
| **B1 Weighted:** No g Factor | Not shown for B1 |
| **B1 Weighted:** Object Masking section with all 4 options | Do Not Mask, Keep Pixels Above %, ESPIRiT, Predefined Mask |
| **B1 Weighted:** Keep Pixels Above % — min threshold = 1 | Cannot enter negative or zero values |
| **B1 Weighted:** ESPIRiT — 4 inputs (k, r, t, c) all ≥ 0 | 4 spinbuttons visible; `min={0}` enforced in code, negative values rejected |
| **B1 Weighted:** Predefined Mask — file upload available | Upload button visible, can upload `.nii` file |
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
| `auth.setup.ts` | 1 |
| `login.spec.ts` | 2 |
| `home.full.spec.ts` | 16 |
| `setup.spec.ts` | ~45 |
| `results.spec.ts` | ~44 |
| **Total** | **~108** |
