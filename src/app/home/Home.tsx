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
    return Array.isArray(payload[mode ?? "mode_2"]) ? payload[mode ?? "mode_2"] : [];
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

import { CmrCollapse, CmrPanel } from "cloudmr-ux";
import Upload from "cloudmr-ux/core/app/upload/Upload";
import { useAppSelector } from "../../features/hooks";
import { Box, Typography, Card, CardContent, CardHeader } from "@mui/material";

const Home = ({ refreshKey }: { refreshKey?: number }) => {
  // Calculation count state
  const [counts, setCounts] = useState<{ mode_1: number | null; mode_2: number | null }>({
    mode_1: null,
    mode_2: null,
  });
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [errorCounts, setErrorCounts] = useState<string | null>(null);
  // Computing units state
  const [units, setUnits] = useState({ mode_2: [] as any[] });

  const getUnitId = (u: any, idx: number) =>
    String(u?.computingUnitId ?? u?.computing_unit_id ?? u?.id ?? u?.appId ?? u?.name ?? idx);

  const getUnitTitle = (u: any, idx: number) =>
    String(u?.referenceCode ?? u?.alias ?? u?.name ?? u?.label ?? getUnitId(u, idx));

  const { logged_in_token, accessToken } = useAppSelector((state) => state.authenticate);
  const apiToken = logged_in_token || accessToken;

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      setLoadingCounts(true);
      setErrorCounts(null);
      try {
        const appName = "MR Optimum";
        const [res1, res2, units2] = await Promise.all([
          fetchCalculationCount(appName, "mode_1", apiToken),
          fetchCalculationCount(appName, "mode_2", apiToken),
          fetchComputingUnits(appName, "mode_2", apiToken),
        ]);
        if (!cancelled) {
          setCounts({ mode_1: extractCount(res1), mode_2: extractCount(res2) });
          setUnits({
            mode_2: normalizeUnitsPayload(units2, "mode_2"),
          });
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
  // refreshKey intentionally triggers a refetch when the user navigates to the Home tab
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiToken, refreshKey]);

  return (
    <Fragment>
      {/* Calculation counts */}
      <CmrCollapse accordion={false} defaultActiveKey={[0]} expandIconPosition="right">
        <CmrPanel header="Jobs Count" className="mb-2">
          {loadingCounts ? (
            <div>Loading calculation counts...</div>
          ) : errorCounts ? (
            <div style={{ color: "red" }}>Error: {errorCounts}</div>
          ) : (
            <>
              <Typography variant="body2">Mode 1 (Cloud MR AWS): {counts.mode_1}</Typography>
              {counts.mode_2 !== null && counts.mode_2 > 0 && (
                <Typography variant="body2">Mode 2: {counts.mode_2}</Typography>
              )}
            </>
          )}
        </CmrPanel>
      </CmrCollapse>

      {/* Mode 2 computing units */}
      {units.mode_2.length > 0 && (
        <CmrCollapse accordion={false} defaultActiveKey={[0]} expandIconPosition="right">
          <CmrPanel header="Mode 2 Computing Units" className="mb-2">
            <Box>
              {units.mode_2.map((u: any, idx: number) => (
                <Card variant="outlined" key={getUnitId(u, idx)}>
                    <CardHeader
                      subheader={
                        <span>
                          <strong>{u.alias}</strong>{" "}
                          <span style={{ color: "#777", fontWeight: 400 }}>({getUnitTitle(u, idx)})</span>
                        </span>
                      }
                      sx={{
                        backgroundColor: "#F7F7F9",
                        borderBottom: "1px solid #E6E6EA",
                        "& .MuiCardHeader-subheader": { color: "#333", fontWeight: 600, fontSize: "14px" },
                      }}
                    />
                    <CardContent>
                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1 }}>
                        {u.alias && <Typography variant="body2"><strong>Alias:</strong> {String(u.alias)}</Typography>}
                        {u.status && <Typography variant="body2"><strong>Status:</strong> {String(u.status)}</Typography>}
                        {u.provider && <Typography variant="body2"><strong>Provider:</strong> {String(u.provider)}</Typography>}
                        {u.region && <Typography variant="body2"><strong>Region:</strong> {String(u.region)}</Typography>}
                        {(u.awsAccountId || u.aws_account_id) && <Typography variant="body2"><strong>Account:</strong> {String(u.awsAccountId ?? u.aws_account_id)}</Typography>}
                        {(u.createdAt || u.created_at) && <Typography variant="body2"><strong>Created:</strong> {new Date(u.createdAt ?? u.created_at).toLocaleDateString()}</Typography>}
                        {(u.updatedAt || u.updated_at) && <Typography variant="body2"><strong>Updated:</strong> {new Date(u.updatedAt ?? u.updated_at).toLocaleDateString()}</Typography>}
                      </Box>
                    </CardContent>
                  </Card>
              ))}
            </Box>
          </CmrPanel>
        </CmrCollapse>
      )}

      {/* Uploaded Data — shared cloudmr-ux component */}
      <Upload />

      <div style={{ height: "69px" }}></div>
    </Fragment>
  );
};

export default Home;
