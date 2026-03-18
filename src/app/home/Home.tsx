import { Fragment, useEffect, useState } from "react";
import { CLOUDMR_SERVER } from "../../env";

// Normalize token helper (handles several shapes we've seen in the codebase)
function normalizeToken(t: any) {
  if (!t) return null;
  if (typeof t === "string") return t;
  if (typeof t === "object") {
    if (typeof t.id_token === "string") return t.id_token;
    if (typeof t.accessToken === "string") return t.accessToken;
    if (typeof t.token === "string") return t.token;
    if (t.data && typeof t.data === "object") {
      if (typeof t.data.id_token === "string") return t.data.id_token;
      if (typeof t.data.accessToken === "string") return t.data.accessToken;
      if (typeof t.data.token === "string") return t.data.token;
    }
  }
  return null;
}

// Fetch calculation count using provided token and server URL
async function fetchCalculationCount(
  appName: string,
  mode: string,
  token: any,
  apiServer = CLOUDMR_SERVER,
) {
  const tokenStr = normalizeToken(token);
  if (!tokenStr) throw new Error("Authentication token not found or in unknown shape. Please login.");
  const params = new URLSearchParams({ cloudapp_name: appName, mode });
  const base = apiServer.replace(/\/$/, "");
  const url = `${base}/pipeline/count_calculations?${params.toString()}`;
  const resp = await fetch(url, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenStr}` },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error: ${resp.status} - ${text}`);
  }
  return resp.json();
}
// Helper: extract numeric count from various response shapes
function extractCount(resp: any): number {
  if (resp == null) return 0;
  if (typeof resp === "number") return resp;
  if (typeof resp.count === "number") return resp.count;
  if (resp.data && typeof resp.data.count === "number") return resp.data.count;
  if (resp.results && typeof resp.results.count === "number") return resp.results.count;
  return 0;
}

// Helper: normalize computing unit list from different payload shapes
function normalizeUnitsPayload(payload: any, mode?: string): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.computingUnits)) return payload.computingUnits;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (mode && Array.isArray(payload[mode])) return payload[mode];
  if (Array.isArray(payload.mode_1) || Array.isArray(payload.mode_2)) {
    return Array.isArray(payload[mode ?? "mode_1"]) ? payload[mode ?? "mode_1"] : [];
  }
  return [];
}

