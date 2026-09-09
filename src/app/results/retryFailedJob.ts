import axios from "axios";
import { Job } from "cloudmr-ux/core/features/jobs/jobsSlice";
import { UploadedFile } from "cloudmr-ux/core/features/data/dataSlice";
import { AuthenticatedHttpClient } from "cloudmr-ux/core/common/utilities/AuthenticatedRequests";
import { SNR, setupSetters } from "../../features/setup/setupSlice";
import type { AppDispatch } from "../../features/store";

const DEFAULT_OUTPUT = {
  coilsensitivity: false,
  gfactor: false,
  matlab: true,
};

function asObject(raw: unknown): any {
  if (raw == null) return undefined;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw.trim());
    } catch {
      return undefined;
    }
  }
  if (typeof raw === "object") return raw;
  return undefined;
}

function asArrayBuffer(data: unknown): ArrayBuffer | undefined {
  if (!data) return undefined;
  if (data instanceof ArrayBuffer) return data.byteLength ? data : undefined;
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    if (!view.byteLength) return undefined;
    return view.buffer.slice(
      view.byteOffset,
      view.byteOffset + view.byteLength,
    ) as ArrayBuffer;
  }
  return undefined;
}

function isFileish(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === "string") return value.length > 0;
  if (typeof value !== "object") return false;
  const obj = value as any;
  return !!(
    obj.options?.filename ||
    obj.options?.key ||
    obj.filename ||
    obj.fileName ||
    obj.key ||
    obj.id != null
  );
}

/** True when this object can fill Set Up (not just token/pipelineid/alias). */
function looksLikeSNR(obj: any): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const node = obj.options?.reconstructor
    ? obj
    : obj.task?.options?.reconstructor
      ? obj.task
      : obj;
  if (node.options?.reconstructor) return true;
  if (isFileish(node.options?.signal) || isFileish(node.signal)) return true;
  if (isFileish(node.options?.noise) || isFileish(node.noise)) return true;
  return false;
}

function unwrapSNR(obj: any): any {
  if (obj?.task && looksLikeSNR(obj.task)) return obj.task;
  return obj;
}

/**
 * Same JSON Current Job Settings uses: `headers.options` from info.json
 * (loadResult stores that as `setup.task`). Search the rest of the document
 * if that node is only metadata.
 */