// Fetch available computing units for a given mode
async function fetchComputingUnits(
  appName: string,
  mode: string,
  token: any,
  apiServer = CLOUDMR_SERVER,
) {
  const tokenStr = normalizeToken(token);
  if (!tokenStr) throw new Error("Authentication token not found or in unknown shape. Please login.");
  // Note: correct endpoint is /api/computing-unit/list and parameter name is `app_name`
  const params = new URLSearchParams({ app_name: appName, mode });
  const base = apiServer.replace(/\/$/, "");
  // CLOUDMR_SERVER already contains the `/api` prefix in this project, so append the path
  const url = `${base}/computing-unit/list?${params.toString()}`;
  const resp = await fetch(url, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenStr}` },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error: ${resp.status} - ${text}`);
  }
  return resp.json();
}
import "./Home.scss";
import { CmrTable, CmrCollapse, CmrPanel } from "cloudmr-ux";
import { useAppDispatch, useAppSelector } from "../../features/hooks";
import { UploadedFile } from "cloudmr-ux/core/features/data/dataSlice";
import {
  deleteUploadedData,
  getUploadedData,
  renameUploadedData,
} from "cloudmr-ux/core/features/data/dataActionCreation";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import GetAppIcon from "@mui/icons-material/GetApp";
import DeleteIcon from "@mui/icons-material/Delete";
import { CmrNameDialog } from "cloudmr-ux";
import {
  deleteUpstreamJob,
  getUpstreamJobs,
} from "cloudmr-ux/core/features/jobs/jobActionCreation";
import { uploadData } from "cloudmr-ux/core/features/data/dataActionCreation";
import { CmrConfirmation } from "cloudmr-ux";
import { Button, CircularProgress, Box, Typography, Alert, Card, CardContent, CardHeader, CardActions, Tooltip } from "@mui/material";
import { GridRowSelectionModel } from "@mui/x-data-grid";
import { CMRUpload, LambdaFile } from "cloudmr-ux";
import { AxiosRequestConfig } from "axios";
import { uploadHandlerFactory } from "cloudmr-ux/core/common/utilities/SystemUtilities";
const Home = () => {
  // Calculation count state
  const [counts, setCounts] = useState<{ mode_1: number | null; mode_2: number | null }>({
    mode_1: null,
    mode_2: null,
  });
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [errorCounts, setErrorCounts] = useState<string | null>(null);
  // Computing units state
  const [units, setUnits] = useState({ mode_1: [] as any[], mode_2: [] as any[] });

  const getUnitId = (u: any, idx: number) =>
    String(u?.computingUnitId ?? u?.computing_unit_id ?? u?.id ?? u?.appId ?? u?.name ?? idx);

  const getUnitTitle = (u: any, idx: number) =>
    String(u?.referenceCode ?? u?.alias ?? u?.name ?? u?.label ?? getUnitId(u, idx));

  async function deleteComputingUnit(appName: string, unit: any) {
    if (!apiToken) throw new Error("No authentication token found. Please login.");
    const tokenStr = normalizeToken(apiToken);
    if (!tokenStr) throw new Error("Authentication token not found or in unknown shape. Please login.");

    const unitId = String(unit?.computingUnitId ?? unit?.computing_unit_id ?? unit?.id ?? "");
    if (!unitId) throw new Error("Could not determine computing unit id.");

    const base = CLOUDMR_SERVER.replace(/\/$/, "");
    const url = `${base}/computing-unit/delete`;

    // Be permissive with payload keys because shapes differ across apps/environments
    const body = {
      computingUnitId: unitId,
      computing_unit_id: unitId,
      id: unitId,
      app_name: appName,
      mode: "mode_2",
    };

    const resp = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenStr}` },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Delete failed: ${resp.status} - ${text}`);
    }
    try { return await resp.json(); } catch { return null; }
  }


  // Get token from Redux (prefer logged_in_token, fallback to accessToken)
  const { logged_in_token, accessToken } = useAppSelector((state) => state.authenticate);
  const apiToken = logged_in_token || accessToken;

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      setLoadingCounts(true);
      setErrorCounts(null);
      try {
        const appName = "MR Optimum"; // Change if needed
        const [res1, res2, units1, units2] = await Promise.all([
          fetchCalculationCount(appName, "mode_1", apiToken),
          fetchCalculationCount(appName, "mode_2", apiToken),
          fetchComputingUnits(appName, "mode_1", apiToken),
          fetchComputingUnits(appName, "mode_2", apiToken),
        ]);
        if (!cancelled) {
          // Extract counts robustly
          const c1 = extractCount(res1);
          const c2 = extractCount(res2);
          setCounts({ mode_1: c1, mode_2: c2 });

          // Normalize units payloads (support several API shapes)
          const n1 = normalizeUnitsPayload(units1, "mode_1");
          const n2 = normalizeUnitsPayload(units2, "mode_2");
          setUnits({ mode_1: n1, mode_2: n2 });
        }
      } catch (e: any) {
        if (!cancelled) setErrorCounts(e?.message || String(e));
      } finally {
        if (!cancelled) setLoadingCounts(false);
      }
    }
    if (apiToken) loadCounts();
    else setErrorCounts("No authentication token found. Please login.");
    return () => { cancelled = true; };
  }, [apiToken]);
  const renamingProxy = (originalFileName: string, newName: string, isDemoData: boolean | undefined, proxyCallback: () => void) => {
    return new Promise<boolean>((resolve) => {
      console.log("renamingProxy", { newName, isDemoData })
      let originalExt = originalFileName.split(".").pop();
      if (newName.split(".").length === 1) {
        setMessage(`Missing file extension in '${newName}'.`);
        setColor("error");
        setConfirmCallback(() => () => {
          resolve(false);
        });
        setCancelCallback(() => () => {
          resolve(false);
        });
        setOpen(true);
      } else if (newName.split(".").pop() !== originalExt) {
        let newExt = newName.split(".").pop();
        let orgExt = originalExt ?? "?";
        setMessage(`Changing file extension from ${orgExt} to ${newExt}.`);
        setColor("primary");
        setConfirmCallback(() => () => {
          proxyCallback();
          resolve(true);
        });
        setCancelCallback(() => () => {
          resolve(false);
        });
        setOpen(true);
      } else {
        proxyCallback();
        resolve(true);
      }
    });
  };
  const uploadedFilesColumns = [
    {
      headerName: "File Name",
      dataIndex: "fileName",
      field: "fileName",
      editable: true,
      flex: 1,
    },
    {
      headerName: "Date Submitted",
      dataIndex: "createdAt",
      field: "createdAt",
      flex: 1,
    },
    {
      headerName: "Status",
      dataIndex: "status",
      field: "status",
      flex: 1,
    },
    {
      field: "actions",
      headerName: "Edit File Name",
      sortable: false,
      width: 160,
      disableClickEventBubbling: true,
      renderCell: (params: any) => {
        let index = files.findIndex((row) => row.id === params.id);
        return (
          <div>
            <IconButton
              onClick={() => {
                const currentFileName = files[index].fileName;
                console.log(files[index]);
                console.log(!!files[index].is_demo_data);
                setOriginalName(currentFileName);
                setNameDialogOpen(true);
                setSelectedFileIsDemoData(isAdmin ? (!!files[index].is_demo_data) : undefined);
                setRenamingCallback(() => (newName: string, isDemoData?: boolean) => {
                  return renamingProxy(currentFileName, newName, isDemoData, () => {
                    // In case of working API
                    let dataReference = files[index];
                    //@ts-ignore
                    dispatch(
                      renameUploadedData({
                        fileId: dataReference.id,
                        newName: newName,
                        ...(isAdmin && isDemoData !== undefined && { is_demo_data: isDemoData })
                      }),
                    );
                  });
                  // In case of non-working API, change name locally
                  // dispatch(dataSlice.actions.renameData({index:index,alias:newName}));
                });
              }}
            >
              {params.row.renamingPending ? (
                <CircularProgress size={20} />
              ) : (
                <EditIcon />
              )}
            </IconButton>
            {/* Download logic here  */}
            {/* <IconButton onClick={(e) => {
                            let url = params.row.link;
                            e.stopPropagation();
                            e.preventDefault();
                            if (url == "unknown")
                                return;
                            // Create an anchor element
                            const a = document.createElement('a');
                            a.href = url;

                            console.log(params.row.fileName);

                            // Extract the file name from the URL, if possible
                            a.download = params.row.fileName;

                            // Append the anchor to the body (this is necessary to programmatically trigger the click event)
                            document.body.appendChild(a);

                            // Trigger a click event to start the download
                            a.click();

                            // Remove the anchor from the body
                            document.body.removeChild(a)
                        }}>
                            <GetAppIcon />
                        </IconButton> */}
            {/* <IconButton onClick={(e) => {
                            setName(`Deleting data`);
                            setMessage(`Please confirm that you are deleting: ${params.row.fileName}.`);
                            setColor('error');
                            setConfirmCallback(() => () => {
                                // dispatch(dataSlice.actions.deleteData({index}));
                                //@ts-ignore
                                dispatch(deleteUploadedData({ accessToken: accessToken, fileId: params.row.id }));
                            })
                            setCancelCallback(() => { });
                            setOpen(true);
                            e.stopPropagation();
                        }}>
                            {params.row.deletionPending ? <CircularProgress size={20} /> : <DeleteIcon />}
                        </IconButton> */}
          </div>
        );
      },
    },
  ];

  const dispatch = useAppDispatch();
  const { uploadToken, level, isAdmin: isAdminFlag } = useAppSelector(
    (state) => state.authenticate,
  );
  const { files } = useAppSelector((state) => state.data);
  // Demo Data checkbox should only be available for admin users
  const isAdmin = Boolean(isAdminFlag) || level === "admin";
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [renamingCallback, setRenamingCallback] = useState<
    (alias: string, isDemoData?: boolean) => Promise<boolean>
  >(async () => true);
  const [originalName, setOriginalName] = useState("");
  const [selectedFileIsDemoData, setSelectedFileIsDemoData] = useState<boolean | undefined>(undefined);

  const [name, setName] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [color, setColor] = useState<
    | "inherit"
    | "primary"
    | "secondary"
    | "success"
    | "error"
    | "info"
    | "warning"
    | undefined
  >(undefined);
  const [open, setOpen] = useState<boolean>(false);
  const [confirmCallback, setConfirmCallback] = useState<() => void>(() => { });
  const [cancelCallback, setCancelCallback] = useState<() => void>(() => { });

  const [selectedData, setSelectedData] = useState<GridRowSelectionModel>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    (async () => {
      try {
        // Attempt to load initial data; unwrap thunks where available to catch rejections
        //@ts-ignore
        const p1 = dispatch(getUploadedData());
        //@ts-ignore
        const p2 = dispatch(getUpstreamJobs());
        // Wait for both to settle; if either rejects we'll handle in catch
        await Promise.all([p1, p2]);
        console.log("dispatched");
      } catch (err) {
        console.error("Initial data load failed:", err);
        setMessage(
          "Could not load initial application data. Some features may be unavailable.",
        );
        setColor("error");
        setOpen(true);
      }
    })();
  }, []);

  const [uploadKey, setUploadKey] = useState(0);

  function downloadSelectedValues() {
    let downloadPending: UploadedFile[] = [];
    selectedData.forEach((id) => {
      for (let file of files) {
        if (file.id === id) downloadPending.push(file);
      }
    });
    console.log(selectedData);
    function downloadMultipleFiles(files: UploadedFile[]) {
      // This function creates an anchor and triggers a download
      function triggerDownload(url: string, fileName: string) {
        const anchor = document.createElement("a");
        anchor.href = url;
        console.log(url);
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }

      // Iterate over the files array
      files.forEach((file, index) => {
        // Set a timeout to space out the downloads
        setTimeout(() => {
          triggerDownload(file.link, file.fileName);
        }, index * 1000); // Delay each download by 1 second
      });
    }
    downloadMultipleFiles(downloadPending);
  }

  // --- DELETE computing unit ---
  async function deleteComputingUnitById(
    computingUnitId: string,
    token: any,
    apiServer = CLOUDMR_SERVER
  ) {
    const tokenStr = normalizeToken(token);
    if (!tokenStr) throw new Error("Authentication token not found. Please login.");

    const base = apiServer.replace(/\/$/, "");
    const url = `${base}/computing-unit/delete`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenStr}`,
      },
      body: JSON.stringify({ computingUnitId }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`API error: ${resp.status} - ${text}`);
    }
    return resp.json();
  }

  const [deletingUnitIds, setDeletingUnitIds] = useState<Record<string, boolean>>({});
  // --- end ---
  
  return (
    <Fragment>
      {/* Calculation counts display */}
      <CmrCollapse
        accordion={false}
        defaultActiveKey={[0]}
        expandIconPosition="right"
      >
        <CmrPanel header="Calculation Counts" className="mb-2">
          {/* <div style={{ margin: '1em 0', padding: '1em', border: '1px solid #ccc', borderRadius: 8 }}> */}
          {loadingCounts ? (
            <div>Loading calculation counts...</div>
          ) : errorCounts ? (
            <div style={{ color: 'red' }}>Error: {errorCounts}</div>
          ) : (
            // <Alert severity="info" icon={false}>
            <>
              <Typography variant="body2"><b>Mode 1 (Cloud MR AWS)</b>: {counts.mode_1} </Typography>
              {counts.mode_2 !== null && counts.mode_2 > 0 && (
                <Typography variant="body2"><b>Mode 2</b>: {counts.mode_2}</Typography>
              )}
            </>
            //  </Alert>
          )}
          {/* </div> */}
        </CmrPanel>
      </CmrCollapse>

      <CmrCollapse
        accordion={false}
        defaultActiveKey={[0]}
        expandIconPosition="right"
      >
        <CmrPanel header="Mode 1 (Cloud MR AWS) Computing Units" className="mb-2">
          {/* MODE 1 */}
          {units.mode_1.length === 0 ? (
            <Typography variant="body2">No computing units found for mode 1.</Typography>
          ) : (
            <Box>
              {units.mode_1.map((u: any, idx: number) => (
                <Card variant="outlined">
                  <CardHeader
                    subheader={
                      <span>
                        <strong>{u.alias}</strong>{" "}
                        <span style={{ color: "#777", fontWeight: 400 }}>
                          ({getUnitTitle(u, idx)})
                        </span>
                      </span>
                    }
                    sx={{
                      backgroundColor: "#F7F7F9",
                      borderBottom: "1px solid #E6E6EA",
                      "& .MuiCardHeader-subheader": {
                        color: "#333",
                        fontWeight: 600,
                        fontSize: "14px"
                      }
                    }}
                  />
                  <CardContent>
                    <Box
                      key={`m1-${getUnitId(u, idx)}`}
                    >
                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1 }}>
                        {u.alias && (
                          <Typography variant="body2">
                            <strong>Alias:</strong> {String(u.alias ?? u.computingUnitAlias ?? u.computing_unit_alias)}
                          </Typography>
                        )}
                        {u.status && <Typography variant="body2"><strong>Status:</strong> {String(u.status)}</Typography>}
                        <Typography variant="body2"><strong>Mode:</strong> {String(u.mode ?? "mode_1")}</Typography>
                        {u.provider && <Typography variant="body2"><strong>Provider:</strong> {String(u.provider)}</Typography>}
                        {u.region && <Typography variant="body2"><strong>Region:</strong> {String(u.region)}</Typography>}
                        {(u.awsAccountId || u.aws_account_id) && (
                          <Typography variant="body2"><strong>AWS Account: </strong>{String(u.awsAccountId ?? u.aws_account_id)}</Typography>
                        )}
                        {(u.isDefault !== undefined) && (
                          <Typography variant="body2"><strong>Default:</strong> {u.isDefault ? "Yes" : "No"}</Typography>
                        )}
                        {(u.createdAt || u.created_at) && (
                          <Typography variant="body2"><strong>Created:</strong> {new Date(u.createdAt ?? u.created_at).toLocaleDateString()}</Typography>
                        )}
                        {(u.updatedAt || u.updated_at) && (
                          <Typography variant="body2"><strong>Updated:</strong> {new Date(u.updatedAt ?? u.updated_at).toLocaleDateString()}</Typography>
                        )}
                      </Box>

                      {(u.stateMachineArn || u.state_machine_arn) && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2"><strong>State Machine ARN:</strong></Typography>
                          <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                            {String(u.stateMachineArn ?? u.state_machine_arn)}
                          </Typography>
                        </Box>
                      )}

                      {(u.resultsBucket || u.failedBucket || u.dataBucket) && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2"><strong>Buckets:</strong></Typography>
                          {u.resultsBucket && <Typography variant="body2">Results: {String(u.resultsBucket)}</Typography>}
                          {u.failedBucket && <Typography variant="body2">Failed: {String(u.failedBucket)}</Typography>}
                          {u.dataBucket && <Typography variant="body2">Data: {String(u.dataBucket)}</Typography>}
                        </Box>
                      )}

                      {u.crossAccountRoleArn && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2"><strong>Cross Account Role:</strong></Typography>
                          <Typography variant="body2" sx={{ wordBreak: "break-all" }}>{String(u.crossAccountRoleArn)}</Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </CmrPanel>
      </CmrCollapse>

      {units.mode_2.length > 0 && (
        <CmrCollapse
          accordion={false}
          defaultActiveKey={[0]}
          expandIconPosition="right"
        >
          <CmrPanel header="Mode 2 Computing Units" className="mb-2">
            {/* MODE 2 */}
            {units.mode_2.length === 0 ? (
              <Typography variant="body2">
                No computing units found for mode 2.
              </Typography>
            ) : (
              <Box>
                {units.mode_2.map((u: any, idx: number) => {
                  const unitId = getUnitId(u, idx);
                  const isDeleting = !!deletingUnitIds[unitId];
                  return (
                    <Card variant="outlined">
                      <CardHeader
                        subheader={
                          <span>
                            <strong>{u.alias}</strong>{" "}
                            <span style={{ color: "#777", fontWeight: 400 }}>
                              ({getUnitTitle(u, idx)})
                            </span>
                          </span>
                        }
                        sx={{
                          backgroundColor: "#F7F7F9",
                          borderBottom: "1px solid #E6E6EA",
                          "& .MuiCardHeader-subheader": {
                            color: "#333",
                            fontWeight: 600,
                            fontSize: "14px"
                          }
                        }}
                        action={
                          <Tooltip title="Delete">
                            <span>
                              <IconButton
                                aria-label="delete"
                                size="small"
                                disabled={isDeleting}
                                onClick={async () => {
                                  const computingUnitId =
                                    u.computingUnitId ??
                                    u.computing_unit_id ??
                                    u.id;

                                  const label =
                                    u.alias ?? computingUnitId ?? "this unit";

                                  if (!computingUnitId) {
                                    setMessage(
                                      "Missing computingUnitId on this computing unit.",
                                    );
                                    setColor("error");
                                    setOpen(true);
                                    return;
                                  }

                                  if (
                                    !confirm(
                                      `Are you sure you want to delete computing unit ${label}?`,
                                    )
                                  )
                                    return;

                                  try {
                                    setDeletingUnitIds((s) => ({
                                      ...s,
                                      [String(computingUnitId)]: true,
                                    }));

                                    await deleteComputingUnitById(
                                      String(computingUnitId),
                                      apiToken,
                                    );

                                    // refresh mode_2 list only (same behavior you already do)
                                    const appName = "MR Optimum";
                                    const units2 = await fetchComputingUnits(
                                      appName,
                                      "mode_2",
                                      apiToken,
                                    );
                                    const n2 =
                                      normalizeUnitsPayload(units2, "mode_2");
                                    setUnits((prev) => ({
                                      ...prev,
                                      mode_2: n2,
                                    }));
                                  } catch (e: any) {
                                    setMessage(e?.message ?? String(e));
                                    setColor("error");
                                    setOpen(true);
                                  } finally {
                                    setDeletingUnitIds((s) => {
                                      const next = { ...s };
                                      delete next[String(computingUnitId)];
                                      return next;
                                    });
                                  }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        }
                      />
                      <CardContent>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: 1,
                          }}
                        >
                          {u.alias && (
                            <Typography variant="body2">
                              <strong>Alias:</strong>{" "}
                              {String(
                                u.alias ??
                                  u.computingUnitAlias ??
                                  u.computing_unit_alias,
                              )}
                            </Typography>
                          )}
                          {u.status && (
                            <Typography variant="body2">
                              <strong>Status:</strong> {String(u.status)}
                            </Typography>
                          )}
                          <Typography variant="body2">
                            <strong>Mode:</strong> {String(u.mode ?? "mode_2")}
                          </Typography>
                          {u.provider && (
                            <Typography variant="body2">
                              <strong>Provider:</strong> {String(u.provider)}
                            </Typography>
                          )}
                          {u.region && (
                            <Typography variant="body2">
                              <strong>Region:</strong> {String(u.region)}
                            </Typography>
                          )}
                          {(u.awsAccountId || u.aws_account_id) && (
                            <Typography variant="body2">
                              <strong>AWS Account:</strong>{" "}
                              {String(u.awsAccountId ?? u.aws_account_id)}
                            </Typography>
                          )}
                          {u.isDefault !== undefined && (
                            <Typography variant="body2">
                              <strong>Default:</strong>{" "}
                              {u.isDefault ? "Yes" : "No"}
                            </Typography>
                          )}
                          {(u.createdAt || u.created_at) && (
                            <Typography variant="body2">
                              <strong>Created:</strong>{" "}
                              {new Date(
                                u.createdAt ?? u.created_at,
                              ).toLocaleDateString()}
                            </Typography>
                          )}
                          {(u.updatedAt || u.updated_at) && (
                            <Typography variant="body2">
                              <strong>Updated:</strong>{" "}
                              {new Date(
                                u.updatedAt ?? u.updated_at,
                              ).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </CmrPanel>
        </CmrCollapse>
      )}

      {/* </Box> */}

      <CmrCollapse
        accordion={false}
        defaultActiveKey={[0]}
        expandIconPosition="right"
      >
        <CmrPanel key="0" header="Uploaded Data" className="mb-2">
          <CmrTable
            dataSource={[...files]
              .filter((file) => {
                const name = file.fileName.toLowerCase();
                return !name.endsWith(".zip") && !name.endsWith(".nii");
              })
              .reverse()}
            rowSelectionModel={selectedData}
            onRowSelectionModelChange={(rowSelectionModel) => {
              setSelectedData(rowSelectionModel);
            }}
            columns={uploadedFilesColumns}
          />
          <div className="row mt-2">
            <div className="col-4">
              <Button
                color={"error"}
                style={{ textTransform: "none" }}
                variant={"contained"}
                fullWidth={true}
                onClick={() => {
                  setName(`Deleting Data`);
                  setMessage(
                    `Please confirm that you are deleting the selected data.`,
                  );
                  setColor("error");
                  setConfirmCallback(() => () => {
                    for (let id of selectedData) {
                      let index = files.findIndex((row) => row.id === id);
                      // dispatch(jobsSlice.actions.deleteJob({index}));
                      // @ts-ignore
                      dispatch(deleteUploadedData({ fileId: id }));
                    }
                  });
                  setOpen(true);
                }}
                disabled={selectedData.length === 0}
              >

                <DeleteIcon className="me-2" />
                Delete
              </Button>
            </div>
            <div className="col-4">
              <Button
                color={"success"}
                style={{ textTransform: "none" }}
                variant={"contained"}
                fullWidth={true}
                onClick={() => {
                  downloadSelectedValues();
                }}
                disabled={selectedData.length === 0}
              >
                <GetAppIcon className="me-2" />
                Download
              </Button>
            </div>

            <div className="col-4">
              {/* TOBREMOVED AFTER THE BETA TESTING */}
              {/* <Button color={'primary'} style={{textTransform:'none'}} variant={'contained'} fullWidth={true} disabled={true}> Upload </Button> */}
              {/* TOBEACTIVATED AFTER THE BETA TESTING */}
              <CMRUpload
                fileExtension={[
                  ".nii",
                  ".nii.gz",
                  ".mha",
                  ".mhd",
                  ".mrd",
                  ".dat",
                  ".h5",
                  ".png",
                  ".jpg",
                  ".jpeg",
                  ".npx",
                  ".npy",
                  ".pkl",
                  ".mat",
                ]}
                color={"primary"}
                key={uploadKey}
                fullWidth
                onUploaded={(res, file) => {
                  dispatch(getUploadedData());
                  setUploadKey(uploadKey + 1);
                }}
                uploadHandler={uploadHandlerFactory(
                  uploadToken,
                  dispatch,
                  uploadData,
                )}
                maxCount={1}
              ></CMRUpload>
            </div>
          </div>
        </CmrPanel>
        <CmrNameDialog
          open={nameDialogOpen}
          setOpen={setNameDialogOpen}
          originalName={originalName}
          renamingCallback={renamingCallback}
          isDemoData={selectedFileIsDemoData}
        />

        <CmrConfirmation
          name={name}
          message={message}
          color={color}
          open={open}
          setOpen={setOpen}
          confirmCallback={confirmCallback}
          cancelCallback={cancelCallback}
          cancellable={true}
          width={450}
        />
      </CmrCollapse>
      <div style={{ height: "69px" }}></div>
    </Fragment>
  );
};

export default Home;