function findSNR(raw: unknown, depth = 0): any | undefined {
  const obj = asObject(raw);
  if (!obj || depth > 10) return undefined;

  const preferred = obj.headers?.options;
  if (looksLikeSNR(preferred)) return unwrapSNR(preferred);
  if (looksLikeSNR(obj)) return unwrapSNR(obj);
  if (looksLikeSNR(obj.options)) return unwrapSNR(obj.options);
  if (looksLikeSNR(obj.task)) return unwrapSNR(obj.task);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findSNR(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findSNR(value, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

function downloadableResultFiles(job: Job): UploadedFile[] {
  return (job.files ?? []).filter(
    (file) => file?.link && file.link !== "unknown",
  );
}

/**
 * Same download as the Results "Download" button: save each job result file
 * from `file.link`.
 */
export function downloadJobResultFiles(job: Job) {
  downloadableResultFiles(job).forEach((file) => {
    const url = file.link;
    const a = document.createElement("a");
    a.download = `${file.fileName}.${url.split(".").pop()}`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

function isErrorTxtName(name: string | undefined): boolean {
  if (!name) return false;
  return name.replace(/^.*[/\\]/, "").toLowerCase() === "error.txt";
}

function isInfoJsonName(name: string | undefined): boolean {
  if (!name) return false;
  return name.replace(/^.*[/\\]/, "").toLowerCase() === "info.json";
}

function extractInfoLog(doc: any): unknown {
  if (!doc || typeof doc !== "object") return undefined;
  return (
    doc.headers?.log ??
    doc.headers?.logs ??
    doc.log ??
    doc.logs
  );
}

function formatLogEntry(entry: unknown): string {
  if (entry == null) return "";
  if (typeof entry === "string") return entry;
  if (typeof entry === "number" || typeof entry === "boolean") {
    return String(entry);
  }
  if (typeof entry === "object") {
    const item = entry as Record<string, unknown>;
    const when = item.when ?? item.time;
    const what = item.what ?? item.message ?? item.msg;
    if (when != null || what != null) {
      return [when, what].filter((part) => part != null && part !== "").join(": ");
    }
    try {
      return JSON.stringify(entry);
    } catch {
      return String(entry);
    }
  }
  return String(entry);
}

function formatInfoLogs(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") return raw.length ? raw : undefined;
  if (Array.isArray(raw)) {
    const lines = raw.map(formatLogEntry).filter((line) => line.length > 0);
    return lines.length ? lines.join("\n") : undefined;
  }
  if (typeof raw === "object") {
    const nested = extractInfoLog(raw);
    if (nested != null && nested !== raw) {
      return formatInfoLogs(nested);
    }
    const line = formatLogEntry(raw);
    return line.length ? line : undefined;
  }
  return String(raw);
}

export type JobLogSources = {
  errorTxt?: string;
  infoLogText?: string;
};

async function jobLogsFromBuffer(buffer: ArrayBuffer): Promise<JobLogSources> {
  const sources: JobLogSources = {};
  const bytes = new Uint8Array(buffer);
  const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (isZip) {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buffer);
      for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue;
        const name = entry.name.replace(/^.*[/\\]/, "").toLowerCase();
        if (name === "error.txt") {
          sources.errorTxt = await entry.async("string");
        } else if (name === "info.json") {
          const parsed = parseJsonText(await entry.async("string"));
          sources.infoLogText = formatInfoLogs(extractInfoLog(parsed));
        }
      }
    } catch (e) {
      console.error("Logs: JSZip failed while reading job logs", e);
    }
    return sources;
  }
  return sources;
}

/**
 * Fetch `error.txt` and `info.json` `log` entries from a job's result files.
 */
export async function fetchJobLogSources(job: Job): Promise<JobLogSources> {
  const combined: JobLogSources = {};
  for (const file of downloadableResultFiles(job)) {
    const buffer = await fetchDownloadedZip(file.link);
    if (!buffer) continue;
    if (isErrorTxtName(file.fileName) && combined.errorTxt == null) {
      combined.errorTxt = new TextDecoder().decode(buffer);
      continue;
    }
    if (isInfoJsonName(file.fileName) && combined.infoLogText == null) {
      combined.infoLogText = formatInfoLogs(
        extractInfoLog(parseJsonText(new TextDecoder().decode(buffer))),
      );
      continue;
    }
    const fromZip = await jobLogsFromBuffer(buffer);
    if (combined.errorTxt == null && fromZip.errorTxt != null) {
      combined.errorTxt = fromZip.errorTxt;
    }
    if (combined.infoLogText == null && fromZip.infoLogText != null) {
      combined.infoLogText = fromZip.infoLogText;
    }
    if (combined.errorTxt != null && combined.infoLogText != null) break;
  }
  return combined;
}

/**
 * Fetch `error.txt` from a job's result files (zip contents or a standalone file).
 * Returns `undefined` when the file is missing or could not be read.
 */
export async function fetchJobErrorTxt(job: Job): Promise<string | undefined> {
  const sources = await fetchJobLogSources(job);
  return sources.errorTxt;
}

async function fetchDownloadedZip(
  url: string,
): Promise<ArrayBuffer | undefined> {
  try {
    const res = await fetch(url, {
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      if (buf?.byteLength) return buf;
    }
  } catch (e) {
    console.error("Retry: fetch of result file failed", e);
  }

  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 120000,
      withCredentials: false,
    });
    const buf = asArrayBuffer(response.data);
    if (buf) return buf;
  } catch (e) {
    console.error("Retry: axios GET of result file failed", e);
  }

  try {
    const response = await AuthenticatedHttpClient.request({
      method: "GET",
      url,
      responseType: "arraybuffer",
      timeout: 120000,
    });
    const buf = asArrayBuffer((response as any).data);
    if (buf) return buf;
  } catch (e) {
    console.error("Retry: authenticated GET of result file failed", e);
  }

  return undefined;
}

function parseJsonText(text: string): any | undefined {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

async function documentsFromBuffer(buffer: ArrayBuffer): Promise<any[]> {
  const bytes = new Uint8Array(buffer);
  const documents: any[] = [];

  const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (isZip) {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buffer);
      const entries = Object.values(zip.files)
        .filter((entry) => !entry.dir && /\.json$/i.test(entry.name))
        .sort((a, b) => {
          const an = a.name.replace(/^.*\//, "").toLowerCase();
          const bn = b.name.replace(/^.*\//, "").toLowerCase();
          if (an === "info.json") return -1;
          if (bn === "info.json") return 1;
          return 0;
        });
      for (const entry of entries) {
        const parsed = parseJsonText(await entry.async("string"));
        if (parsed) documents.push(parsed);
      }
    } catch (e) {
      console.error("Retry: JSZip failed", e);
    }
  }

  const asText = parseJsonText(new TextDecoder().decode(buffer));
  if (asText) documents.push(asText);
  return documents;
}

function extractSlices(info: any): number | undefined {
  const raw =
    info?.info?.slices ??
    info?.headers?.info?.slices ??
    info?.slices;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Read SNR setup from a job's result zip / info.json (same source Current
 * Job Settings uses after a successful loadResult). Falls back to job.setup.
 */
export async function loadJobSetupFromResult(
  job: Job,
): Promise<{ task: any; slices?: number; infoJson?: any } | undefined> {
  let infoJson: any;
  let snr: any;

  for (const file of downloadableResultFiles(job)) {
    const buffer = await fetchDownloadedZip(file.link);
    if (!buffer) continue;
    const documents = await documentsFromBuffer(buffer);
    for (const document of documents) {
      const found = findSNR(document);
      if (found) {
        infoJson = document;
        snr = found;
        break;
      }
    }
    if (snr) break;
  }

  if (!snr) {
    snr = findSNR(job.setup) ?? findSNR(job);
  }
  if (!snr || !looksLikeSNR(snr)) {
    return undefined;
  }
  return {
    task: snr,
    slices: extractSlices(infoJson) ?? job.slices,
    infoJson,
  };
}

function extractOutput(info: any, snr: any) {
  const nested =
    info?.output ??
    info?.headers?.output ??
    info?.headers?.options?.output ??
    snr?.output;
  return {
    coilsensitivity: !!nested?.coilsensitivity,
    gfactor: !!(
      nested?.gfactor ??
      snr?.options?.reconstructor?.options?.gfactor ??
      DEFAULT_OUTPUT.gfactor
    ),
    matlab: nested?.matlab !== false,
  };
}

/**
 * Silently fetch the failed job's result zip, unzip it in the browser,
 * read info.json, and populate Set Up. Does not save a file to disk.
 */
export async function retryFailedJob(
  job: Job,
  dispatch: AppDispatch,
  uploadedFiles: UploadedFile[],
): Promise<boolean> {
  const loaded = await loadJobSetupFromResult(job);
  if (!loaded) {
    return false;
  }
  const snr = loaded.task;
  const infoJson = loaded.infoJson;

  dispatch(
    setupSetters.loadSNRSettings({
      SNR: snr as SNR,
      output: extractOutput(infoJson, snr),
      uploadedFiles,
    }),
  );
  applyComputingUnit(infoJson, snr, job, dispatch);
  return true;
}

function applyComputingUnit(
  info: any,
  snr: any,
  job: Job,
  dispatch: AppDispatch,
) {
  const annotated = snr as SNR & { computing_unit_id?: string; mode?: string };
  const jobWithUnit = job as Job & { computing_unit_id?: string; mode?: string };
  const computingUnitId =
    info?.computing_unit_id ??
    info?.headers?.options?.computing_unit_id ??
    annotated.computing_unit_id ??
    jobWithUnit.computing_unit_id;
  const mode =
    info?.mode ??
    info?.headers?.options?.mode ??
    annotated.mode ??
    jobWithUnit.mode ??
    "";
  if (computingUnitId) {
    dispatch(
      setupSetters.setSelectedComputingUnit({
        id: String(computingUnitId),
        mode: String(mode),
      }),
    );
  }
}
